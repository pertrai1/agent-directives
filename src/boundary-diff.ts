import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

export type BoundaryDiffFormat = 'text' | 'json';

export interface BoundaryDiffOptions { cwd: string; baseRef: string; /** Optional target ref; when omitted, compares the base ref against the working tree/HEAD state. */ headRef?: string; maxEdges: number; }
export type BoundaryDiffKind = 'static-import' | 'export-from' | 'dynamic-import';
export type BoundaryDiffStatus = 'observed' | 'unclear' | 'candidate' | 'invalid';
export type BoundaryDiffEvidenceKind = 'source' | 'package';

export interface BoundaryDiffEdge { kind: BoundaryDiffKind; sourcePath: string; targetText: string; status: BoundaryDiffStatus; }
export interface BoundaryDiffDependencyChange { kind: 'dependency'; sourcePath: 'package.json'; targetText: string; status: BoundaryDiffStatus; section: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'; packageName: string; previousValue: string | null; nextValue: string | null; }
export interface BoundaryDiffReport { version: 1; cwd: string; baseRef: string; headRef: string; status: BoundaryDiffStatus; edges: Array<BoundaryDiffEdge | BoundaryDiffDependencyChange>; omittedEdges: number; invalidReason?: string; }

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const PACKAGE_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
type PackageSection = (typeof PACKAGE_SECTIONS)[number];
const TEST_PATH_MARKERS = ['/test/', '/tests/', '/__tests__/', '/fixtures/', '/__fixtures__/', '/mocks/', '/__mocks__/'];
const GIT_BUFFER_MB = 10;
const BYTES_PER_KIB = 1024;
const UNTRACKED_STATUS_PREFIX_LENGTH = 3;

function runGit(cwd: string, args: string[]): string { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: GIT_BUFFER_MB * BYTES_PER_KIB * BYTES_PER_KIB }).trimEnd(); }

function runGitAllowEmpty(cwd: string, args: string[]): string {
  try {
    return runGit(cwd, args);
  } catch {
    return '';
  }
}

function isSafeRef(ref: string): boolean {
  return /^[A-Za-z0-9._/\-~^:{}@]+$/.test(ref) && !ref.includes('..') && !ref.startsWith('-');
}

function resolveRef(cwd: string, ref: string): boolean {
  if (!isSafeRef(ref)) return false;
  try {
    runGit(cwd, ['rev-parse', '--verify', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function parseUnifiedDiff(diff: string): BoundaryDiffEdge[] {
  const edges: BoundaryDiffEdge[] = [];
  const lines = diff.split('\n');
  let currentFile = '';
  let inTargetFile = false;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      inTargetFile = false;
      currentFile = '';
      continue;
    }
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length);
      inTargetFile = true;
      continue;
    }
    if (!inTargetFile || !line.startsWith('+') || line.startsWith('+++')) continue;
    if (!SOURCE_EXTENSIONS.has(extname(currentFile))) continue;
    const content = line.slice(1);
    const sourcePath = currentFile;
    for (const edge of extractEdgesFromLine(content)) {
      edges.push({ ...edge, sourcePath });
    }
  }
  return edges;
}

function listUntrackedFiles(cwd: string): string[] {
  const output = runGitAllowEmpty(cwd, ['status', '--porcelain=v1', '-z']);
  if (!output) return [];
  const entries = output.split('\0').filter(Boolean);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith('?? ')) files.push(entry.slice(UNTRACKED_STATUS_PREFIX_LENGTH));
  }
  return files;
}

