import { lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

interface ResolveSafePathOptions {
  root: string;
  candidate: string;
  createParents?: boolean;
  requireParents?: boolean;
}

function lstatOrUndefined(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot === '' || (!isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`));
}

function resolveMissingParent({ options, realRoot, current, remaining }: {
  options: ResolveSafePathOptions;
  realRoot: string;
  current: string;
  remaining: string[];
}): string | undefined {
  if (options.requireParents) return undefined;
  if (!options.createParents) return resolve(current, ...remaining);
  const next = resolve(current, remaining[0]);
  mkdirSync(next);
  const stat = lstatOrUndefined(next);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) return undefined;
  const created = realpathSync(next);
  return isContained(realRoot, created) ? created : undefined;
}

function resolveSafeParent({ options, realRoot, components }: {
  options: ResolveSafePathOptions;
  realRoot: string;
  components: string[];
}): string | undefined {
  let current = realRoot;
  for (let index = 0; index < components.length; index += 1) {
    const next = resolve(current, components[index]);
    if (!isContained(realRoot, next)) return undefined;
    const stat = lstatOrUndefined(next);
    if (!stat) {
      const missing = resolveMissingParent({ options, realRoot, current, remaining: components.slice(index) });
      if (!missing || !options.createParents) return missing;
      current = missing;
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) return undefined;
    current = realpathSync(next);
    if (!isContained(realRoot, current)) return undefined;
  }
  return current;
}

/**
 * Resolve a file path against a trusted root without following symlinked or
 * non-directory ancestors. Returned paths use the root's real location so a
 * later write cannot be redirected by replacing an already-checked ancestor.
 */
export function resolveSafePathWithinRoot(options: ResolveSafePathOptions): string | undefined {
  const root = resolve(options.root);
  const candidate = resolve(options.candidate);
  if (candidate === root || !isContained(root, candidate)) return undefined;

  const rootStat = lstatOrUndefined(root);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) return undefined;
  const realRoot = realpathSync(root);
  const parentFromRoot = relative(root, dirname(candidate));
  const components = parentFromRoot === '' ? [] : parentFromRoot.split(sep);
  const safeParent = resolveSafeParent({ options, realRoot, components });
  return safeParent ? resolve(safeParent, basename(candidate)) : undefined;
}
