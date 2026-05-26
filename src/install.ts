import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { packageRoot, type ManifestEntry } from './manifest.js';
import { TARGETS, type Tool } from './targets.js';

export type InstallStatus = 'installed' | 'skipped-identical' | 'skipped-conflict';

export interface InstallResult {
  status: InstallStatus;
  path: string;
}

export interface InstallOptions {
  cwd: string;
  tool: Tool;
  force?: boolean;
}

export function installEntry(entry: ManifestEntry, opts: InstallOptions): InstallResult {
  const sourcePath = join(packageRoot, entry.path);
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  const sourceContent = readFileSync(sourcePath, 'utf8');
  const targetPath = TARGETS[opts.tool].resolvePath(entry, opts.cwd);

  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath, 'utf8');
    if (existing === sourceContent) {
      return { status: 'skipped-identical', path: targetPath };
    }
    if (!opts.force) {
      return { status: 'skipped-conflict', path: targetPath };
    }
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, sourceContent);
  return { status: 'installed', path: targetPath };
}

export function isEntryInstalled(entry: ManifestEntry, opts: { tool: Tool; cwd: string }): boolean {
  return existsSync(TARGETS[opts.tool].resolvePath(entry, opts.cwd));
}
