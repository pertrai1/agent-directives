import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, linkSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureProtectedInputs } from './capture-protected-inputs.js';
import {
  copyImmutableFixture,
  createInterleavedSchedule,
  hashEntries,
  materializeInstructionSurface,
  prepareBenchmarkRunEvidence,
  validateBenchmarkCase,
  validateBenchmarkCorpus,
  validateBenchmarkDataset,
  validateBenchmarkDatasetAgainstRunPlan,
  validateBenchmarkExecutionReadiness,
  validateBenchmarkRunPlan,
} from './benchmark-runner.js';
import { readBenchmarkRunPlan, registerBenchmarkAttempt } from './register-benchmark-attempt.js';
import type { BenchmarkAttemptEvidence, BenchmarkCase, BenchmarkCohort, BenchmarkCorpus, BenchmarkGate, InstructionSurfaceRef } from './benchmark-types.js';

const hash = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');
const SHA256_LENGTH = 64;
const COMMIT_LENGTH = 40;
const MAX_BYTE_VALUE = 255;
const MINIMUM_ATTEMPTS = 3;
const SCHEDULE_SEED = 781;
const SCHEDULE_LENGTH = MINIMUM_ATTEMPTS * 2;
const sha256 = (character: string): string => character.repeat(SHA256_LENGTH);
const temporary = (name: string): string => mkdtempSync(join(tmpdir(), `${name}-`));
const run = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function initGit(): string {
  const root = temporary('benchmark-surface');
  run(root, 'init', '-q');
  run(root, 'config', 'user.email', 'benchmark@example.test');
  run(root, 'config', 'user.name', 'Benchmark');
  return root;
}

function commit(root: string, message: string): string {
  run(root, 'add', '.');
  run(root, 'commit', '-qm', message);
  return run(root, 'rev-parse', 'HEAD');
}

const fixtureRoot = temporary('benchmark-fixtures');
mkdirSync(join(fixtureRoot, 'safe'), { recursive: true });
mkdirSync(join(fixtureRoot, 'safe', 'test'), { recursive: true });
writeFileSync(join(fixtureRoot, 'safe', 'README.md'), 'fixture\n');
writeFileSync(join(fixtureRoot, 'safe', 'package.json'), '{"name":"safe","private":true,"type":"module"}\n');
writeFileSync(join(fixtureRoot, 'safe', 'test', 'fixture.test.mjs'), 'process.exitCode = 0;\n');
mkdirSync(join(fixtureRoot, 'linked'), { recursive: true });
symlinkSync(join(fixtureRoot, 'safe', 'README.md'), join(fixtureRoot, 'linked', 'README.md'));
const copiedWorkspace = temporary('benchmark-workspace');
const copied = copyImmutableFixture({ fixture_root: fixtureRoot, fixture: 'safe', workspace: copiedWorkspace });
assert.equal(readFileSync(join(copiedWorkspace, 'README.md'), 'utf8'), 'fixture\n', 'fixture contents copy into a fresh workspace');
assert.equal(copied.sha256, hashEntries([
  { path: 'README.md', contents: Buffer.from('fixture\n') },
  { path: 'package.json', contents: Buffer.from('{"name":"safe","private":true,"type":"module"}\n') },
  { path: 'test/fixture.test.mjs', contents: Buffer.from('process.exitCode = 0;\n') },
].sort((left, right) => left.path.localeCompare(right.path))), 'fixture hash includes length-delimited names and exact contents');
assert.equal(copied.bytes, Buffer.byteLength('fixture\n') + Buffer.byteLength('{"name":"safe","private":true,"type":"module"}\n') + Buffer.byteLength('process.exitCode = 0;\n'), 'fixture byte evidence counts content bytes rather than filename bytes');
for (const fixture of ['missing', '../safe', '/tmp/escape', 'linked']) {
  assert.throws(() => copyImmutableFixture({ fixture_root: fixtureRoot, fixture, workspace: temporary('benchmark-reject') }), /fixture/i, `unsafe fixture ${fixture} is rejected`);
}
const linkedAncestor = temporary('benchmark-linked-ancestor');
symlinkSync(fixtureRoot, join(linkedAncestor, 'fixtures'));
assert.throws(() => copyImmutableFixture({ fixture_root: join(linkedAncestor, 'fixtures'), fixture: 'safe', workspace: temporary('benchmark-ancestor') }), /ancestor symlink/i, 'fixture roots with an ancestor symlink are rejected');
mkdirSync(join(fixtureRoot, 'hardlinked'), { recursive: true });
writeFileSync(join(fixtureRoot, 'hardlinked', 'source.md'), 'linked fixture\n');
linkSync(join(fixtureRoot, 'hardlinked', 'source.md'), join(fixtureRoot, 'hardlinked', 'alias.md'));
assert.throws(() => copyImmutableFixture({ fixture_root: fixtureRoot, fixture: 'hardlinked', workspace: temporary('benchmark-hardlink') }), /multi-link/i, 'hardlinked fixture files are rejected');

