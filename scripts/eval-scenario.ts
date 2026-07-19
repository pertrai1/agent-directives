#!/usr/bin/env tsx
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createInterleavedSchedule,
  prepareBenchmarkRunEvidence,
  validateBenchmarkCorpus,
  validateBenchmarkExecutionReadiness,
} from '../evals/benchmark-runner.js';
import { registerBenchmarkAttempt } from '../evals/register-benchmark-attempt.js';
import { runBenchmarkGates } from '../evals/run-benchmark-gates.js';
import type { BenchmarkCase, BenchmarkCorpus, BenchmarkScheduleEntry, BenchmarkVariant } from '../evals/benchmark-types.js';
import type { AttemptRegistration, LoadedFile, Manifest } from '../evals/scenario-manifest.js';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const BENCHMARK_ARGUMENT_COUNT = 8;
function usage(): never {
  console.error('usage: evals/run-scenario.sh [--print-only] <scenario-name>');
  console.error('   or: evals/run-scenario.sh [--print-only] --benchmark <case-id> --variant <baseline|candidate> --repetition <n> --seed <integer>');
  process.exit(2);
}
const args = process.argv.slice(2);
let printOnly = false;
if (args[0] === '--print-only') {
  printOnly = true;
  args.shift();
}
let benchmarkRequest: { case_id: string; variant: BenchmarkVariant; repetition: number; seed: number; retry_of?: string } | undefined;
if (args[0] === '--benchmark') {
  const [flag, case_id, variantFlag, variant, repetitionFlag, repetition, seedFlag, seed, retryFlag, retry_of] = args;
  const hasRetry = args.length === BENCHMARK_ARGUMENT_COUNT + 2 && retryFlag === '--retry-of' && Boolean(retry_of);
  if (flag !== '--benchmark' || variantFlag !== '--variant' || repetitionFlag !== '--repetition' || seedFlag !== '--seed' || (args.length !== BENCHMARK_ARGUMENT_COUNT && !hasRetry) || (variant !== 'baseline' && variant !== 'candidate') || !Number.isInteger(Number(repetition)) || Number(repetition) < 1 || !Number.isInteger(Number(seed))) usage();
  benchmarkRequest = { case_id, variant, repetition: Number(repetition), seed: Number(seed), ...(hasRetry ? { retry_of } : {}) };
} else if (args.length !== 1) usage();
if (benchmarkRequest && printOnly) {
  console.error('benchmark mode does not support --print-only because every benchmark attempt is durably registered before launch');
  process.exit(2);
}
let scenario = benchmarkRequest?.case_id ?? args[0];
let benchmark: BenchmarkCase | undefined;
let benchmarkOrder: BenchmarkScheduleEntry[] | undefined;
let benchmarkCorpus: BenchmarkCorpus | undefined;
let benchmarkCorpusSha256: string | undefined;
if (benchmarkRequest) {
  const corpusPath = join(repoRoot, 'evals', 'benchmarks', 'corpus.json');
  let corpus: BenchmarkCorpus;
  try {
    const corpusText = readFileSync(corpusPath, 'utf8');
    corpus = JSON.parse(corpusText) as BenchmarkCorpus;
    benchmarkCorpusSha256 = createHash('sha256').update(corpusText).digest('hex');
  } catch (error) {
    console.error(`cannot read benchmark corpus: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  const corpusErrors = validateBenchmarkCorpus(corpus);
  if (corpusErrors.length) {
    console.error(`invalid benchmark corpus: ${corpusErrors.join('; ')}`);
    process.exit(1);
  }
  benchmark = corpus.cases.find((entry) => entry.case_id === benchmarkRequest!.case_id);
  if (!benchmark) {
    console.error(`benchmark case not found: ${benchmarkRequest.case_id}`);
    process.exit(1);
  }
  if (benchmarkRequest.repetition > corpus.minimum_attempts_per_variant) {
    console.error(`benchmark repetition exceeds declared minimum policy: ${benchmarkRequest.repetition}`);
    process.exit(1);
  }
  benchmarkOrder = createInterleavedSchedule(corpus, benchmarkRequest.seed);
  benchmarkCorpus = corpus;
  const readiness = validateBenchmarkExecutionReadiness({ corpus, harness_root: repoRoot });
  if (readiness.length) {
    console.error(`benchmark execution is not ready: ${readiness.join('; ')}`);
    process.exit(1);
  }
  scenario = benchmark.scenario;
}
if (!/^[A-Za-z0-9_-]+$/.test(scenario)) {
  console.error(`invalid scenario name: ${scenario}`);
  process.exit(2);
}
const scenarioFile = join(repoRoot, 'evals', 'scenarios', `${scenario}.md`);
let scenarioText = '';
try {
  scenarioText = readFileSync(scenarioFile, 'utf8');
} catch {
  console.error(`scenario not found: ${scenarioFile}`);
  process.exit(1);
}
function section(name: string): string {
  const match = scenarioText.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match?.[1]?.trimEnd() ?? '';
}
function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
const setup = section('Setup');
let prompt = section('Prompt');
const directiveUnderTest = section('Directive Under Test');
if (benchmark && benchmarkRequest) {
  try {
    prompt = readFileSync(join(repoRoot, benchmark.variants[benchmarkRequest.variant].outcome.prompt_file), 'utf8').trimEnd();
  } catch (error) {
    console.error(`benchmark prompt is unavailable: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
const pathPattern = /(?:AGENTS\.md|directives\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.md|skills\/[a-zA-Z0-9_-]+\/SKILL\.md)/g;
const refs = unique(setup.match(pathPattern) ?? []);
const expectedLoads = unique([...refs, ...(directiveUnderTest.match(pathPattern) ?? [])]);
if (refs.length === 0) {
  console.error(`no directive/skill references found in ${scenarioFile}`);
  process.exit(1);
}
const workspace = mkdtempSync(join(tmpdir(), `eval-${scenario}-`));
const claudeMd = join(workspace, 'CLAUDE.md');
const loadedFiles: LoadedFile[] = [];
let assembled = '';
let benchmarkProtocol: Manifest['benchmark_protocol'];
if (benchmark && benchmarkRequest) {
  const evidence = prepareBenchmarkRunEvidence({
    repository_root: repoRoot,
    harness_root: repoRoot,
    corpus: benchmarkCorpus!,
    corpus_sha256: benchmarkCorpusSha256!,
    benchmark,
    variant: benchmarkRequest.variant,
    workspace,
  });
  benchmarkProtocol = {
    case_id: benchmark.case_id,
    category: benchmark.category,
    variant: benchmarkRequest.variant,
    repetition: benchmarkRequest.repetition,
    seed: benchmarkRequest.seed,
    corpus_sha256: benchmarkCorpusSha256!,
    registry_path: '',
    registry_sequence: 0,
    order: benchmarkOrder!,
    fixture: evidence.fixture,
    prompt: evidence.prompt,
    acceptance_checklist: evidence.acceptance_checklist,
    judge_handoff: evidence.judge_handoff,
    project_gates: evidence.project_gates,
    instruction_surface: evidence.instruction_surface,
    cohort: benchmark.cohort,
  };
}
for (const ref of refs) {
  const source = benchmarkProtocol ? join(workspace, ref) : join(repoRoot, ref);
  let body = '';
  try {
    body = readFileSync(source, 'utf8');
  } catch {
    console.error(`referenced file missing: ${source}`);
    process.exit(1);
  }
  const bytes = Buffer.byteLength(body);
  const sha256 = createHash('sha256').update(body).digest('hex');
  loadedFiles.push({ path: ref, sha256, bytes });
  assembled += `<!-- loaded from ${ref} -->\n\n${body}\n\n`;
}
writeFileSync(claudeMd, assembled);
const commitResult = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
const commit = commitResult.error || commitResult.status !== 0 || !commitResult.stdout.trim()
  ? 'unknown'
  : commitResult.stdout.trim();
if (commit === 'unknown') {
  const detail = commitResult.error?.message || commitResult.stderr?.trim() || `status ${commitResult.status}`;
  console.error(`warning: unable to resolve current git commit: ${detail}`);
}
const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(repoRoot, 'evals', 'results', 'runs', `${safeDate}-${scenario}`);
const benchmarkRegistration = benchmark && benchmarkRequest && benchmarkCorpus && benchmarkCorpusSha256
  ? registerBenchmarkAttempt({ registry_path: join(repoRoot, 'evals', 'results', 'runs', 'benchmark-registries', `${benchmarkCorpusSha256}-${benchmarkRequest.seed}.json`), corpus: benchmarkCorpus, corpus_sha256: benchmarkCorpusSha256, seed: benchmarkRequest.seed, case_id: benchmarkRequest.case_id, variant: benchmarkRequest.variant, repetition: benchmarkRequest.repetition, retry_of: benchmarkRequest.retry_of })
  : undefined;
if (benchmarkProtocol && benchmarkRegistration) {
  benchmarkProtocol.registry_path = relative(repoRoot, join(repoRoot, 'evals', 'results', 'runs', 'benchmark-registries', `${benchmarkCorpusSha256}-${benchmarkRequest!.seed}.json`));
  benchmarkProtocol.registry_sequence = benchmarkRegistration.registration.sequence;
}
mkdirSync(runDir, { recursive: true });
const attemptRegistration: AttemptRegistration = benchmarkRegistration?.registration ?? { attempt_id: randomUUID(), registered_at: new Date().toISOString(), status: 'started' };
writeFileSync(join(runDir, 'attempt-registration.json'), `${JSON.stringify(attemptRegistration, null, 2)}\n`);
const assembledCopy = join(runDir, 'assembled-prompt.md');
writeFileSync(assembledCopy, assembled);
const manifestPath = join(runDir, 'manifest.json');
const manifest: Manifest = {
  attempt_id: attemptRegistration.attempt_id,
  registration: attemptRegistration,
  attempt_status: 'started',
  scenario,
  date: new Date().toISOString(),
  commit,
  client: 'claude',
  instruction_surface: 'CLAUDE.md',
  workspace,
  assembled_prompt: relative(repoRoot, assembledCopy),
  prompt,
  loaded_files: loadedFiles,
  expected_loads: expectedLoads,
  claimed_route: null,
  claimed_loaded_files: [],
  ...(benchmarkProtocol ? { benchmark: { category: benchmarkProtocol.category, variant: benchmarkProtocol.variant, repetition: benchmarkProtocol.repetition }, cohort: benchmarkProtocol.cohort, benchmark_protocol: benchmarkProtocol } : {}),
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Workspace: ${workspace}`);
console.log(`Run log: ${relative(repoRoot, runDir)}`);
console.log('Loaded into CLAUDE.md:');
for (const ref of refs) console.log(`  - ${ref}`);
console.log('');
console.log(`----- scenario prompt (${scenario}) -----`);
console.log(prompt);
console.log('----- end prompt -----');
console.log('');
if (printOnly) {
  console.log('--print-only set; not launching claude.');
  console.log('');
  console.log('----- CLAUDE.md preview -----');
  console.log(assembled);
  console.log('----- end CLAUDE.md preview -----');
  manifest.attempt_status = 'abandoned';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(0);
}
console.log(`Launching claude in ${workspace}. Workspace is retained for this run log.`);
console.log('Tip: your global ~/.claude/CLAUDE.md is still loaded — move it aside if it conflicts.');
const result = spawnSync('claude', { cwd: workspace, stdio: 'inherit' });
manifest.completed_at = new Date().toISOString();
if (result.error) {
  const error = result.error as NodeJS.ErrnoException;
  const EXIT_COMMAND_NOT_FOUND = 127;
  const exitStatus = error.code === 'ENOENT' ? EXIT_COMMAND_NOT_FOUND : 1;
  console.error(`Failed to launch claude: ${result.error.message}`);
  manifest.exit_status = exitStatus;
  manifest.error_message = result.error.message;
  manifest.attempt_status = 'failed';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(exitStatus);
}
manifest.exit_status = result.status;
manifest.attempt_status = result.status === 0 ? 'completed' : 'failed';
if (benchmarkProtocol) {
  const gateEvidence = runBenchmarkGates({ workspace, evidence: benchmarkProtocol.project_gates });
  manifest.gates = gateEvidence.status;
  manifest.gate_results = gateEvidence.results;
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.exit((result.status ?? 1) === 0 && manifest.gates !== 'fail' ? 0 : 1);
