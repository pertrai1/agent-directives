import { basename } from 'node:path';
import type { InstallResult, InstallStatus } from './install.js';
import type { ManifestEntry } from './manifest.js';

export interface InstallSummary {
  installed: number;
  identical: number;
  conflict: number;
}

const ENTRY_REPORTERS: Record<InstallStatus, (entry: ManifestEntry, result: InstallResult) => void> = {
  installed: (entry) => console.log(`  ✓ ${entry.id}`),
  'skipped-identical': (entry) => console.log(`  = ${entry.id} (already up-to-date)`),
  'skipped-conflict': (entry, result) => console.error(`  ✗ ${entry.id} (conflict: ${result.path})`),
};

function reportEntry(entry: ManifestEntry, result: InstallResult): void {
  if (!result.blocked) {
    ENTRY_REPORTERS[result.status](entry, result);
    return;
  }
  const conflict = [result, ...(result.scripts ?? [])].find((item) => item.status === 'skipped-conflict');
  console.error(`  ✗ ${entry.id} (blocked by conflict: ${conflict?.path}; no files changed)`);
}

function reportScript(result: InstallResult, script: InstallResult): void {
  if (script.status === 'skipped-conflict') {
    console.error(`    ↳ script conflict: ${script.path}`);
    return;
  }
  if (!result.blocked && script.status === 'installed') {
    console.log(`    ↳ script ${basename(script.path)}`);
  }
}

// reportInstall prints one line per entry plus an indented sub-line for each
// helper script that was installed or conflicted (identical scripts stay quiet).
export function reportInstall(entry: ManifestEntry, result: InstallResult): void {
  reportEntry(entry, result);
  for (const script of result.scripts ?? []) {
    reportScript(result, script);
  }
}

// tallySummary folds the entry status and every helper-script status into the
// running summary so the final counts and the --force exit gate include scripts.
export function tallySummary(summary: InstallSummary, result: InstallResult): void {
  if (result.blocked) {
    for (const status of [result.status, ...(result.scripts ?? []).map((script) => script.status)]) {
      if (status === 'skipped-conflict') addStatus(summary, status);
    }
    return;
  }
  for (const status of [result.status, ...(result.scripts ?? []).map((script) => script.status)]) {
    addStatus(summary, status);
  }
}

function addStatus(summary: InstallSummary, status: InstallStatus): void {
  if (status === 'installed') summary.installed += 1;
  else if (status === 'skipped-identical') summary.identical += 1;
  else summary.conflict += 1;
}
