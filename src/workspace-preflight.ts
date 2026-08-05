import { inspectWorkspaceGit, type WorkspacePreflightGitInspection } from './workspace-git-inspection.js';

export interface WorkspacePreflightOptions {
  cwd?: string;
  gitTimeoutMs?: number;
  maxBufferBytes?: number;
}

export type WorkspacePreflightRecommendationCode = 'already-isolated' | 'isolation-recommended' | 'in-place-clean' | 'non-git' | 'needs-human';

export interface WorkspacePreflightGitEvidence {
  commonDir?: string;
  gitDir?: string;
  workTree?: string;
  branch?: string;
  detachedHead: boolean;
  defaultBranch?: string;
  defaultBranchSource?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

export interface WorkspacePreflightCandidateDirectory {
  path: string;
  exists: boolean;
  ignored?: boolean;
}

export interface WorkspacePreflightReport {
  version: 1;
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

const EMPTY_CLEANLINESS = { staged: [], unstaged: [], untracked: [] };
const RECOMMENDATION_ORDER: WorkspacePreflightRecommendationCode[] = ['already-isolated', 'in-place-clean', 'isolation-recommended', 'needs-human', 'non-git'];

function toEvidence(inspection: WorkspacePreflightGitInspection): WorkspacePreflightReport {
  return {
    version: 1,
    applicable: inspection.applicable,
    cwd: inspection.cwd,
    git: inspection.git,
    linkedWorktree: inspection.linkedWorktree,
    submodule: inspection.submodule,
    cleanliness: inspection.cleanliness ?? EMPTY_CLEANLINESS,
    candidateWorktreeDirectories: inspection.candidateWorktreeDirectories,
    recommendation: inspection.recommendation,
    diagnostics: inspection.diagnostics,
    error: inspection.error,
  };
}

export function inspectWorkspace(options: WorkspacePreflightOptions = {}): WorkspacePreflightReport {
  return toEvidence(inspectWorkspaceGit(options));
}

function summaryList(values?: string[]): string {
  return values && values.length ? values.join(', ') : 'none';
}

function gitSummaryLines(report: WorkspacePreflightReport): string[] {
  const git = report.git;
  if (!git) return [];
  const fields = [
    ['Git dir', git.gitDir],
    ['Common dir', git.commonDir],
    ['Branch', git.detachedHead ? 'detached' : git.branch],
    ['Default branch', git.defaultBranch],
    ['Linked worktree', report.linkedWorktree ? 'yes' : 'no'],
    ['Submodule', report.submodule ? 'yes' : 'no'],
  ] as const;
  const lines = fields.map(([label, value]) => `${label}: ${value ?? 'unavailable'}`);
  if (git.upstream) lines.push(`Upstream: ${git.upstream} (ahead ${git.ahead ?? 'unavailable'}, behind ${git.behind ?? 'unavailable'})`);
  return lines;
}

function candidateLine(candidate: WorkspacePreflightCandidateDirectory): string {
  return `Candidate: ${candidate.path} (exists ${candidate.exists ? 'yes' : 'no'}${candidate.ignored === undefined ? '' : `, ignored ${candidate.ignored ? 'yes' : 'no'}`})`;
}

function renderText(report: WorkspacePreflightReport): string {
  const lines = [
    `Workspace preflight v${report.version}`,
    `Applicable: ${report.applicable ? 'yes' : 'no'}`,
    `Cwd: ${report.cwd}`,
    `Recommendation: ${report.recommendation}`,
    ...gitSummaryLines(report),
    `Staged: ${summaryList(report.cleanliness?.staged)}`,
    `Unstaged: ${summaryList(report.cleanliness?.unstaged)}`,
    `Untracked: ${summaryList(report.cleanliness?.untracked)}`,
    ...report.candidateWorktreeDirectories.map(candidateLine),
    ...report.diagnostics.map((diagnostic) => `Diagnostic: ${diagnostic}`),
  ];
  return `${lines.join('\n')}\n`;
}

export function renderWorkspacePreflight(report: WorkspacePreflightReport, format: 'text' | 'json'): string {
  return format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderText(report);
}

export function workspacePreflightExitCode(report: WorkspacePreflightReport): number {
  const map: Record<WorkspacePreflightRecommendationCode, number> = {
    'already-isolated': 0,
    'in-place-clean': 0,
    'isolation-recommended': 1,
    'needs-human': 2,
    'non-git': 0,
  };
  return map[report.recommendation];
}

export { RECOMMENDATION_ORDER };
