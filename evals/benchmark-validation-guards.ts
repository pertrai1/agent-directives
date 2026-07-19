export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function matches(value: unknown, expression: RegExp): boolean {
  return typeof value === 'string' && expression.test(value);
}

export function arrayError({ value, label, nonempty = true }: { value: unknown; label: string; nonempty?: boolean }): string | undefined {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) return `${label} must be ${nonempty ? 'a non-empty array' : 'an array'}`;
  return undefined;
}

export function recordArrayError({ value, label, nonempty = true }: { value: unknown; label: string; nonempty?: boolean }): string | undefined {
  const error = arrayError({ value, label, nonempty });
  if (error) return error;
  return (value as unknown[]).some((entry) => !isRecord(entry)) ? `${label} entries must be objects` : undefined;
}

export function relativePathError(value: unknown, label: string): string | undefined {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || value.includes('\u0000') || value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) return `${label} must be a non-empty repository-relative path`;
  const normalized = value.replaceAll('\\', '/');
  return normalized.split('/').some((part) => part === '..' || part.length === 0) ? `${label} escapes its root` : undefined;
}

export function instructionSurfacePathErrors(instructionSurface: unknown): string[] {
  if (!isRecord(instructionSurface) || !Array.isArray(instructionSurface.paths) || instructionSurface.paths.length === 0) return ['instruction surface must declare installed paths'];
  const errors = instructionSurface.paths.map((path) => relativePathError(path, 'instruction surface path')).filter((error): error is string => Boolean(error));
  if (errors.length) return errors;
  const normalized = instructionSurface.paths.map((path) => path.replaceAll('\\', '/'));
  for (let index = 0; index < normalized.length; index += 1) {
    for (let other = index + 1; other < normalized.length; other += 1) {
      if (normalized[index] === normalized[other]) errors.push(`instruction surface path is duplicated: ${normalized[index]}`);
      if (normalized[index].startsWith(`${normalized[other]}/`) || normalized[other].startsWith(`${normalized[index]}/`)) errors.push(`instruction surface paths overlap: ${normalized[index]} and ${normalized[other]}`);
    }
  }
  return errors;
}
