import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { packageRoot, type ManifestEntry } from './manifest.js';
import { TARGETS, type Tool } from './targets.js';

export type InstallStatus = 'installed' | 'skipped-identical' | 'skipped-conflict';

export interface InstallResult {
  status: InstallStatus;
  path: string;
  /** Results for any helper scripts installed alongside this entry. */
  scripts?: InstallResult[];
}

export interface InstallOptions {
  cwd: string;
  tool: Tool;
  force?: boolean;
}

const SCRIPT_MODE = 0o755;

// copyFile is the shared install primitive for both instruction files and helper
// scripts: identical content is a no-op, differing content is a conflict unless
// forced, and executables get their mode restored on every pass so a copy that
// lost the bit (e.g. via a prior non-executable write) is corrected.
function copyFile(opts: { sourceAbs: string; targetAbs: string; force?: boolean; executable?: boolean }): InstallResult {
  const { sourceAbs, targetAbs, force, executable } = opts;
  if (!existsSync(sourceAbs)) {
    throw new Error(`Source file not found: ${sourceAbs}`);
  }
  const sourceContent = readFileSync(sourceAbs, 'utf8');

  if (existsSync(targetAbs)) {
    const existing = readFileSync(targetAbs, 'utf8');
    if (existing === sourceContent) {
      if (executable) chmodSync(targetAbs, SCRIPT_MODE);
      return { status: 'skipped-identical', path: targetAbs };
    }
    if (!force) {
      return { status: 'skipped-conflict', path: targetAbs };
    }
  }

  mkdirSync(dirname(targetAbs), { recursive: true });
  writeFileSync(targetAbs, sourceContent);
  if (executable) chmodSync(targetAbs, SCRIPT_MODE);
  return { status: 'installed', path: targetAbs };
}

export function installEntry(entry: ManifestEntry, opts: InstallOptions): InstallResult {
  const result = copyFile({
    sourceAbs: join(packageRoot, entry.path),
    targetAbs: TARGETS[opts.tool].resolvePath(entry, opts.cwd),
    force: opts.force,
  });

  // Helper scripts always install under `.agents/<repo-path>` regardless of tool,
  // matching the `.agents/.../scripts/...` paths the instruction prose references.
  if (entry.scripts && entry.scripts.length > 0) {
    result.scripts = entry.scripts.map((scriptPath) =>
      copyFile({
        sourceAbs: join(packageRoot, scriptPath),
        targetAbs: join(opts.cwd, '.agents', scriptPath),
        force: opts.force,
        executable: true,
      }),
    );
  }

  return result;
}

/** True if the entry or any of its scripts is a blocking (unforced) conflict. */
export function hasConflict(result: InstallResult): boolean {
  if (result.status === 'skipped-conflict') return true;
  return (result.scripts ?? []).some((script) => script.status === 'skipped-conflict');
}

export function isEntryInstalled(entry: ManifestEntry, opts: { tool: Tool; cwd: string }): boolean {
  return existsSync(TARGETS[opts.tool].resolvePath(entry, opts.cwd));
}
