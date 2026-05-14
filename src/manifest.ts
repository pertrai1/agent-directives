import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ManifestEntry {
  id: string;
  type: 'directive' | 'skill';
  path: string;
  description: string;
  version: string;
  required: boolean;
  category: string;
  tools: string[];
}

export interface Manifest {
  version: string;
  entries: ManifestEntry[];
}

export interface FilterOptions {
  category?: string;
  required?: boolean;
  tool?: string;
  type?: 'directive' | 'skill';
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
export const packageRoot = join(moduleDir, '..');

export function loadManifest(): Manifest {
  const manifestPath = join(packageRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}. Run 'npm run manifest' to generate it.`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
}

export function filterEntries(entries: ManifestEntry[], opts: FilterOptions): ManifestEntry[] {
  return entries.filter((entry) => {
    if (opts.category && entry.category !== opts.category) return false;
    if (opts.required !== undefined && entry.required !== opts.required) return false;
    if (opts.tool && !entry.tools.includes(opts.tool)) return false;
    if (opts.type && entry.type !== opts.type) return false;
    return true;
  });
}

export function findEntry(entries: ManifestEntry[], id: string): ManifestEntry | undefined {
  return entries.find((entry) => entry.id === id);
}
