import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { hashEntries } from './hash-entries.js';
import type { BenchmarkGate, ProtectedInputEvidence } from './benchmark-types.js';

type Entry = { path: string; contents: Buffer };

function protectedEntries(workspace: string, protectedPaths: string[]): Entry[] {
  const root = resolve(workspace);
  const entries: Entry[] = [];
  const visit = (path: string): void => {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat || stat.isSymbolicLink()) throw new Error(`protected benchmark input is missing or unsafe: ${relative(root, path)}`);
    if (stat.isDirectory()) {
      entries.push({ path: `directory:${relative(root, path).replaceAll('\\', '/')}`, contents: Buffer.alloc(0) });
      for (const name of readdirSync(path).sort()) visit(join(path, name));
      return;
    }
    if (!stat.isFile() || stat.nlink > 1) throw new Error(`protected benchmark input is not an immutable regular file: ${relative(root, path)}`);
    entries.push({ path: `file:${relative(root, path).replaceAll('\\', '/')}`, contents: readFileSync(path) });
  };
  for (const declared of protectedPaths) {
    const path = resolve(root, declared);
    if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error(`protected benchmark input escapes workspace: ${declared}`);
    visit(path);
  }
  const sorted = entries.sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(sorted.map((entry) => entry.path)).size !== sorted.length) throw new Error('protected benchmark input paths overlap');
  return sorted;
}

/** Captures the exact fixture-owned files that must not be changed by an attempt. */
export function captureProtectedInputs(workspace: string, gates: BenchmarkGate[]): ProtectedInputEvidence[] {
  return gates.map((gate) => ({ paths: [...gate.protected_paths], sha256: hashEntries(protectedEntries(workspace, gate.protected_paths)) }));
}
