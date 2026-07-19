import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateBenchmarkCase, validateBenchmarkCorpus, validateBenchmarkDataset, validateBenchmarkDatasetAgainstRunPlan, validateBenchmarkRunPlan, validateInstructionSurfaceRef } from './benchmark-validation.js';
import { copyImmutableFixture } from './benchmark-runner.js';
import { captureProtectedInputs } from './capture-protected-inputs.js';
import { runBenchmarkGates } from './run-benchmark-gates.js';

const DATASET_COLLECTION_COUNT = 4;
const RUN_PLAN_COLLECTION_COUNT = 3;
const MINIMUM_ATTEMPTS = 3;
const SHA256_LENGTH = 64;
const SHORT_GATE_TIMEOUT_MS = 100;
const SMALL_GATE_BUFFER_BYTES = 64;
const workspace = mkdtempSync(join(tmpdir(), 'benchmark-gates-'));
const nodeGate = { executable: 'node', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] };
const writeGateFixture = (test = 'process.exitCode = 0;\n'): void => {
  mkdirSync(join(workspace, 'test'), { recursive: true });
  writeFileSync(join(workspace, 'package.json'), '{"name":"benchmark-gates","private":true,"type":"module"}\n');
  writeFileSync(join(workspace, 'test', 'fixture.test.mjs'), test);
};
const gateEvidence = () => ({ values: [nodeGate], sha256: createHash('sha256').update(JSON.stringify([nodeGate])).digest('hex'), protected_inputs: captureProtectedInputs(workspace, [nodeGate]) });
writeGateFixture();
assert.equal(runBenchmarkGates({ workspace, evidence: gateEvidence() }).status, 'pass', 'structured direct-node gates execute without a shell');
const injectionMarker = join(workspace, 'injection-ran');
assert.throws(() => runBenchmarkGates({ workspace, evidence: { values: [{ executable: 'node; touch injection-ran', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] }], sha256: '0'.repeat(SHA256_LENGTH), protected_inputs: [] } }), /unsupported|invalid/i, 'shell metacharacters in a gate executable are rejected before execution');
assert.equal(existsSync(injectionMarker), false, 'a rejected gate cannot execute injected shell content');
assert.throws(() => runBenchmarkGates({ workspace, evidence: { values: [{ ...nodeGate, args: ['test; touch injection-ran'] }], sha256: '0'.repeat(SHA256_LENGTH), protected_inputs: [] } }), /unsupported|invalid/i, 'unrecognized gate arguments are rejected before execution');
writeGateFixture('setTimeout(() => {}, 2_000);\n');
assert.equal(runBenchmarkGates({ workspace, evidence: gateEvidence(), options: { timeout_ms: SHORT_GATE_TIMEOUT_MS } }).status, 'fail', 'a timed-out gate records failed evidence instead of hanging');
writeGateFixture('process.stdout.write("x".repeat(4_096));\n');
assert.equal(runBenchmarkGates({ workspace, evidence: gateEvidence(), options: { max_buffer: SMALL_GATE_BUFFER_BYTES } }).status, 'fail', 'an overflowing gate capture records failed evidence instead of throwing');
writeGateFixture('process.exitCode = 1;\n');
const originalNpmScriptShell = process.env.npm_config_script_shell;
process.env.npm_config_script_shell = '/usr/bin/true';
try {
  assert.equal(runBenchmarkGates({ workspace, evidence: gateEvidence() }).status, 'fail', 'direct-node gates ignore npm script-shell configuration and retain their test failure');
} finally {
  if (originalNpmScriptShell === undefined) delete process.env.npm_config_script_shell;
  else process.env.npm_config_script_shell = originalNpmScriptShell;
}
for (const protectedPath of ['package.json', 'test/fixture.test.mjs']) {
  writeGateFixture("import { writeFileSync } from 'node:fs';\nwriteFileSync(new URL('../gate-ran', import.meta.url), 'ran');\n");
  const evidence = gateEvidence();
  writeFileSync(join(workspace, protectedPath), protectedPath === 'package.json' ? '{"name":"tampered"}\n' : 'process.exitCode = 0;\n');
  const result = runBenchmarkGates({ workspace, evidence });
  assert.equal(result.status, 'fail', `tampering with protected ${protectedPath} fails the gate`);
  assert.match(result.results[0].stderr, /changed before gate execution/i, `tampering with protected ${protectedPath} is detected before execution`);
  assert.equal(existsSync(join(workspace, 'gate-ran')), false, `tampering with protected ${protectedPath} prevents the gate from running`);
}
writeGateFixture();
const beforeEmptyDirectory = gateEvidence();
mkdirSync(join(workspace, 'test', 'added-empty-directory'));
assert.equal(runBenchmarkGates({ workspace, evidence: beforeEmptyDirectory }).status, 'fail', 'adding an empty directory to the protected test tree invalidates its complete fingerprint');

