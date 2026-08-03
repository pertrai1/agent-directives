/**
 * Converts a glob pattern string into a strict RegExp.
 * Handles double-asterisk matching globally and standard wildcard characters.
 *
 * @param glob The glob pattern to convert.
 * @returns A RegExp corresponding to the glob matching logic.
 */
export function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped
    .replace(/\*\*/g, '__DBL_STAR__')
    .replace(/\*(?!\*)/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/__DBL_STAR__\//g, '(?:.*/)?')
    .replace(/__DBL_STAR__/g, '.*');
  return new RegExp(`^${regexStr}$`);
}

/**
 * Checks if a candidate path matches a given glob pattern.
 *
 * @param path The candidate relative file path to test.
 * @param glob The glob pattern to match against.
 * @returns True if the path matches the glob.
 */
export function matchGlob(path: string, glob: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').replace(/^\.\//, '');
  const normalizedGlob = glob.replace(/\\/g, '/').replace(/^\.\//, '');
  return globToRegex(normalizedGlob).test(normalizedPath);
}
