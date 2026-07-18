import type { InstallResult, InstallStatus } from './install.js';
import type { ManifestEntry } from './manifest.js';

export interface InstallSummary {
  installed: number;
  identical: number;
  conflict: number;
}

// reportInstall prints one line per entry plus an indented sub-line for each
// helper script that was installed or conflicted (identical scripts stay quiet).
export function reportInstall(entry: ManifestEntry, result: InstallResult): void {
  switch (result.status) {
    case 'installed':
      console.log(`  ✓ ${entry.id}`);
      break;
    case 'skipped-identical':
      console.log(`  = ${entry.id} (already up-to-date)`);
      break;
    case 'skipped-conflict':
      console.error(`  ✗ ${entry.id} (conflict: ${result.path})`);
      break;
  }
  for (const script of result.scripts ?? []) {
    if (script.status === 'installed') console.log(`    ↳ script ${script.path.split('/').at(-1)}`);
    else if (script.status === 'skipped-conflict') console.error(`    ↳ script conflict: ${script.path}`);
  }
}

// tallySummary folds the entry status and every helper-script status into the
// running summary so the final counts and the --force exit gate include scripts.
export function tallySummary(summary: InstallSummary, result: InstallResult): void {
  for (const status of [result.status, ...(result.scripts ?? []).map((script) => script.status)]) {
    addStatus(summary, status);
  }
}

function addStatus(summary: InstallSummary, status: InstallStatus): void {
  if (status === 'installed') summary.installed += 1;
  else if (status === 'skipped-identical') summary.identical += 1;
  else summary.conflict += 1;
}