const collisionRoot = mkdtempSync(join(tmpdir(), 'benchmark-hash-collision-'));
for (const fixture of ['one', 'two']) mkdirSync(join(collisionRoot, fixture));
writeFileSync(join(collisionRoot, 'one', 'a'), Buffer.from('xb\u0000c'));
writeFileSync(join(collisionRoot, 'two', 'a'), 'x');
writeFileSync(join(collisionRoot, 'two', 'b'), 'c');
const legacyHash = (entries: Array<[string, Buffer]>) => createHash('sha256').update(Buffer.concat(entries.flatMap(([path, contents]) => [Buffer.from(`${path}\u0000`), contents]))).digest('hex');
assert.equal(legacyHash([['a', Buffer.from('xb\u0000c')]]), legacyHash([['a', Buffer.from('x')], ['b', Buffer.from('c')]]), 'the previous delimiter framing collides for one-file and two-file trees');
assert.notEqual(copyImmutableFixture({ fixture_root: collisionRoot, fixture: 'one', workspace: mkdtempSync(join(tmpdir(), 'benchmark-collision-one-')) }).sha256, copyImmutableFixture({ fixture_root: collisionRoot, fixture: 'two', workspace: mkdtempSync(join(tmpdir(), 'benchmark-collision-two-')) }).sha256, 'length-prefixed fixture hashes distinguish the colliding trees');

assert.equal(validateBenchmarkCorpus({ version: 1, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cases: [] } as never).some((error) => error.includes('non-empty array')), true, 'an empty corpus is rejected before iteration');
const malformedDataset = { corpus_sha256: '', cohort: {}, cases: undefined, seed: 0, order: undefined, registry: undefined, attempts: undefined };
assert.doesNotThrow(() => validateBenchmarkDataset(malformedDataset as never), 'malformed dataset arrays are reported rather than throwing');
assert.equal(validateBenchmarkDataset(malformedDataset as never).filter((error) => error.includes('dataset')).length >= DATASET_COLLECTION_COUNT, true, 'dataset cases, order, registry, and attempts must be non-empty arrays');
const malformedPlan = { version: 1, corpus_sha256: '', cohort: {}, seed: 0, cases: undefined, order: undefined, registry: undefined };
assert.doesNotThrow(() => validateBenchmarkRunPlan(malformedPlan as never), 'malformed run-plan arrays are reported rather than throwing');
assert.equal(validateBenchmarkRunPlan(malformedPlan as never).filter((error) => error.includes('benchmark run-plan')).length >= RUN_PLAN_COLLECTION_COUNT, true, 'run-plan cases, order, and registry must be arrays before validation continues');
const malformedValidators: Array<[string, () => string[]]> = [
  ['instruction surface', () => validateInstructionSurfaceRef({ paths: [1] } as never)],
  ['benchmark case', () => validateBenchmarkCase({ variants: { baseline: null, candidate: {} } } as never)],
  ['benchmark corpus', () => validateBenchmarkCorpus(null as never)],
  ['corpus case entry', () => validateBenchmarkCorpus({ version: 1, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cases: [null] } as never)],
  ['benchmark dataset', () => validateBenchmarkDataset(null as never)],
  ['dataset entries', () => validateBenchmarkDataset({ corpus_sha256: '', cohort: {}, cases: [null], seed: 0, order: [null], registry: [null], attempts: [null] } as never)],
  ['benchmark run plan', () => validateBenchmarkRunPlan(null as never)],
  ['run-plan entries', () => validateBenchmarkRunPlan({ version: 1, corpus_sha256: '', cohort: {}, cases: [null], seed: 0, order: [null], registry: [null] } as never)],
  ['dataset against run plan', () => validateBenchmarkDatasetAgainstRunPlan(null as never)],
];
for (const [label, validate] of malformedValidators) {
  assert.doesNotThrow(validate, `${label} returns errors for malformed objects instead of throwing`);
  assert.notEqual(validate().length, 0, `${label} returns deterministic validation errors`);
}
console.log('Benchmark hardening tests passed.');
