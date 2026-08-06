import { isEntryInstalled } from './install.js';
import { loadManifest } from './manifest.js';
import { detectTool } from './targets.js';
import { getInstalledGates, getModifiedFiles, hasGitRepo, runGates, type VerifyResult } from './verify-runtime.js';

export type { VerifyResult } from './verify-runtime.js';
export { getModifiedFiles } from './verify-runtime.js';

const NAME_PADDING = 30;

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
export function printVerifyReport(results: VerifyResult[]): void {
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

  printVerifyReport(results);

  if (hasFailures) {
    printErrorLine('\n✗ Verification failed. One or more gates did not pass.');
    process.exit(1);
  } else {
    printLine('\n✓ Verification succeeded! All applicable gates passed.');
  }
}
