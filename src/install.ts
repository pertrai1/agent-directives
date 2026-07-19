import { chmodSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageRoot, type ManifestEntry } from './manifest.js';
import { isSafeRepoRelativePath } from './is-safe-repo-relative-path.js';
import { resolveSafePathWithinRoot } from './resolve-safe-path-within-root.js';
import { TARGETS, type Tool } from './targets.js';

export type InstallStatus = 'installed' | 'skipped-identical' | 'skipped-conflict';

export interface InstallResult {
  status: InstallStatus;
  path: string;
  /** Results for any helper scripts installed alongside this entry. */
  scripts?: InstallResult[];
  /** Results for any non-executable companion assets installed alongside this entry. */
  assets?: InstallResult[];
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
  sourceRoot: string;
  sourceAbs: string;
  targetRoot: string;
  targetAbs: string;
  force?: boolean;
  executable?: boolean;
  nonEmptySource?: boolean;
}

function lstatOrUndefined(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function readValidatedSource({ sourceRoot, sourceAbs, nonEmptySource }: CopyFileOptions): string {
  const safeSource = resolveSafePathWithinRoot({
    root: sourceRoot,
    candidate: sourceAbs,
    requireParents: true,
  });
  const source = safeSource ? lstatOrUndefined(safeSource) : undefined;
  if (!safeSource || !source?.isFile() || (nonEmptySource && source.size === 0)) {
    throw new Error(`Source file is missing, empty, or not regular: ${sourceAbs}`);
  }
  return readFileSync(safeSource, 'utf8');
}

function inspectTarget({ targetRoot, targetAbs, sourceContent, force }: { targetRoot: string; targetAbs: string; sourceContent: string; force?: boolean }): InstallResult {
  const safeTarget = resolveSafePathWithinRoot({ root: targetRoot, candidate: targetAbs });
  if (!safeTarget) return { status: 'skipped-conflict', path: targetAbs };
  const target = lstatOrUndefined(safeTarget);
  if (!target) return { status: 'installed', path: targetAbs };
  if (target.isSymbolicLink()) return { status: force ? 'installed' : 'skipped-conflict', path: targetAbs };
  if (!target.isFile()) return { status: 'skipped-conflict', path: targetAbs };
  const existing = readFileSync(safeTarget, 'utf8');
  if (existing === sourceContent) return { status: 'skipped-identical', path: targetAbs };
  return { status: force ? 'installed' : 'skipped-conflict', path: targetAbs };
}

function inspectFile(opts: CopyFileOptions): InstallResult {
  return inspectTarget({ targetRoot: opts.targetRoot, targetAbs: opts.targetAbs, sourceContent: readValidatedSource(opts), force: opts.force });
}

// copyFile is the shared install primitive for both instruction files and helper
// scripts: identical content is a no-op, differing content is a conflict unless
// forced, and executables get their mode restored on every pass so a copy that
// lost the bit (e.g. via a prior non-executable write) is corrected.
function copyFile(opts: CopyFileOptions, planned = inspectFile(opts)): InstallResult {
  const { targetRoot, targetAbs, executable } = opts;
  const sourceContent = readValidatedSource(opts);
  if (planned.status === 'skipped-conflict') return planned;
  const safeTarget = resolveSafePathWithinRoot({ root: targetRoot, candidate: targetAbs, createParents: true });
  if (!safeTarget) throw new Error(`Refusing unsafe install target: ${targetAbs}`);
  if (planned.status === 'installed') {
    const target = lstatOrUndefined(safeTarget);
    if (target?.isSymbolicLink()) unlinkSync(safeTarget);
    else if (target && !target.isFile()) {
      throw new Error(`Refusing to replace non-regular install target: ${targetAbs}`);
    }
    writeFileSync(safeTarget, sourceContent);
  }
  if (executable) chmodSync(safeTarget, SCRIPT_MODE);
  return planned;
}

function assertSafeAssetPath(assetPath: string): void {
  if (!isSafeRepoRelativePath(assetPath)) {
    throw new Error(`Unsafe companion asset path '${assetPath}' in manifest entry`);
  }
}

function isRegularFile(path: string, nonEmpty = false): boolean {
  const stat = lstatOrUndefined(path);
  return Boolean(stat?.isFile() && (!nonEmpty || stat.size > 0));
}

export function installEntry(entry: ManifestEntry, opts: InstallOptions): InstallResult {
  const primary: CopyFileOptions = {
    sourceRoot: packageRoot,
    sourceAbs: join(packageRoot, entry.path),
    targetRoot: opts.cwd,
    targetAbs: TARGETS[opts.tool].resolvePath(entry, opts.cwd),
    force: opts.force,
  };

  // Helper scripts always install under `.agents/<repo-path>` regardless of tool,
  // matching the `.agents/.../scripts/...` paths the instruction prose references.
  const scriptCopies: CopyFileOptions[] = (entry.scripts ?? []).map((scriptPath) => ({
    sourceRoot: packageRoot,
    sourceAbs: join(packageRoot, scriptPath),
    targetRoot: opts.cwd,
    targetAbs: join(opts.cwd, '.agents', scriptPath),
    force: opts.force,
    executable: true,
  }));
  const assetCopies: CopyFileOptions[] = (entry.assets ?? []).map((assetPath) => {
    assertSafeAssetPath(assetPath);
    return {
      sourceRoot: packageRoot,
      sourceAbs: join(packageRoot, assetPath),
      targetRoot: opts.cwd,
      targetAbs: join(opts.cwd, '.agents', assetPath),
      force: opts.force,
      nonEmptySource: true,
    };
  });
  const copies = [primary, ...scriptCopies, ...assetCopies];
  const plans = copies.map((copy) => inspectFile(copy));
  const [result, ...companions] = plans;
  const scriptResults = companions.slice(0, scriptCopies.length);
  const assetResults = companions.slice(scriptCopies.length);
  if (scriptResults.length > 0) result.scripts = scriptResults;
  if (assetResults.length > 0) result.assets = assetResults;

  if (hasConflict(result)) {
    result.blocked = true;
    return result;
  }

  copies.forEach((copy, index) => copyFile(copy, plans[index]));

  return result;
}

/** True if the entry or any companion is a blocking (unforced) conflict. */
export function hasConflict(result: InstallResult): boolean {
  if (result.status === 'skipped-conflict') return true;
  return [...(result.scripts ?? []), ...(result.assets ?? [])].some((companion) => companion.status === 'skipped-conflict');
}

export function isEntryInstalled(entry: ManifestEntry, opts: { tool: Tool; cwd: string }): boolean {
  const copies: CopyFileOptions[] = [
    {
      sourceRoot: packageRoot,
      sourceAbs: join(packageRoot, entry.path),
      targetRoot: opts.cwd,
      targetAbs: TARGETS[opts.tool].resolvePath(entry, opts.cwd),
    },
    ...(entry.scripts ?? []).map((scriptPath) => ({
      sourceRoot: packageRoot,
      sourceAbs: join(packageRoot, scriptPath),
      targetRoot: opts.cwd,
      targetAbs: join(opts.cwd, '.agents', scriptPath),
    })),
    ...(entry.assets ?? []).map((assetPath) => {
      assertSafeAssetPath(assetPath);
      return {
        sourceRoot: packageRoot,
        sourceAbs: join(packageRoot, assetPath),
        targetRoot: opts.cwd,
        targetAbs: join(opts.cwd, '.agents', assetPath),
        nonEmptySource: true,
      };
    }),
  ];
  return copies.every((copy) => {
    const source = resolveSafePathWithinRoot({ root: copy.sourceRoot, candidate: copy.sourceAbs, requireParents: true });
    const target = resolveSafePathWithinRoot({ root: copy.targetRoot, candidate: copy.targetAbs, requireParents: true });
    return Boolean(source && target
      && isRegularFile(source, copy.nonEmptySource)
      && isRegularFile(target)
      && readFileSync(source, 'utf8') === readFileSync(target, 'utf8'));
  });
}