const gitRoot = initGit();
mkdirSync(join(gitRoot, 'directives'), { recursive: true });
writeFileSync(join(gitRoot, 'AGENTS.md'), 'baseline\n');
writeFileSync(join(gitRoot, 'directives', 'workflow.md'), 'route baseline\n');
const baselineRef = commit(gitRoot, 'baseline');
writeFileSync(join(gitRoot, 'directives', 'workflow.md'), 'route candidate\n');
const candidateRef = commit(gitRoot, 'candidate');
const baselineHash = hashEntries([{ path: 'AGENTS.md', contents: Buffer.from('baseline\n') }, { path: 'directives/workflow.md', contents: Buffer.from('route baseline\n') }]);
const candidateHash = hashEntries([{ path: 'AGENTS.md', contents: Buffer.from('baseline\n') }, { path: 'directives/workflow.md', contents: Buffer.from('route candidate\n') }]);
const surface = (ref: string, expected_sha256 = ref === baselineRef ? baselineHash : candidateHash): InstructionSurfaceRef => ({
  kind: 'git-commit', ref, expected_sha256, paths: ['AGENTS.md', 'directives'],
});
const baselineWorkspace = temporary('benchmark-surface-copy');
const baseline = materializeInstructionSurface({ harness_root: gitRoot, instruction_surface: surface(baselineRef), workspace: baselineWorkspace });
assert.equal(readFileSync(join(baselineWorkspace, 'AGENTS.md'), 'utf8'), 'baseline\n', 'a pinned commit materializes only the instruction surface');
assert.equal(baseline.ref, baselineRef, 'the resolved immutable commit is recorded');
assert.throws(() => materializeInstructionSurface({ harness_root: gitRoot, instruction_surface: surface('HEAD'), workspace: temporary('benchmark-head') }), /immutable/i, 'branch-like refs are rejected');
assert.throws(() => materializeInstructionSurface({ harness_root: gitRoot, instruction_surface: surface('0'.repeat(COMMIT_LENGTH)), workspace: temporary('benchmark-missing-ref') }), /resolve/i, 'unresolvable commit refs are rejected');
assert.throws(() => materializeInstructionSurface({ harness_root: gitRoot, instruction_surface: surface(baselineRef, sha256('0')), workspace: temporary('benchmark-hash-mismatch') }), /hash/i, 'surface hash mismatches are rejected');
assert.equal(validateBenchmarkCase({ case_id: 'paths', category: 'paths', scenario: 'paths', cohort: { provider: 'p', model: 'm', tokenizer: 't', client_version: 'c', harness_version: baselineRef, tool_configuration_hash: sha256('a'), cache_policy: 'off', global_instruction_hash: sha256('b'), inference_settings_hash: sha256('c') }, variants: { baseline: { outcome: { prompt_file: 'prompt.md', fixture: 'safe', acceptance_checklist: 'check.md', project_gates: [{ executable: 'node', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] }] }, instruction_surface: { ...surface(baselineRef), paths: ['directives', 'directives/workflow.md'] } }, candidate: { outcome: { prompt_file: 'prompt.md', fixture: 'safe', acceptance_checklist: 'check.md', project_gates: [{ executable: 'node', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] }] }, instruction_surface: surface(candidateRef) } } }).some((error) => error.includes('overlap')), true, 'overlapping installed paths are rejected');

