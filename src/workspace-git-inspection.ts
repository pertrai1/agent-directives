import { existsSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type {
  WorkspacePreflightCandidateDirectory,
  WorkspacePreflightGitEvidence,
  WorkspacePreflightOptions,
  WorkspacePreflightRecommendationCode,
} from './workspace-preflight.js';
import { parsePorcelainStatus } from './workspace-status-parsing.js';

export interface WorkspacePreflightGitInspection {
  applicable: boolean;
  cwd: string;
  git?: WorkspacePreflightGitEvidence;
  linkedWorktree: boolean;
  submodule: boolean;
  cleanliness?: { staged: string[]; unstaged: string[]; untracked: string[] };
  candidateWorktreeDirectories: WorkspacePreflightCandidateDirectory[];
  recommendation: WorkspacePreflightRecommendationCode;
  diagnostics: string[];
  error?: string;
}

interface GitRunResult {
  ok: boolean;
  stdout: string;
  status: number | null;
  timedOut: boolean;
}

interface ProbeSet {
  gitDirProbe: GitRunResult;
  commonDirProbe: GitRunResult;
  workTreeProbe: GitRunResult;
  branchProbe: GitRunResult;
  headProbe: GitRunResult;
  defaultBranchProbe: GitRunResult;
  remoteHeadProbe: GitRunResult;
  upstreamProbe: GitRunResult;
  aheadBehindProbe: GitRunResult;
  porcelainProbe: GitRunResult;
  superprojectProbe: GitRunResult;
  submoduleStatusProbe: GitRunResult;
}

const GIT_TIMEOUT_MS = 5_000;
const GIT_BUFFER_BYTES = 1_048_576;
const DEFAULT_REMOTE_HEAD = 'refs/remotes/origin/HEAD';
const CANDIDATES = ['.worktrees', 'worktrees'] as const;
const NON_GIT_DIAGNOSTIC = 'not a git work tree';

function runGit(options: { cwd: string; args: string[]; preflight: WorkspacePreflightOptions }): GitRunResult {
  const result = spawnSync('git', options.args, {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: options.preflight.maxBufferBytes ?? GIT_BUFFER_BYTES,
    timeout: options.preflight.gitTimeoutMs ?? GIT_TIMEOUT_MS,
  });
  return { ok: result.status === 0 && !result.error, stdout: result.stdout ?? '', status: result.status, timedOut: result.error?.name === 'TimeoutError' || Boolean(typeof result.error?.message === 'string' && result.error.message.includes('timed out')) };
}

function candidateDirectory(cwd: string, name: string): WorkspacePreflightCandidateDirectory {
  const path = join(cwd, name);
  return { path: normalize(resolve(cwd, path)).replaceAll('\\', '/'), exists: existsSync(path) };
}

function ignoredByGit(options: { cwd: string; name: string; preflight: WorkspacePreflightOptions }): boolean {
  return runGit({ cwd: options.cwd, args: ['check-ignore', '-q', options.name], preflight: options.preflight }).ok;
}

function collectProbes(cwd: string, options: WorkspacePreflightOptions): ProbeSet {
  const probe = (args: string[]) => runGit({ cwd, args, preflight: options });
  return {
    gitDirProbe: probe(['rev-parse', '--git-dir']),
    commonDirProbe: probe(['rev-parse', '--git-common-dir']),
    workTreeProbe: probe(['rev-parse', '--show-toplevel']),
    branchProbe: probe(['branch', '--show-current']),
    headProbe: probe(['symbolic-ref', '-q', 'HEAD']),
    defaultBranchProbe: probe(['config', '--get', 'init.defaultBranch']),
    remoteHeadProbe: probe(['symbolic-ref', '--quiet', DEFAULT_REMOTE_HEAD]),
    upstreamProbe: probe(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']),
    aheadBehindProbe: probe(['rev-list', '--left-right', '--count', '@{upstream}...HEAD']),
    porcelainProbe: probe(['status', '--porcelain=v2', '-z']),
    superprojectProbe: probe(['rev-parse', '--show-superproject-working-tree']),
    submoduleStatusProbe: probe(['submodule', 'status', '--cached', '--recursive']),
  };
}

function candidateDirectories(cwd: string, options: WorkspacePreflightOptions): WorkspacePreflightCandidateDirectory[] {
  return CANDIDATES.map((name) => ({ ...candidateDirectory(cwd, name), ignored: ignoredByGit({ cwd, name, preflight: options }) }));
}

function buildDiagnostics(probes: ProbeSet, detachedHead: boolean): string[] {
  return [
    !probes.remoteHeadProbe.ok && !probes.defaultBranchProbe.ok ? 'default branch evidence unavailable' : undefined,
    !probes.upstreamProbe.ok ? 'upstream evidence unavailable' : undefined,
    !probes.aheadBehindProbe.ok && probes.upstreamProbe.ok ? 'ahead/behind evidence unavailable' : undefined,
    inspectionFailed(probes) ? 'git inspection failed' : undefined,
    detachedHead ? 'detached HEAD' : undefined,
  ].filter((value): value is string => value !== undefined).sort((a, b) => a.localeCompare(b));
}

function isLinkedWorktree(probes: ProbeSet, submodule: boolean): boolean {
  const commonDir = probes.commonDirProbe.ok ? probes.commonDirProbe.stdout.trim() : '';
  const gitDir = probes.gitDirProbe.stdout.trim();
  return Boolean(commonDir && normalize(commonDir) !== normalize(gitDir) && !submodule);
}

function recommendationFor(options: {
  gitDirProbe: GitRunResult;
  requiredProbesOk: boolean;
  linkedWorktree: boolean;
  detachedHead: boolean;
  defaultBranch: string | undefined;
  cleanliness: { staged: string[]; unstaged: string[]; untracked: string[] } | undefined;
}): WorkspacePreflightRecommendationCode {
  if (!options.gitDirProbe.ok) return 'non-git';
  if (!options.requiredProbesOk) return 'needs-human';
  if (options.linkedWorktree) return 'already-isolated';
  if (options.detachedHead || !options.defaultBranch) return 'needs-human';
  if (!options.cleanliness) return 'needs-human';
  return options.cleanliness.staged.length || options.cleanliness.unstaged.length || options.cleanliness.untracked.length ? 'isolation-recommended' : 'in-place-clean';
}

export function inspectWorkspaceGit(options: WorkspacePreflightOptions = {}): WorkspacePreflightGitInspection {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  const probes = collectProbes(cwd, options);
  return probes.gitDirProbe.ok ? buildInspection({ cwd, probes, options }) : buildNonGitInspection(cwd, options);
}

function buildNonGitInspection(cwd: string, options: WorkspacePreflightOptions): WorkspacePreflightGitInspection {
  return {
    applicable: false,
    cwd,
    linkedWorktree: false,
    submodule: false,
    candidateWorktreeDirectories: candidateDirectories(cwd, options),
    recommendation: 'non-git',
    diagnostics: [NON_GIT_DIAGNOSTIC],
  };
}

function buildInspection(options: { cwd: string; probes: ProbeSet; options: WorkspacePreflightOptions }): WorkspacePreflightGitInspection {
  const { cwd, probes } = options;
  const detachedHead = !probes.headProbe.ok;
  const defaultBranch = readDefaultBranch(probes);
  const upstream = readText(probes.upstreamProbe);
  const aheadBehind = readAheadBehind(probes);
  const cleanliness = probes.porcelainProbe.ok ? parsePorcelainStatus(cwd, probes.porcelainProbe.stdout) : undefined;
  const submodule = isSubmodule(probes);
  const linkedWorktree = isLinkedWorktree(probes, submodule);
  const inspectionDidFail = inspectionFailed(probes);
  return {
    applicable: true,
    cwd,
    git: {
      commonDir: readText(probes.commonDirProbe),
      gitDir: probes.gitDirProbe.stdout.trim(),
      workTree: readText(probes.workTreeProbe),
      branch: readText(probes.branchProbe),
      detachedHead,
      defaultBranch,
      defaultBranchSource: defaultBranchSource(probes, defaultBranch),
      upstream,
      ahead: aheadBehind?.ahead,
      behind: aheadBehind?.behind,
    },
    linkedWorktree,
    submodule,
    cleanliness,
    candidateWorktreeDirectories: candidateDirectories(cwd, options.options),
    recommendation: recommendationFor({ gitDirProbe: probes.gitDirProbe, requiredProbesOk: !inspectionDidFail, linkedWorktree, detachedHead, defaultBranch, cleanliness }),
    diagnostics: buildDiagnostics(probes, detachedHead),
    error: inspectionDidFail ? 'git inspection failed' : undefined,
  };
}

function readText(probe: GitRunResult): string | undefined {
  const value = probe.ok ? probe.stdout.trim() : '';
  return value || undefined;
}

function readAheadBehind(probes: ProbeSet): { ahead: number; behind: number } | undefined {
  const value = readText(probes.aheadBehindProbe);
  if (!value || !probes.upstreamProbe.ok) return undefined;
  const [behind, ahead] = value.split(/\s+/);
  return { ahead: Number(ahead ?? 0), behind: Number(behind ?? 0) };
}

function readDefaultBranch(probes: ProbeSet): string | undefined {
  return readText(probes.remoteHeadProbe) ?? readText(probes.defaultBranchProbe);
}

function defaultBranchSource(probes: ProbeSet, defaultBranch: string | undefined): string | undefined {
  if (!defaultBranch) return undefined;
  if (probes.remoteHeadProbe.ok) return 'refs/remotes/origin/HEAD';
  return 'git config init.defaultBranch';
}

function isSubmodule(probes: ProbeSet): boolean {
  return readText(probes.superprojectProbe) !== undefined || submoduleStatusHasEntries(probes.submoduleStatusProbe);
}

function submoduleStatusHasEntries(probe: GitRunResult): boolean {
  return probe.ok && probe.stdout.trim().length > 0;
}

function inspectionFailed(probes: ProbeSet): boolean {
  return probes.gitDirProbe.ok && (probes.porcelainProbe.timedOut || !probes.porcelainProbe.ok || !probes.superprojectProbe.ok || !probes.submoduleStatusProbe.ok);
}
