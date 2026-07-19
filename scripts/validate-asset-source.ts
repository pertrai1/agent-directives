import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { isSafeRepoRelativePath } from '../src/is-safe-repo-relative-path.js';
import { resolveSafePathWithinRoot } from '../src/resolve-safe-path-within-root.js';

interface ValidateAssetSourceOptions {
  repoRoot: string;
  entryPath: string;
  asset: string;
}

export function validateAssetSource({ repoRoot, entryPath, asset }: ValidateAssetSourceOptions): string | undefined {
  if (!isSafeRepoRelativePath(asset)) {
    return `${entryPath}: asset path '${asset}' must be repo-relative without '..'`;
  }
  const dir = entryPath.includes('/') ? entryPath.slice(0, entryPath.lastIndexOf('/')) : '.';
  const relative = `${dir}/${asset}`;
  const source = resolveSafePathWithinRoot({ root: repoRoot, candidate: join(repoRoot, relative), requireParents: true });
  if (!source) return `${entryPath}: declared asset has an unsafe source path: ${relative}`;
  const stat = existsSync(source) ? lstatSync(source) : undefined;
  if (!stat?.isFile() || stat.size === 0) {
    return `${entryPath}: declared asset must be a non-empty regular file: ${relative}`;
  }
  return undefined;
}