const nulRoot = initGit();
mkdirSync(join(nulRoot, 'directives'), { recursive: true });
const unusualName = 'line\nbreak.md';
const unusualBytes = Buffer.from([0, 1, 2, MAX_BYTE_VALUE]);
writeFileSync(join(nulRoot, 'directives', unusualName), unusualBytes);
const nulRef = commit(nulRoot, 'NUL listing');
const nulHash = hashEntries([{ path: `directives/${unusualName}`, contents: unusualBytes }]);
const nulWorkspace = temporary('benchmark-nul');
materializeInstructionSurface({ harness_root: nulRoot, instruction_surface: { kind: 'git-commit', ref: nulRef, expected_sha256: nulHash, paths: ['directives'] }, workspace: nulWorkspace });
assert.deepEqual(readFileSync(join(nulWorkspace, 'directives', unusualName)), unusualBytes, 'git tree listing and materialization preserve exact bytes and unusual names');
const symlinkRoot = initGit();
writeFileSync(join(symlinkRoot, 'target.md'), 'target');
symlinkSync('target.md', join(symlinkRoot, 'linked.md'));
const symlinkRef = commit(symlinkRoot, 'symlink');
assert.throws(() => materializeInstructionSurface({ harness_root: symlinkRoot, instruction_surface: { kind: 'git-commit', ref: symlinkRef, expected_sha256: sha256('1'), paths: ['linked.md'] }, workspace: temporary('benchmark-tree-symlink') }), /symlink/i, 'git tree symlink entries are rejected before reading their target');
const artifactHarness = temporary('benchmark-artifact-hardlink');
mkdirSync(join(artifactHarness, 'artifact'), { recursive: true });
writeFileSync(join(artifactHarness, 'artifact', 'AGENTS.md'), 'artifact\n');
linkSync(join(artifactHarness, 'artifact', 'AGENTS.md'), join(artifactHarness, 'artifact', 'AGENTS-copy.md'));
assert.throws(() => materializeInstructionSurface({ harness_root: artifactHarness, instruction_surface: { kind: 'package-artifact', ref: 'artifact', expected_sha256: sha256('2'), paths: ['AGENTS.md'] }, workspace: temporary('benchmark-artifact-target') }), /multi-link/i, 'hardlinked package-artifact files are rejected');

const cohort: BenchmarkCohort = {
  provider: 'provider', model: 'model', tokenizer: 'tokenizer', client_version: 'client', harness_version: candidateRef,
  tool_configuration_hash: hash('tool configuration'), cache_policy: 'disabled', global_instruction_hash: hash('global instructions'), inference_settings_hash: hash('inference settings'),
};
const nodeTestGate: BenchmarkGate = { executable: 'node', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] };
const outcome = { prompt_file: 'evals/benchmarks/prompts/task.md', fixture: 'safe', acceptance_checklist: 'evals/benchmarks/checks/task.md', project_gates: [nodeTestGate] };
const benchmarkCase = (): BenchmarkCase => ({
  case_id: 'case-one', category: 'light-edit', scenario: 'benchmark-light-edit', cohort,
  variants: {
    baseline: { outcome, instruction_surface: surface(baselineRef), diagnostics: { expected_route: 'Light' } },
    candidate: { outcome: { ...outcome }, instruction_surface: surface(candidateRef), diagnostics: { expected_route: 'Full' } },
  },
});
assert.deepEqual(validateBenchmarkCase(benchmarkCase()), [], 'route diagnostics may differ while outcome acceptance remains paired');
const differentOutcome = benchmarkCase();
differentOutcome.variants.candidate.outcome.project_gates = [{ executable: 'node', args: ['test/other.test.mjs'], protected_paths: ['package.json', 'test'] }];
assert.equal(validateBenchmarkCase(differentOutcome).some((error) => error.includes('outcome')), true, 'prompt, fixture, checklist, and gates must be identical across variants');
assert.equal(validateBenchmarkCase({ ...benchmarkCase(), cohort: { ...cohort, tool_configuration_hash: sha256('a').slice(1) } }).some((error) => error.includes('tool_configuration_hash')), true, 'cohort hash fields require full SHA-256 values');
const corpus: BenchmarkCorpus = { version: 1, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cases: [benchmarkCase()] };
const corpusSha256 = hash(JSON.stringify(corpus));
const gates = { values: [...outcome.project_gates], sha256: hash(JSON.stringify(outcome.project_gates)), protected_inputs: [{ paths: [...nodeTestGate.protected_paths], sha256: sha256('d') }] };
const attemptEvidence = (variant: 'baseline' | 'candidate'): BenchmarkAttemptEvidence => ({
  corpus_sha256: corpusSha256,
  harness_commit: cohort.harness_version,
  prompt_sha256: sha256('a'),
  fixture_sha256: sha256('b'),
  acceptance_checklist_sha256: sha256('c'),
  project_gates: gates,
  instruction_surface: { ref: benchmarkCase().variants[variant].instruction_surface.ref, sha256: benchmarkCase().variants[variant].instruction_surface.expected_sha256 },
});
assert.deepEqual(validateBenchmarkCorpus(corpus), [], 'a corpus has unique case/category/variant/repetition inputs');
assert.equal(validateBenchmarkCorpus({ ...corpus, cases: [benchmarkCase(), { ...benchmarkCase(), case_id: 'case-two', category: 'other', cohort: { ...cohort, model: 'other' } }] }).some((error) => error.includes('comparable corpus cohort')), true, 'the comparison corpus has one exact comparable cohort across cases');