function extractEdgesFromLine(line: string): Array<Pick<BoundaryDiffEdge, 'kind' | 'targetText' | 'status'>> {
  const edges: Array<Pick<BoundaryDiffEdge, 'kind' | 'targetText' | 'status'>> = [];
  const staticImport = /^\s*import\s+(?:type\s+)?(?:[\w*\s{},]+?\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/;
  const exportFrom = /^\s*export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;
  const dynamicImport = /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  const matchedStatic = line.match(staticImport);
  if (matchedStatic) edges.push({ kind: 'static-import', targetText: matchedStatic[1], status: 'observed' });
  const matchedExport = line.match(exportFrom);
  if (matchedExport) edges.push({ kind: 'export-from', targetText: matchedExport[1], status: 'observed' });
  for (const match of line.matchAll(dynamicImport)) {
    edges.push({ kind: 'dynamic-import', targetText: match[2], status: 'observed' });
  }
  return edges;
}

function isTestLeakCandidate(sourcePath: string, targetText: string): boolean {
  const sourceNorm = sourcePath.replaceAll('\\', '/').toLowerCase();
  const targetNorm = targetText.replaceAll('\\', '/').toLowerCase();
  const sourceIsProduction = !isTestPath(sourceNorm);
  const targetLooksTestish = isTestPath(targetNorm);
  return sourceIsProduction && targetLooksTestish;
}

function isTestPath(pathValue: string): boolean {
  return TEST_PATH_MARKERS.some((marker) => pathValue.includes(marker))
    || /(?:^|\/)(?:test|spec)[._-]/.test(pathValue)
    || /\.(?:test|spec)\.[^/]+$/.test(pathValue);
}

function parsePackageJson(text: string): Record<string, Record<string, string>> { const parsed = JSON.parse(text) as { [key: string]: Record<string, string> | undefined }; const result: Record<string, Record<string, string>> = {}; for (const section of PACKAGE_SECTIONS) result[section] = parsed[section] ?? {}; return result; }

function readWorkingTreePackageJson(cwd: string): string | null {
  try {
    return readFileSync(join(cwd, 'package.json'), 'utf8');
  } catch {
    return null;
  }
}

function readRefPackageJson(cwd: string, ref: string): string | null {
  try {
    return runGit(cwd, ['show', `${ref}:package.json`]);
  } catch {
    return null;
  }
}

function collectDependencyChanges(options: { cwd: string; baseRef: string; headRef?: string }): BoundaryDiffDependencyChange[] {
  const { cwd, baseRef, headRef } = options;
  const after = headRef ? readRefPackageJson(cwd, headRef) : readWorkingTreePackageJson(cwd);
  const before = readRefPackageJson(cwd, baseRef);
  if (before === null && after === null) return [];
  const prev = parsePackageJson(before ?? '{}');
  const next = parsePackageJson(after ?? '{}');
  const changes: BoundaryDiffDependencyChange[] = [];
  for (const section of PACKAGE_SECTIONS) {
    changes.push(...collectSectionChanges({ prev, next, section }));
  }
  return changes;
}

function collectSectionChanges(options: { prev: Record<string, Record<string, string>>; next: Record<string, Record<string, string>>; section: PackageSection }): BoundaryDiffDependencyChange[] {
  const { prev, next, section } = options;
  const changes: BoundaryDiffDependencyChange[] = [];
  const names = new Set([...Object.keys(prev[section]), ...Object.keys(next[section])]);
  for (const packageName of [...names].sort()) {
    const previousValue = prev[section][packageName] ?? null;
    const nextValue = next[section][packageName] ?? null;
    if (previousValue === nextValue) continue;
    changes.push({ kind: 'dependency', sourcePath: 'package.json', targetText: `${section}:${packageName}`, status: 'observed', section, packageName, previousValue, nextValue });
  }
  return changes;
}

function collectUntrackedEdges(cwd: string, files: string[]): BoundaryDiffEdge[] { const edges: BoundaryDiffEdge[] = []; for (const file of files) if (SOURCE_EXTENSIONS.has(extname(file))) edges.push(...parseUnifiedDiff(getUntrackedDiff(cwd, file))); return edges; }

function getUntrackedDiff(cwd: string, file: string): string { try { return runGit(cwd, ['diff', '--no-index', '--unified=0', '--no-color', '--no-ext-diff', '--no-textconv', '/dev/null', file]); } catch (error) { return readNoIndexDiff(error); } }
function readNoIndexDiff(error: unknown): string { const output = readErrorOutput(error); if (output.diff) return output.diff; if (output.text.includes('did not match any file')) return ''; throw error; }
function readErrorOutput(error: unknown): { diff: string; text: string } { const stdout = error && typeof error === 'object' && 'stdout' in error ? String((error as { stdout?: Buffer | string }).stdout ?? '') : ''; const stderr = error && typeof error === 'object' && 'stderr' in error ? String((error as { stderr?: Buffer | string }).stderr ?? '') : ''; const diff = stdout.trimEnd(); return { diff, text: `${error instanceof Error ? error.message : String(error)} ${stdout} ${stderr}` }; }

function dedupeAndSort(edges: Array<BoundaryDiffEdge | BoundaryDiffDependencyChange>): Array<BoundaryDiffEdge | BoundaryDiffDependencyChange> {
  const seen = new Set<string>();
  const items: Array<BoundaryDiffEdge | BoundaryDiffDependencyChange> = [];
  for (const edge of edges) {
    const key = JSON.stringify(edge);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(edge);
  }
  items.sort((a, b) => {
    const keyA = `${a.sourcePath}\0${a.kind}\0${a.targetText}`;
    const keyB = `${b.sourcePath}\0${b.kind}\0${b.targetText}`;
    return keyA.localeCompare(keyB);
  });
  return items;
}

function classifyStatus(edges: Array<BoundaryDiffEdge | BoundaryDiffDependencyChange>): BoundaryDiffStatus { return edges.some((edge) => edge.status === 'candidate') ? 'candidate' : 'observed'; }
function invalidReport(options: BoundaryDiffOptions, invalidReason: string): BoundaryDiffReport { return { version: 1, cwd: options.cwd, baseRef: options.baseRef, headRef: options.headRef ?? 'WORKTREE', status: 'invalid', edges: [], omittedEdges: 0, invalidReason }; }
function validateBoundaryDiffOptions(options: BoundaryDiffOptions): BoundaryDiffReport | null { if (!Number.isInteger(options.maxEdges) || options.maxEdges <= 0) return invalidReport(options, 'maxEdges must be a positive integer'); if (!existsSync(join(options.cwd, '.git'))) return invalidReport(options, 'not a git repository'); if (!resolveRef(options.cwd, options.baseRef)) return invalidReport(options, `invalid base ref: ${options.baseRef}`); if (options.headRef && !resolveRef(options.cwd, options.headRef)) return invalidReport(options, `invalid head ref: ${options.headRef}`); return null; }
function buildBoundaryDiffReport(options: { boundaryOptions: BoundaryDiffOptions; diff: string; untrackedEdges: BoundaryDiffEdge[]; dependencyEdges: BoundaryDiffDependencyChange[]; }): BoundaryDiffReport { const { boundaryOptions, diff, untrackedEdges, dependencyEdges } = options; const allEdges = dedupeAndSort([ ...parseUnifiedDiff(diff).map((edge) => ({ ...edge, status: isTestLeakCandidate(edge.sourcePath, edge.targetText) ? 'candidate' : edge.status })), ...untrackedEdges.map((edge) => ({ ...edge, status: isTestLeakCandidate(edge.sourcePath, edge.targetText) ? 'candidate' as const : edge.status })), ...dependencyEdges.map((edge) => ({ ...edge, status: 'observed' as const })), ]); const visibleEdges = allEdges.slice(0, boundaryOptions.maxEdges); return { version: 1, cwd: boundaryOptions.cwd, baseRef: boundaryOptions.baseRef, headRef: boundaryOptions.headRef ?? 'WORKTREE', status: classifyStatus(allEdges), edges: visibleEdges, omittedEdges: Math.max(0, allEdges.length - visibleEdges.length), }; }

export function inspectBoundaryDiff(options: BoundaryDiffOptions): BoundaryDiffReport { const invalid = validateBoundaryDiffOptions(options); if (invalid) return invalid; try { const diff = options.headRef ? runGit(options.cwd, ['diff', '--unified=0', '--no-color', '--no-ext-diff', '--no-textconv', options.baseRef, options.headRef, '--']) : runGit(options.cwd, ['diff', '--unified=0', '--no-color', '--no-ext-diff', '--no-textconv', options.baseRef, '--']); const untrackedEdges = options.headRef ? [] : collectUntrackedEdges(options.cwd, listUntrackedFiles(options.cwd)); return buildBoundaryDiffReport({ boundaryOptions: options, diff, untrackedEdges, dependencyEdges: collectDependencyChanges(options) }); } catch (error) { const message = error instanceof Error ? error.message.split('\n')[0] : String(error); return invalidReport(options, `git comparison failed: ${message}`); } }

export function renderBoundaryDiff(report: BoundaryDiffReport, format: BoundaryDiffFormat): string {
  if (format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  const lines = [
    `Boundary diff report`,
    `base: ${report.baseRef}`,
    `head: ${report.headRef}`,
    `status: ${report.status}`,
  ];
  for (const edge of report.edges) {
    if (edge.kind === 'dependency') {
      lines.push(`- dependency ${edge.section}:${edge.packageName} ${edge.previousValue ?? '∅'} -> ${edge.nextValue ?? '∅'}`);
    } else {
      lines.push(`- ${edge.kind} ${edge.sourcePath} -> ${edge.targetText}${edge.status === 'candidate' ? ' [candidate]' : ''}`);
    }
  }
  if (report.omittedEdges > 0) lines.push(`- omitted ${report.omittedEdges} edge${report.omittedEdges === 1 ? '' : 's'}`);
  if (report.invalidReason) lines.push(`error: ${report.invalidReason}`);
  return `${lines.join('\n')}\n`;
}

export function boundaryDiffExitCode(report: BoundaryDiffReport): 0 | 1 | 2 {
  if (report.status === 'invalid') return 2;
  if (report.status === 'candidate') return 1;
  return 0;
}
