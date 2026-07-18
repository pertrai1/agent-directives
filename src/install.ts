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
  /** True when conflict preflight prevented every planned write for the entry. */
  blocked?: boolean;
}

export interface InstallOptions {
  cwd: string;
  tool: Tool;
  force?: boolean;
}

const SCRIPT_MODE = 0o755;

interface CopyFileOptions {
  sourceAbs: string;
  targetAbs: string;
  force?: boolean;
  executable?: boolean;
}

function inspectFile({ sourceAbs, targetAbs, force }: CopyFileOptions): InstallResult {
  if (!existsSync(sourceAbs)) throw new Error(`Source file not found: ${sourceAbs}`);
  const sourceContent = readFileSync(sourceAbs, 'utf8');
  if (!existsSync(targetAbs)) return { status: 'installed', path: targetAbs };
  const existing = readFileSync(targetAbs, 'utf8');
  if (existing === sourceContent) return { status: 'skipped-identical', path: targetAbs };
  return { status: force ? 'installed' : 'skipped-conflict', path: targetAbs };
}

// copyFile is the shared install primitive for both instruction files and helper
// scripts: identical content is a no-op, differing content is a conflict unless
// forced, and executables get their mode restored on every pass so a copy that
// lost the bit (e.g. via a prior non-executable write) is corrected.
function copyFile(opts: CopyFileOptions, planned = inspectFile(opts)): InstallResult {
  const { sourceAbs, targetAbs, executable } = opts;
  const sourceContent = readFileSync(sourceAbs, 'utf8');
  if (planned.status === 'skipped-conflict') return planned;
  if (planned.status === 'installed') {
    mkdirSync(dirname(targetAbs), { recursive: true });
    writeFileSync(targetAbs, sourceContent);
  }
  if (executable) chmodSync(targetAbs, SCRIPT_MODE);
  return planned;
}

export function installEntry(entry: ManifestEntry, opts: InstallOptions): InstallResult {
  const primary: CopyFileOptions = {
    sourceAbs: join(packageRoot, entry.path),
    targetAbs: TARGETS[opts.tool].resolvePath(entry, opts.cwd),
    force: opts.force,
  };

  // Helper scripts always install under `.agents/<repo-path>` regardless of tool,
  // matching the `.agents/.../scripts/...` paths the instruction prose references.
  const scriptCopies: CopyFileOptions[] = (entry.scripts ?? []).map((scriptPath) => ({
    sourceAbs: join(packageRoot, scriptPath),
    targetAbs: join(opts.cwd, '.agents', scriptPath),
    force: opts.force,
    executable: true,
  }));
  const copies = [primary, ...scriptCopies];
  const plans = copies.map((copy) => inspectFile(copy));
  const [result, ...scriptResults] = plans;
  if (scriptResults.length > 0) result.scripts = scriptResults;

  if (hasConflict(result)) {
    result.blocked = true;
    return result;
  }

  copies.forEach((copy, index) => copyFile(copy, plans[index]));

  return result;
}

/** True if the entry or any of its scripts is a blocking (unforced) conflict. */
export function hasConflict(result: InstallResult): boolean {
  if (result.status === 'skipped-conflict') return true;
  return (result.scripts ?? []).some((script) => script.status === 'skipped-conflict');
}

export function isEntryInstalled(entry: ManifestEntry, opts: { tool: Tool; cwd: string }): boolean {
  if (!existsSync(TARGETS[opts.tool].resolvePath(entry, opts.cwd))) return false;
  return (entry.scripts ?? []).every((scriptPath) => existsSync(join(opts.cwd, '.agents', scriptPath)));
}
