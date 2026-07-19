import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { validateBenchmarkCorpus, validateBenchmarkExecutionReadiness } from './benchmark-runner.js';
import type { BenchmarkCorpus } from './benchmark-types.js';

const SCHEDULE_SEED = 781;
const PAIR_VARIANT_COUNT = 2;
const BENCHMARK_CASE_COUNT = 4;
const pendingCorpus = JSON.parse(readFileSync(new URL('./benchmarks/corpus.json', import.meta.url), 'utf8')) as BenchmarkCorpus;
assert.equal(validateBenchmarkCorpus(pendingCorpus).length, 0, 'the committed PENDING corpus is structurally inspectable');
const expectedCorpusGateFiles = ['fixture', 'fixture', 'format-greeting', 'format-greeting', 'display-labels', 'display-labels', 'policy', 'policy'];
assert.equal(expectedCorpusGateFiles.length, BENCHMARK_CASE_COUNT * PAIR_VARIANT_COUNT, 'each paired corpus variant has one expected fixture gate');
assert.deepEqual(pendingCorpus.cases.flatMap((entry) => [entry.variants.baseline.outcome.project_gates, entry.variants.candidate.outcome.project_gates]), expectedCorpusGateFiles.map((name) => [{ executable: 'node', args: [`test/${name}.test.mjs`], protected_paths: ['package.json', 'test'] }]), 'every paired fixture declares its direct-node gate and fixture-owned protected inputs');
assert.equal(validateBenchmarkExecutionReadiness({ corpus: pendingCorpus, harness_root: process.cwd() }).some((error) => error.includes('PENDING')), true, 'every PENDING placeholder prevents execution before evidence mutation');

const runEvidenceRoot = new URL('./results/runs/', import.meta.url);
const runEvidenceBefore = readdirSync(runEvidenceRoot).sort();
const registryRoot = new URL('./results/runs/benchmark-registries/', import.meta.url);
const registryBefore = existsSync(registryRoot) ? readdirSync(registryRoot).sort() : [];
const pendingExecution = spawnSync('npm', ['run', 'eval:scenario', '--', '--print-only', '--benchmark', 'light-edit', '--variant', 'baseline', '--repetition', '1', '--seed', String(SCHEDULE_SEED)], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(pendingExecution.status, 2, 'benchmark previews are rejected before execution readiness');
assert.match(`${pendingExecution.stdout}\n${pendingExecution.stderr}`, /does not support --print-only/i, 'benchmark preview rejection explains that registered attempts always launch');
const pendingAttempt = spawnSync('npm', ['run', 'eval:scenario', '--', '--benchmark', 'light-edit', '--variant', 'baseline', '--repetition', '1', '--seed', String(SCHEDULE_SEED)], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(pendingAttempt.status, 1, 'normal benchmark execution rejects PENDING evidence before launch');
assert.match(`${pendingAttempt.stdout}\n${pendingAttempt.stderr}`, /execution is not ready.*PENDING/i, 'normal benchmark rejection reports its immutable-evidence blocker');
assert.deepEqual(readdirSync(runEvidenceRoot).sort(), runEvidenceBefore, 'benchmark preflight failures create no run evidence');
assert.deepEqual(existsSync(registryRoot) ? readdirSync(registryRoot).sort() : [], registryBefore, 'benchmark preflight failures create no durable registry mutation');

const fixtureGaps: Record<string, RegExp> = {
  'benchmark-light-edit': /supported command/i,
  'benchmark-one-function-fix': /Hello, friend!/i,
  'benchmark-related-low-risk-batch': /Primary unavailable/i,
  'benchmark-cross-cutting-policy': /exact validation commands/i,
};
for (const [fixture, expectedGap] of Object.entries(fixtureGaps)) {
  const corpusGate = pendingCorpus.cases.find((entry) => entry.scenario === fixture)?.variants.baseline.outcome.project_gates[0];
  assert.ok(corpusGate, `${fixture} has a declared baseline benchmark gate`);
  const result = spawnSync(process.execPath, corpusGate.args, { cwd: new URL(`./fixtures/${fixture}/`, import.meta.url), encoding: 'utf8' });
  assert.notEqual(result.status, 0, `${fixture} baseline gate fails until the benchmark task fixes its intended gap`);
  assert.match(`${result.stdout}\n${result.stderr}`, expectedGap, `${fixture} fails for its declared baseline gap`);
}
assert.deepEqual(['primary-label.mjs', 'secondary-label.mjs', 'tertiary-label.mjs'].map((file) => readFileSync(new URL(`./fixtures/benchmark-related-low-risk-batch/src/${file}`, import.meta.url), 'utf8')), [
  'export function primaryLabel(value) {\n  return value;\n}\n',
  'export function secondaryLabel(value) {\n  return value;\n}\n',
  'export function tertiaryLabel(value) {\n  return value;\n}\n',
], 'the related low-risk fixture has exactly three genuinely broken related functions before the benchmark change');
for (const checklist of ['light-edit.md', 'one-function-fix.md', 'related-low-risk-batch.md', 'cross-cutting-policy.md']) assert.doesNotMatch(readFileSync(new URL(`./benchmarks/checks/${checklist}`, import.meta.url), 'utf8'), /route|load(?:ed|ing)?|declared project gate/i, `${checklist} contains outcome-only judge criteria`);
console.log('Benchmark corpus tests passed.');
