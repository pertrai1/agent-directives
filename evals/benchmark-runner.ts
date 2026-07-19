import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { captureProtectedInputs } from './capture-protected-inputs.js';
import { hashEntries } from './hash-entries.js';
import { validateBenchmarkCase, validateBenchmarkCorpus, validateInstructionSurfaceRef } from './benchmark-validation.js';
import type {
  BenchmarkCase,
  BenchmarkCorpus,
  BenchmarkVariant,
  BenchmarkRunEvidence,
  FileEvidence,
  InstructionSurfaceRef,
} from './benchmark-types.js';

export { hashEntries } from './hash-entries.js';
export { validateBenchmarkCase, validateBenchmarkCorpus, validateBenchmarkDataset, validateBenchmarkDatasetAgainstRunPlan, validateBenchmarkRunPlan } from './benchmark-validation.js';
export { createInterleavedSchedule } from './create-interleaved-schedule.js';
const COMMIT = /^[a-f0-9]{40}$/i;
const EXECUTION_COHORT_HASH_FIELDS = ['tool_configuration_hash', 'global_instruction_hash', 'inference_settings_hash'] as const;
function requireRelativePath(value: string, label: string): string {
  if (!value || value === '.' || value === '..' || value.includes('\u0000') || value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) {
    throw new Error(`${label} must be a non-empty repository-relative path`);
  }
  const normalized = value.replaceAll('\\', '/');
  if (normalized.split('/').some((part) => part === '..' || part.length === 0)) throw new Error(`${label} escapes its root`);
  return normalized;
}

function assertNoAncestorSymlink(path: string, label: string): void {
  let existing = resolve(path);
  while (!lstatSync(existing, { throwIfNoEntry: false })) {
    const parent = resolve(existing, '..');
    if (parent === existing) return;
    existing = parent;
  }
  const physical = realpathSync(existing);
  const systemVarAlias = existing.startsWith('/var/') && physical === `/private${existing}`;
  if (physical !== existing && !systemVarAlias) throw new Error(`${label} has an escaping ancestor symlink: ${existing}`);
}

function containedPath({ root, path, label }: { root: string; path: string; label: string }): string {
  const resolvedRoot = resolve(root);
  assertNoAncestorSymlink(resolvedRoot, `${label} root`);
  const resolvedPath = resolve(resolvedRoot, requireRelativePath(path, label));
  if (!resolvedPath.startsWith(`${resolvedRoot}${sep}`)) throw new Error(`${label} escapes its root`);
  assertNoAncestorSymlink(resolve(resolvedPath, '..'), label);
  return resolvedPath;
}

function fileEntries(root: string): Array<{ path: string; contents: Buffer }> {
  assertNoAncestorSymlink(root, 'immutable source root');
  const rootStat = lstatSync(root, { throwIfNoEntry: false });
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`immutable source root is missing or unsafe: ${root}`);
  const entries: Array<{ path: string; contents: Buffer }> = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`unsafe fixture or instruction-source symlink: ${relative(root, path)}`);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) {
        if (stat.nlink > 1) throw new Error(`unsafe multi-link immutable source file: ${relative(root, path)}`);
        entries.push({ path: relative(root, path).replaceAll('\\', '/'), contents: readFileSync(path) });
      }
      else throw new Error(`unsupported immutable source entry: ${relative(root, path)}`);
    }
  };
  visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function writeEntries(workspace: string, entries: Array<{ path: string; contents: Buffer }>): void {
  assertNoAncestorSymlink(resolve(workspace, '..'), 'workspace root');
  const paths = new Set<string>();
  for (const entry of entries) {
    requireRelativePath(entry.path, 'materialized path');
    if (paths.has(entry.path)) throw new Error(`duplicate materialized path: ${entry.path}`);
    paths.add(entry.path);
  }
  mkdirSync(workspace, { recursive: true });
  assertNoAncestorSymlink(workspace, 'workspace root');
  if (readdirSync(workspace).length > 0) throw new Error(`immutable materialization conflict: workspace is not empty (${workspace})`);
  for (const entry of entries) {
    const target = containedPath({ root: workspace, path: entry.path, label: 'materialized path' });
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, entry.contents, { flag: 'wx' });
  }
}

