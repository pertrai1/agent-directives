import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ManifestEntryType = 'directive' | 'skill' | 'rule' | 'template';

export interface ManifestRouting {
  triggers?: string[];
  commonPaths?: string[];
  capabilityTags?: string[];
  dependsAfter?: string[];
  oftenComposesWith?: string[];
}

export interface ManifestEntry {
  id: string;
  type: ManifestEntryType;
  path: string;
  description: string;
  version: string;
  required: boolean;
  category: string;
  tools: string[];
  applies_to?: string[];
  routing?: ManifestRouting;
  /** Repo-relative paths to helper scripts installed alongside this entry (under `.agents/`). */
  scripts?: string[];
  /** Repo-relative non-executable companion files installed alongside this entry (under `.agents/`). */
  assets?: string[];
}

export interface Manifest {
  version: string;
  entries: ManifestEntry[];
}

export interface FilterOptions {
  category?: string;
  required?: boolean;
  tool?: string;
  type?: ManifestEntryType;
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
