#!/usr/bin/env tsx
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

interface ManifestEntry {
  id: string;
  type: 'directive' | 'skill';
  path: string;
  description: string;
  version: string;
  required: boolean;
  category: string;
  tools: string[];
}

interface Manifest {
  version: string;
  generated: string;
  entries: ManifestEntry[];
}

function parseFrontmatter(text: string): Record<string, unknown> {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const raw = text.slice(4, end);
  const result: Record<string, unknown> = {};
  let i = 0;
  const lines = raw.split('\n');
  while (i < lines.length) {
    const line = lines[i];
    const scalar = line.match(/^(\w[\w-]*):\s+(.+)$/);
    if (scalar) {
      const val = scalar[2].replace(/^['"]|['"]$/g, '');
      result[scalar[1]] = val === 'true' ? true : val === 'false' ? false : val;
      i++;
      continue;
    }
    const listKey = line.match(/^(\w[\w-]*):\s*$/);
    if (listKey) {
      const items: string[] = [];
      i++;
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        items.push(lines[i].replace(/^\s+-\s+/, '').replace(/^['"]|['"]$/g, ''));
        i++;
      }
      result[listKey[1]] = items;
      continue;
    }
    i++;
  }
  return result;
}

function readEntry(path: string, type: 'directive' | 'skill'): ManifestEntry {
  const text = readFileSync(join(repoRoot, path), 'utf8');
  const fm = parseFrontmatter(text);
  const id = String(fm.name ?? '').replace(/^['"]|['"]$/g, '');
  return {
    id,
    type,
    path,
    description: String(fm.description ?? ''),
    version: String(fm.version ?? ''),
    required: fm.required === true,
    category: String(fm.category ?? ''),
    tools: Array.isArray(fm.tools) ? (fm.tools as string[]) : [],
  };
}

const directives = readdirSync(join(repoRoot, 'directives'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => readEntry(`directives/${f}`, 'directive'));

const skills = readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => readEntry(`skills/${e.name}/SKILL.md`, 'skill'));

const manifest: Manifest = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  entries: [...directives, ...skills],
};

const outPath = join(repoRoot, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json written — ${manifest.entries.length} entries (${directives.length} directives, ${skills.length} skills)`);