/** Installs an already-verified surface beside a fixture without overwriting fixture state. */
export function installMaterializedInstructionSurface({ source, workspace }: { source: string; workspace: string }): void {
  const entries = fileEntries(source);
  for (const entry of entries) {
    const target = containedPath({ root: workspace, path: entry.path, label: 'installed instruction path' });
    const existing = lstatSync(target, { throwIfNoEntry: false });
    if (existing) throw new Error(`instruction surface conflicts with fixture state: ${entry.path}`);
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, entry.contents, { flag: 'wx' });
  }
}

/** Copies a fixture only when the declared source is immutable and the workspace is fresh. */
export function copyImmutableFixture({ fixture_root, fixture, workspace }: { fixture_root: string; fixture: string; workspace: string }): { sha256: string; bytes: number; files: string[] } {
  const source = containedPath({ root: fixture_root, path: fixture, label: 'fixture' });
  const stat = lstatSync(source, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`fixture is missing or unsafe: ${fixture}`);
  const entries = fileEntries(source);
  writeEntries(workspace, entries);
  return { sha256: hashEntries(entries), bytes: entries.reduce((total, entry) => total + entry.contents.length, 0), files: entries.map((entry) => entry.path) };
}

function git({ root, args, label }: { root: string; args: string[]; label: string }): string {
  assertNoAncestorSymlink(root, 'harness root');
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`${label}: ${result.error?.message ?? result.stderr.trim() ?? `git exited ${result.status}`}`);
  return result.stdout;
}

function gitBytes({ root, args, label }: { root: string; args: string[]; label: string }): Buffer {
  assertNoAncestorSymlink(root, 'harness root');
  const result = spawnSync('git', args, { cwd: root, encoding: 'buffer' });
  if (result.error || result.status !== 0) throw new Error(`${label}: ${result.error?.message ?? result.stderr.toString().trim() ?? `git exited ${result.status}`}`);
  return result.stdout;
}

function assertCleanHarness(harness_root: string): void {
  if (git({ root: harness_root, args: ['status', '--porcelain'], label: 'cannot inspect harness cleanliness' }).trim()) throw new Error('instruction-surface harness is dirty');
}

function containsPending(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('PENDING');
  if (Array.isArray(value)) return value.some(containsPending);
  return Boolean(value && typeof value === 'object' && Object.values(value).some(containsPending));
}

function placeholderHash(value: string): boolean {
  return /^([a-f0-9])\1{63}$/i.test(value);
}

export function executionPlaceholderErrors(corpus: BenchmarkCorpus): string[] {
  const errors = containsPending(corpus) ? ['benchmark corpus contains PENDING execution placeholders'] : [];
  for (const benchmark of corpus.cases) {
    for (const field of EXECUTION_COHORT_HASH_FIELDS) if (placeholderHash(benchmark.cohort[field])) errors.push(`${benchmark.case_id} uses a placeholder ${field}`);
    for (const variant of ['baseline', 'candidate'] as const) if (placeholderHash(benchmark.variants[variant].instruction_surface.expected_sha256)) errors.push(`${benchmark.case_id}/${variant} uses a placeholder instruction-surface hash`);
  }
  return errors;
}

