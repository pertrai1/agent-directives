import { posix } from 'node:path';

const WINDOWS_DRIVE_PREFIX = /^[A-Za-z]:/;

/**
 * Repository metadata uses portable POSIX-relative paths. Reject alternate
 * separators, drive paths, normalization changes, and parent traversal before
 * joining a companion path to either packageRoot or `.agents`.
 */
export function isSafeRepoRelativePath(path: string): boolean {
  if (!path || path.includes('\\') || WINDOWS_DRIVE_PREFIX.test(path) || posix.isAbsolute(path)) return false;
  const normalized = posix.normalize(path);
  return normalized === path && normalized !== '.' && !normalized.startsWith('../') && normalized !== '..';
}