const schedule = createInterleavedSchedule(corpus, SCHEDULE_SEED);
assert.deepEqual(schedule, createInterleavedSchedule(corpus, SCHEDULE_SEED), 'the recorded seed creates deterministic scheduling');
assert.equal(schedule.length, SCHEDULE_LENGTH, 'three repetitions schedule both paired variants');
for (let index = 0; index < schedule.length; index += 2) {
  assert.equal(schedule[index].repetition, schedule[index + 1].repetition, 'baseline/candidate repetitions stay interleaved');
  assert.notEqual(schedule[index].variant, schedule[index + 1].variant, 'an interleaved pair contains both variants');
}
const attempts = schedule.map((entry) => ({ attempt_id: `attempt-${entry.sequence}`, ...entry, schedule_sequence: entry.sequence, cohort, evidence: attemptEvidence(entry.variant) }));
const registry = attempts.map((attempt, index) => ({ attempt_id: attempt.attempt_id, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' as const, sequence: index + 1, schedule_sequence: attempt.schedule_sequence }));
const dataset = { corpus_sha256: corpusSha256, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cohort, cases: corpus.cases, seed: SCHEDULE_SEED, order: schedule, registry, attempts };
assert.deepEqual(validateBenchmarkDataset(dataset), [], 'every persisted registration is bound to its schedule and immutable attempt evidence');
const forgedSchedule = [...schedule].reverse().map((entry, index) => ({ ...entry, sequence: index + 1 }));
const forgedPlan = { version: 1 as const, corpus_sha256: corpusSha256, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cohort, cases: corpus.cases, seed: SCHEDULE_SEED, order: forgedSchedule, registry: [] };
assert.equal(validateBenchmarkRunPlan(forgedPlan).some((error) => error.includes('exact seeded interleaved schedule')), true, 'a well-shaped but forged persisted order cannot replace the schedule derived from its corpus and seed');
const missingEvidence = { ...dataset, attempts: [{ ...attempts[0], evidence: undefined }, ...attempts.slice(1)] }; assert.doesNotThrow(() => validateBenchmarkDataset(missingEvidence as typeof dataset), 'missing evidence is reported rather than throwing'); assert.equal(validateBenchmarkDataset(missingEvidence as typeof dataset).some((error) => /attempt entry.*evidence|missing immutable benchmark evidence/i.test(error)), true, 'missing evidence returns a deterministic validation error');
const incompleteEvidence = { ...dataset, attempts: [{ ...attempts[0], evidence: { project_gates: {}, instruction_surface: {} } }, ...attempts.slice(1)] }; assert.doesNotThrow(() => validateBenchmarkDataset(incompleteEvidence as typeof dataset), 'partial evidence is reported rather than throwing'); assert.equal(validateBenchmarkDataset(incompleteEvidence as typeof dataset).some((error) => error.includes('invalid')), true, 'partial evidence returns deterministic validation errors');
const rewrittenPrompt = { ...attempts[1], evidence: { ...attempts[1].evidence, prompt_sha256: sha256('d') } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [attempts[0], rewrittenPrompt, ...attempts.slice(2)] }).some((error) => error.includes('paired outcome evidence')), true, 'rewritten prompt/checklist/fixture/gate evidence invalidates a paired case');
const wrongSurface = { ...attempts[0], evidence: { ...attempts[0].evidence, instruction_surface: attemptEvidence(attempts[0].variant === 'baseline' ? 'candidate' : 'baseline').instruction_surface } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [wrongSurface, ...attempts.slice(1)] }).some((error) => error.includes('instruction surface')), true, 'an attempt must match its declared per-variant surface ref and hash');
const wrongGateHash = { ...attempts[0], evidence: { ...attempts[0].evidence, project_gates: { ...attempts[0].evidence.project_gates, sha256: sha256('e') } } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [wrongGateHash, ...attempts.slice(1)] }).some((error) => error.includes('gate hash')), true, 'declared gate values are integrity-bound by their exact hash');
const missingProtectedInputs = { ...attempts[0], evidence: { ...attempts[0].evidence, project_gates: { ...attempts[0].evidence.project_gates, protected_inputs: [] } } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [missingProtectedInputs, ...attempts.slice(1)] }).some((error) => error.includes('protected gate evidence is missing or incomplete')), true, 'attempt evidence requires a protected-input fingerprint for every declared gate');
const forgedProtectedInput = { ...attempts[0], evidence: { ...attempts[0].evidence, project_gates: { ...attempts[0].evidence.project_gates, protected_inputs: [{ paths: ['package.json', 'test'], sha256: sha256('a').slice(1) }] } } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [forgedProtectedInput, ...attempts.slice(1)] }).some((error) => error.includes('protected gate evidence is invalid')), true, 'protected-input evidence requires valid declared paths and a full SHA-256 fingerprint');
const forgedScalarHash = { ...attempts[0], evidence: { ...attempts[0].evidence, prompt_sha256: sha256('a').slice(1) } };
assert.equal(validateBenchmarkDataset({ ...dataset, attempts: [forgedScalarHash, ...attempts.slice(1)] }).some((error) => error.includes('invalid prompt hash')), true, 'attempt scalar hashes require full SHA-256 values');
const registryPath = join(temporary('benchmark-run-plan'), 'registry.json');
for (const entry of schedule) registerBenchmarkAttempt({ registry_path: registryPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: entry.case_id, variant: entry.variant, repetition: entry.repetition });
const persistedPlanFile = readFileSync(registryPath, 'utf8');
const persistedPlan = readBenchmarkRunPlan(registryPath);
const planAttempts = persistedPlan.registry.map((registration) => {
  const entry = schedule[registration.schedule_sequence - 1];
  return { attempt_id: registration.attempt_id, ...entry, schedule_sequence: registration.schedule_sequence, cohort, evidence: attemptEvidence(entry.variant) };
});
const plannedDataset = { corpus_sha256: corpusSha256, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cohort, cases: corpus.cases, seed: SCHEDULE_SEED, order: schedule, registry: persistedPlan.registry, attempts: planAttempts };
assert.deepEqual(validateBenchmarkDatasetAgainstRunPlan({ dataset: plannedDataset, plan: persistedPlan }), [], 'a report can require the persisted full schedule and external started-attempt registry');
assert.equal(validateBenchmarkDatasetAgainstRunPlan({ dataset: { ...plannedDataset, attempts: planAttempts.slice(1) }, plan: persistedPlan }).some((error) => error.includes('registered attempt is absent')), true, 'a deleted failed or abandoned manifest cannot be hidden by reconstructing only surviving runs');
assert.equal(readFileSync(registryPath, 'utf8'), persistedPlanFile, 'registrations never rewrite the immutable plan');
assert.equal(readFileSync(`${registryPath}.registrations.jsonl`, 'utf8').trim().split('\n').length, schedule.length, 'each started attempt is one append-only ledger record');
const wrongPlan = { ...registry[0], schedule_sequence: registry[1].schedule_sequence };
assert.equal(validateBenchmarkDataset({ ...dataset, registry: [wrongPlan, ...registry.slice(1)] }).some((error) => error.includes('scheduled order')), true, 'primary registrations must follow seeded schedule order');
const retry = { ...attempts[0], attempt_id: 'attempt-retry' };
const retryRegistration = { attempt_id: retry.attempt_id, registered_at: registry[0].registered_at, status: 'started' as const, sequence: registry.length + 1, schedule_sequence: retry.schedule_sequence, retry_of: attempts[0].attempt_id };
assert.deepEqual(validateBenchmarkDataset({ ...dataset, registry: [...registry, retryRegistration], attempts: [...attempts, retry] }), [], 'failed or abandoned work may be retried under a unique attempt ID without selecting a survivor');
const retryPath = join(temporary('benchmark-mid-plan-retry'), 'registry.json');
const firstStart = registerBenchmarkAttempt({ registry_path: retryPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[0].case_id, variant: schedule[0].variant, repetition: schedule[0].repetition });
registerBenchmarkAttempt({ registry_path: retryPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[0].case_id, variant: schedule[0].variant, repetition: schedule[0].repetition, retry_of: firstStart.registration.attempt_id });
registerBenchmarkAttempt({ registry_path: retryPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[1].case_id, variant: schedule[1].variant, repetition: schedule[1].repetition });
assert.deepEqual(readBenchmarkRunPlan(retryPath).registry.map((entry) => [entry.sequence, entry.schedule_sequence, Boolean(entry.retry_of)]), [[1, 1, false], [2, 1, true], [MINIMUM_ATTEMPTS, 2, false]], 'a mid-plan retry does not prevent the next primary schedule entry');
appendFileSync(`${retryPath}.registrations.jsonl`, '{"truncated":');
assert.throws(() => readBenchmarkRunPlan(retryPath), /truncated/i, 'a truncated append-only registration ledger is rejected');
const gapPath = join(temporary('benchmark-sequence-gap'), 'registry.json');
const gapStart = registerBenchmarkAttempt({ registry_path: gapPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[0].case_id, variant: schedule[0].variant, repetition: schedule[0].repetition });
appendFileSync(`${gapPath}.registrations.jsonl`, `${JSON.stringify({ ...gapStart.registration, attempt_id: 'attempt-after-gap', sequence: MINIMUM_ATTEMPTS, schedule_sequence: schedule[1].sequence })}\n`);
assert.throws(() => readBenchmarkRunPlan(gapPath), /sequence gap/i, 'a gap in the durable registration sequence is rejected');
const conflictPath = join(temporary('benchmark-plan-conflict'), 'registry.json');
registerBenchmarkAttempt({ registry_path: conflictPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[0].case_id, variant: schedule[0].variant, repetition: schedule[0].repetition });
assert.throws(() => registerBenchmarkAttempt({ registry_path: conflictPath, corpus, corpus_sha256: sha256('f'), seed: SCHEDULE_SEED, case_id: schedule[1].case_id, variant: schedule[1].variant, repetition: schedule[1].repetition }), /conflicts/i, 'a conflicting corpus identity cannot replace an immutable run plan');
const lockedPath = join(temporary('benchmark-registry-lock'), 'registry.json');
writeFileSync(`${lockedPath}.lock`, 'held\n');
assert.throws(() => registerBenchmarkAttempt({ registry_path: lockedPath, corpus, corpus_sha256: corpusSha256, seed: SCHEDULE_SEED, case_id: schedule[0].case_id, variant: schedule[0].variant, repetition: schedule[0].repetition }), /locked/i, 'an exclusive writer lock prevents silent concurrent registration loss');

