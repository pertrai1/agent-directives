import { isEntryInstalled } from './install.js';
import { loadManifest } from './manifest.js';
import { detectTool } from './targets.js';
import { getInstalledGates, getModifiedFiles, hasGitRepo, runGates, type VerifyResult } from './verify-runtime.js';

export interface VerifyRunReport {
  status: 'passed' | 'failed' | 'error';
  exitCode: 0 | 1 | 2;
  tool: string | null;
  changedFiles: string[];
  results: VerifyResult[];
  message?: string;
}

export interface CollectVerifyResultsOptions {
  cwd: string;
}

function emptyReport(options: {
  status: 'passed' | 'error';
  exitCode: 0 | 2;
  tool: string | null;
  message: string;
}): VerifyRunReport {
  return { ...options, changedFiles: [], results: [] };
}

export function collectVerifyResults(options: CollectVerifyResultsOptions): VerifyRunReport {
  const { cwd } = options;
  const tool = detectTool(cwd);
  if (!tool) {
    return emptyReport({ status: 'error', exitCode: 2, tool: null, message: 'Unable to auto-detect target tool in the current workspace.' });
  }
  const manifest = loadManifest();
  const installed = manifest.entries.filter((entry) => isEntryInstalled(entry, { tool, cwd }));
  if (installed.length === 0) {
    return emptyReport({ status: 'passed', exitCode: 0, tool, message: 'No installed agent-directives or rulesets found in the current workspace.' });
  }
  const gates = getInstalledGates(installed);
  if (gates.length === 0) {
    return emptyReport({ status: 'passed', exitCode: 0, tool, message: 'No verification gates defined in the installed directives/rulesets.' });
  }
  const isGit = hasGitRepo(cwd);
  const changedFiles = getModifiedFiles(cwd);
  if (isGit && changedFiles === null) {
    return emptyReport({ status: 'error', exitCode: 2, tool, message: 'Git status porcelain command failed inside a git work tree.' });
  }
  const actualChanges = changedFiles ?? [];
  const execution = runGates({ gates, isGit, changedFiles: actualChanges, cwd, captureOutput: true });
  const executedResults = execution.results.filter((result) => result.status !== 'skipped');
  return {
    status: execution.hasFailures ? 'failed' : 'passed',
    exitCode: execution.hasFailures ? 1 : 0,
    tool,
    changedFiles: actualChanges,
    results: executedResults,
  };
}