/** Execution-only checks: the committed PENDING corpus remains inspectable but cannot mutate evidence. */
export function validateBenchmarkExecutionReadiness({ corpus, harness_root }: { corpus: BenchmarkCorpus; harness_root: string }): string[] {
  const errors = validateBenchmarkCorpus(corpus);
  if (errors.length) return errors;
  errors.push(...executionPlaceholderErrors(corpus));
  try {
    assertCleanHarness(harness_root);
    const head = git({ root: harness_root, args: ['rev-parse', 'HEAD'], label: 'cannot resolve harness commit' }).trim();
    for (const benchmark of corpus.cases) if (benchmark.cohort.harness_version !== head) errors.push(`${benchmark.case_id} harness_version does not match the exact harness commit`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

function entriesFromGitCommit(harness_root: string, instruction_surface: InstructionSurfaceRef): { ref: string; entries: Array<{ path: string; contents: Buffer }> } {
  assertCleanHarness(harness_root);
  if (!COMMIT.test(instruction_surface.ref)) throw new Error('git instruction surface ref is not immutable');
  const ref = git({ root: harness_root, args: ['rev-parse', `${instruction_surface.ref}^{commit}`], label: 'cannot resolve instruction surface ref' }).trim();
  if (ref !== instruction_surface.ref) throw new Error('instruction surface ref must resolve to the declared immutable commit');
  const records = gitBytes({ root: harness_root, args: ['ls-tree', '-rz', ref, '--', ...instruction_surface.paths], label: 'cannot list instruction surface paths' })
    .toString('utf8').split('\0').filter(Boolean);
  if (records.length === 0) throw new Error('instruction surface ref does not contain declared paths');
  const files = records.map((record) => {
    const match = /^(\d+)\s+\w+\s+[a-f0-9]+\t([\s\S]+)$/i.exec(record);
    if (!match) throw new Error('cannot parse git instruction surface entry');
    if (match[1] === '120000') throw new Error(`git instruction surface contains a symlink: ${match[2]}`);
    if (!/^100[0-7]{3}$/.test(match[1])) throw new Error(`git instruction surface contains a non-regular entry: ${match[2]}`);
    return requireRelativePath(match[2], 'instruction surface file');
  }).sort();
  if (new Set(files).size !== files.length) throw new Error('git instruction surface contains duplicate installed paths');
  return { ref, entries: files.map((path) => ({ path, contents: gitBytes({ root: harness_root, args: ['show', `${ref}:${path}`], label: 'cannot read instruction surface file' }) })) };
}

function entriesFromArtifact(harness_root: string, instruction_surface: InstructionSurfaceRef): { ref: string; entries: Array<{ path: string; contents: Buffer }> } {
  const artifactRoot = containedPath({ root: harness_root, path: instruction_surface.ref, label: 'package artifact ref' });
  const stat = lstatSync(artifactRoot, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`package artifact is missing or unsafe: ${instruction_surface.ref}`);
  const entries = instruction_surface.paths.flatMap((path) => {
    const source = containedPath({ root: artifactRoot, path, label: 'instruction surface path' });
    const sourceStat = lstatSync(source, { throwIfNoEntry: false });
    if (!sourceStat || sourceStat.isSymbolicLink()) throw new Error(`package artifact path is missing or unsafe: ${path}`);
    if (sourceStat.isDirectory()) return fileEntries(source).map((entry) => ({ path: `${path}/${entry.path}`, contents: entry.contents }));
    if (sourceStat.isFile()) {
      if (sourceStat.nlink > 1) throw new Error(`package artifact path is an unsafe multi-link file: ${path}`);
      return [{ path, contents: readFileSync(source) }];
    }
    throw new Error(`package artifact path is unsupported: ${path}`);
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length === 0) throw new Error('package artifact contains no instruction files');
  return { ref: instruction_surface.ref, entries };
}

/** Materializes a complete instruction surface without checking out a second runner. */
export function materializeInstructionSurface({ harness_root, instruction_surface, workspace }: { harness_root: string; instruction_surface: InstructionSurfaceRef; workspace: string }): { ref: string; sha256: string; files: string[] } {
  const errors = validateInstructionSurfaceRef(instruction_surface);
  if (errors.length) throw new Error(errors.join('; '));
  const source = instruction_surface.kind === 'git-commit'
    ? entriesFromGitCommit(harness_root, instruction_surface)
    : entriesFromArtifact(harness_root, instruction_surface);
  const sha256 = hashEntries(source.entries);
  if (sha256 !== instruction_surface.expected_sha256) throw new Error(`instruction surface hash mismatch: expected ${instruction_surface.expected_sha256}, received ${sha256}`);
  writeEntries(workspace, source.entries);
  return { ref: source.ref, sha256, files: source.entries.map((entry) => entry.path) };
}

/** Materializes both variants through one clean pinned harness and rejects equal installed surfaces. */
export function materializePairedInstructionSurfaces({ harness_root, benchmark, workspace }: { harness_root: string; benchmark: BenchmarkCase; workspace: string }): Record<BenchmarkVariant, { ref: string; sha256: string; files: string[] }> {
  const errors = validateBenchmarkCase(benchmark);
  if (errors.length) throw new Error(errors.join('; '));
  assertCleanHarness(harness_root);
  const baseline = materializeInstructionSurface({ harness_root, instruction_surface: benchmark.variants.baseline.instruction_surface, workspace: join(workspace, 'baseline') });
  const candidate = materializeInstructionSurface({ harness_root, instruction_surface: benchmark.variants.candidate.instruction_surface, workspace: join(workspace, 'candidate') });
  if (baseline.sha256 === candidate.sha256) throw new Error('baseline and candidate installed instruction surfaces are unexpectedly identical');
  return { baseline, candidate };
}

function safeFileEvidence({ repository_root, path, label }: { repository_root: string; path: string; label: string }): FileEvidence & { contents: string } {
  const source = containedPath({ root: repository_root, path, label });
  const stat = lstatSync(source, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`${label} is missing or unsafe: ${path}`);
  if (stat.nlink > 1) throw new Error(`${label} is an unsafe multi-link file: ${path}`);
  const contents = readFileSync(source, 'utf8');
  return { path, sha256: createHash('sha256').update(contents).digest('hex'), bytes: Buffer.byteLength(contents), contents };
}

/** Binds every outcome input and the selected installed surface to the evidence consumed by the judge. */
export function prepareBenchmarkRunEvidence({ repository_root, harness_root, corpus, corpus_sha256, benchmark, variant, workspace }: { repository_root: string; harness_root: string; corpus: BenchmarkCorpus; corpus_sha256: string; benchmark: BenchmarkCase; variant: BenchmarkVariant; workspace: string }): BenchmarkRunEvidence {
  const readiness = validateBenchmarkExecutionReadiness({ corpus, harness_root });
  if (readiness.length) throw new Error(`benchmark execution is not ready: ${readiness.join('; ')}`);
  const outcome = benchmark.variants[variant].outcome;
  const prompt = safeFileEvidence({ repository_root, path: outcome.prompt_file, label: 'benchmark prompt' });
  const acceptance = safeFileEvidence({ repository_root, path: outcome.acceptance_checklist, label: 'benchmark acceptance checklist' });
  const fixture = copyImmutableFixture({ fixture_root: join(repository_root, 'evals', 'fixtures'), fixture: outcome.fixture, workspace });
  const surfaceRoot = mkdtempSync(join(tmpdir(), `benchmark-${benchmark.case_id}-surfaces-`));
  let selected: BenchmarkRunEvidence['instruction_surface'];
  try {
    const surfaces = materializePairedInstructionSurfaces({ harness_root, benchmark, workspace: surfaceRoot });
    selected = surfaces[variant];
    installMaterializedInstructionSurface({ source: join(surfaceRoot, variant), workspace });
  } finally {
    rmSync(surfaceRoot, { recursive: true, force: true });
  }
  const gates = outcome.project_gates.map((gate) => ({ ...gate, args: [...gate.args], protected_paths: [...gate.protected_paths] }));
  return {
    case_id: benchmark.case_id,
    variant,
    corpus_sha256,
    harness_commit: benchmark.cohort.harness_version,
    prompt: { path: prompt.path, sha256: prompt.sha256, bytes: prompt.bytes },
    fixture: { path: outcome.fixture, sha256: fixture.sha256, bytes: fixture.bytes },
    acceptance_checklist: { path: acceptance.path, sha256: acceptance.sha256, bytes: acceptance.bytes },
    judge_handoff: { acceptance_checklist: acceptance.contents, sha256: acceptance.sha256 },
    project_gates: { values: gates, sha256: createHash('sha256').update(JSON.stringify(gates)).digest('hex'), protected_inputs: captureProtectedInputs(workspace, gates) },
    instruction_surface: selected,
  };
}