const repoRoot = temporary('benchmark-evidence');
mkdirSync(join(repoRoot, 'evals', 'fixtures', 'safe'), { recursive: true });
mkdirSync(join(repoRoot, 'evals', 'fixtures', 'safe', 'test'), { recursive: true });
mkdirSync(join(repoRoot, 'evals', 'benchmarks', 'prompts'), { recursive: true });
mkdirSync(join(repoRoot, 'evals', 'benchmarks', 'checks'), { recursive: true });
writeFileSync(join(repoRoot, 'evals', 'fixtures', 'safe', 'README.md'), 'fixture\n');
writeFileSync(join(repoRoot, 'evals', 'fixtures', 'safe', 'package.json'), '{"name":"safe","private":true,"type":"module"}\n');
writeFileSync(join(repoRoot, 'evals', 'fixtures', 'safe', 'test', 'fixture.test.mjs'), 'process.exitCode = 0;\n');
writeFileSync(join(repoRoot, 'evals', 'benchmarks', 'prompts', 'task.md'), 'Do the task.\n');
writeFileSync(join(repoRoot, 'evals', 'benchmarks', 'checks', 'task.md'), '# Outcome\n- [ ] The task is complete.\n');
const evidenceWorkspace = temporary('benchmark-evidence-workspace');
const evidence = prepareBenchmarkRunEvidence({ repository_root: repoRoot, harness_root: gitRoot, corpus, corpus_sha256: corpusSha256, benchmark: benchmarkCase(), variant: 'candidate', workspace: evidenceWorkspace });
assert.equal(evidence.prompt.sha256, hash('Do the task.\n'), 'run evidence pins the exact prompt bytes');
assert.equal(evidence.fixture.bytes, Buffer.byteLength('fixture\n') + Buffer.byteLength('{"name":"safe","private":true,"type":"module"}\n') + Buffer.byteLength('process.exitCode = 0;\n'), 'run evidence records canonical fixture content bytes');
assert.equal(evidence.judge_handoff.acceptance_checklist, '# Outcome\n- [ ] The task is complete.\n', 'the declared checklist is passed to the judge handoff, not retained as unused metadata');
assert.deepEqual(evidence.project_gates, {
  values: [nodeTestGate],
  sha256: hash(JSON.stringify([nodeTestGate])),
  protected_inputs: captureProtectedInputs(evidenceWorkspace, [nodeTestGate]),
}, 'run evidence pins the declared direct-node gate values, hash, and fixture-owned protected inputs');
assert.equal(readdirSync(evidenceWorkspace).includes('.benchmark-surfaces'), false, 'the task workspace contains no hidden paired-surface cache');
assert.equal(readFileSync(join(evidenceWorkspace, 'directives', 'workflow.md'), 'utf8'), 'route candidate\n', 'only the selected instruction surface is installed in the task workspace');
assert.equal(readFileSync(join(evidenceWorkspace, 'directives', 'workflow.md'), 'utf8').includes('route baseline'), false, 'the unselected variant is not exposed to the tested agent');
linkSync(join(repoRoot, 'evals', 'benchmarks', 'checks', 'task.md'), join(repoRoot, 'evals', 'benchmarks', 'checks', 'task-alias.md'));
assert.throws(() => prepareBenchmarkRunEvidence({ repository_root: repoRoot, harness_root: gitRoot, corpus, corpus_sha256: corpusSha256, benchmark: benchmarkCase(), variant: 'candidate', workspace: temporary('benchmark-hardlink-checklist') }), /multi-link/i, 'hardlinked prompt or checklist evidence is rejected');
const mismatchCorpus = { ...corpus, cases: [{ ...benchmarkCase(), cohort: { ...cohort, harness_version: baselineRef } }] };
assert.equal(validateBenchmarkExecutionReadiness({ corpus: mismatchCorpus, harness_root: gitRoot }).some((error) => error.includes('harness_version')), true, 'a mismatched exact harness commit prevents execution');
writeFileSync(join(gitRoot, 'dirty.txt'), 'dirty\n');
assert.equal(validateBenchmarkExecutionReadiness({ corpus, harness_root: gitRoot }).some((error) => error.includes('dirty')), true, 'a dirty harness prevents execution');
console.log('Benchmark runner tests passed.');
