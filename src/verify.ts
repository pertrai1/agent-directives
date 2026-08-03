import { execSync } from 'node:child_process';
import { isEntryInstalled } from './install.js';
import { loadManifest, type ManifestEntry } from './manifest.js';
import { detectTool } from './targets.js';
import { matchGlob } from './glob.js';

/** Represents the result of running a single verification gate check. */
export interface VerifyResult {
  /** The human-readable name of the verification gate. */
  name: string;
  /** The shell command executed. */
  command: string;
  /** The final status of the check. */
  status: 'passed' | 'failed' | 'skipped';
  /** Optional error message if the gate failed. */
  error?: string;
}

/** Represents a parsed verification gate command configuration. */
interface ActiveGate {
  name: string;
  run: string;
  files?: string[];
  sourceId: string;
}

const NAME_PADDING = 30;
const PORCELAIN_STATUS_LENGTH = 3;

/**
 * Parses NUL-separated porcelain v1 strings into file paths.
 */
function parsePorcelain(parts: string[]): string[] {
  const files: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part) {
      i++;
      continue;
    }
    const status = part.slice(0, 2);
    const file = part.slice(PORCELAIN_STATUS_LENGTH);
    const dest = parts[i + 1];
    if (status.startsWith('R') && dest) {
      files.push(dest);
      i += 2;
      continue;
    }
    files.push(file);
    i++;
  }
  return files;
}

/**
 * Retrieves the list of modified, added, or untracked files in the workspace.
 * Uses NUL-delimited porcelain v1 output to securely handle paths with spaces or quotes.
 *
 * @returns String array of file paths, or null if the git command fails.
 */
export function getModifiedFiles(): string[] | null {
  try {
    const output = execSync('git status --porcelain=v1 -z', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
    return parsePorcelain(output.split('\0'));
  } catch {
    return null;
  }
}

/**
 * Checks if the current workspace is inside a git-backed work tree.
 *
 * @returns True if a git repository is detected.
 */
function hasGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Maps installed manifest entries to active verification gates.
 *
 * @param installed List of installed ManifestEntry items.
 * @returns Array of ActiveGate configurations.
 */
function getInstalledGates(installed: ManifestEntry[]): ActiveGate[] {
  const gates: ActiveGate[] = [];
  for (const entry of installed) {
    const commands = entry.verification?.commands;
    if (!commands) continue;
    for (const cmd of commands) {
      gates.push({
        name: cmd.name,
        run: cmd.run,
        files: cmd.files,
        sourceId: entry.id,
      });
    }
  }
  return gates;
}

/** Options for evaluating whether a gate check applies to current modifications. */
export interface ShouldRunGateOptions {
  /** The gate check configuration under test. */
  gate: ActiveGate;
  /** Whether the workspace is currently git-backed. */
  isGit: boolean;
  /** The list of modified files detected in the workspace. */
  changedFiles: string[];
}

/**
 * Determines whether a given gate check matches the changed files list.
 *
 * @param options Options object containing gate configuration, git state, and changes.
 * @returns True if the gate should be executed.
 */
function shouldRunGate(options: ShouldRunGateOptions): boolean {
  const { gate, isGit, changedFiles } = options;
  if (!gate.files) return true;
  if (!isGit) return true;
  return changedFiles.some((file) => gate.files!.some((glob) => matchGlob(file, glob)));
}

/**
 * Executes a single gate shell command synchronously inside the workspace.
 *
 * @param gate The gate check to execute.
 * @param cwd The target execution workspace directory.
 * @returns The run status and optional error.
 */
function executeGate(gate: ActiveGate, cwd: string): { status: 'passed' | 'failed'; error?: string } {
  console.log('Running gate', { name: gate.name, command: gate.run });
  try {
    execSync(gate.run, { stdio: 'inherit', cwd });
    console.log('Passed gate', { name: gate.name });
    return { status: 'passed' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error && typeof error === 'object' && 'status' in error ? error.status : 1;
    console.error('Failed gate', { name: gate.name, status });
    return { status: 'failed', error: message };
  }
}

/** Helper function to log lines cleanly. */
function printLine(text: string): void {
  const logger = console;
  logger.log(text);
}

/** Helper function to log errors cleanly. */
function printErrorLine(text: string): void {
  const logger = console;
  logger.error(text);
}

/** Outputs the formatted verification status summary report. */
function printReport(results: VerifyResult[]): void {
  printLine('\n========================================');
  printLine('VERIFICATION REPORT');
  printLine('========================================');
  for (const res of results) {
    let statusIcon = '·';
    if (res.status === 'passed') {
      statusIcon = '✓';
    } else if (res.status === 'failed') {
      statusIcon = '✗';
    }
    const statusLabel = res.status.toUpperCase();
    const paddedName = res.name.padEnd(NAME_PADDING);
    printLine(` ${statusIcon} ${paddedName} [${statusLabel}] (${res.command})`);
  }
  printLine('========================================');
}

/** Options for executing a batch of gates. */
interface RunGatesOptions {
  gates: ActiveGate[];
  isGit: boolean;
  changedFiles: string[];
  cwd: string;
}

/** Coordinates running a batch of gate checks. */
function runGates(options: RunGatesOptions): { results: VerifyResult[]; hasFailures: boolean } {
  const { gates, isGit, changedFiles, cwd } = options;
  const results: VerifyResult[] = [];
  let hasFailures = false;

  for (const gate of gates) {
    const shouldRun = shouldRunGate({ gate, isGit, changedFiles });
    if (!shouldRun) {
      results.push({ name: gate.name, command: gate.run, status: 'skipped' });
      continue;
    }

    const execResult = executeGate(gate, cwd);
    if (execResult.status === 'failed') {
      hasFailures = true;
    }
    results.push({ name: gate.name, command: gate.run, status: execResult.status, error: execResult.error });
  }
  return { results, hasFailures };
}

/**
 * Core entry point for executing all active verification gates in the current workspace.
 * Discovers installed rulesets, detects changed files, runs matching gates, and reports summaries.
 */
export function runVerify(): void {
  const manifest = loadManifest();
  const cwd = process.cwd();
  const tool = detectTool(cwd);

  if (!tool) {
    console.error('Unable to auto-detect target tool in the current workspace.');
    process.exit(1);
  }

  const installed = manifest.entries.filter((entry) => isEntryInstalled(entry, { tool, cwd }));
  if (installed.length === 0) {
    console.log('No installed agent-directives or rulesets found in the current workspace.');
    return;
  }

  const gates = getInstalledGates(installed);
  if (gates.length === 0) {
    console.log('No verification gates defined in the installed directives/rulesets.');
    return;
  }

  console.log('Tool detected', { tool });
  console.log('Discovered verification gates from installed entries', { count: gates.length });

  const isGitRepo = hasGitRepo();
  const changedFiles = getModifiedFiles();

  if (isGitRepo && changedFiles === null) {
    console.error('Git status porcelain command failed inside a git work tree. Aborting verification to prevent silent false-positives.');
    process.exit(1);
  }

  const actualChanges = changedFiles ?? [];
  const isGit = actualChanges.length > 0 || isGitRepo;
  console.log('Git repository state', { isGit, count: actualChanges.length });

  const { results, hasFailures } = runGates({ gates, isGit, changedFiles: actualChanges, cwd });

  printReport(results);

  if (hasFailures) {
    printErrorLine('\n✗ Verification failed. One or more gates did not pass.');
    process.exit(1);
  } else {
    printLine('\n✓ Verification succeeded! All applicable gates passed.');
  }
}
