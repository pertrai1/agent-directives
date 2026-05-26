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
  entries: ManifestEntry[];
}

function parseFrontmatter(text: string): Record<string, unknown> {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return {};
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const raw = normalized.slice(4, end);
  const result: Record<string, unknown> = {};
  let i = 0;
  const lines = raw.split('\n');
  while (i < lines.length) {
    const line = lines[i];
    const scalar = line.match(/^(\w[\w-]*):\s+(.+)$/);
    if (scalar) {
      const val = scalar[2].replace(/^['"]|['"]$/g, '');
      if (val === 'true') {
        result[scalar[1]] = true;
      } else if (val === 'false') {
        result[scalar[1]] = false;
      } else {
        result[scalar[1]] = val;
      }
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
  const { description, version, required, category, tools } = fm;

  if (!id) throw new Error(`Missing 'name' in ${path}`);
  if (typeof description !== 'string' || !description) throw new Error(`Missing/invalid 'description' in ${path}`);
  if (typeof version !== 'string' || !version) throw new Error(`Missing/invalid 'version' in ${path}`);
  if (typeof required !== 'boolean') throw new Error(`Missing/invalid 'required' in ${path}`);
  if (typeof category !== 'string' || !category) throw new Error(`Missing/invalid 'category' in ${path}`);
  if (!Array.isArray(tools) || tools.length === 0 || tools.some((t) => typeof t !== 'string')) {
    throw new Error(`Missing/invalid 'tools' in ${path}`);
  }

  return { id, type, path, description, version, required, category, tools: tools as string[] };
}

const directives = readdirSync(join(repoRoot, 'directives'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => readEntry(`directives/${f}`, 'directive'));

const skills = readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => readEntry(`skills/${e.name}/SKILL.md`, 'skill'));

const manifest: Manifest = {
  version: '1.0.0',
  entries: [...directives, ...skills],
};

const outPath = join(repoRoot, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json written — ${manifest.entries.length} entries (${directives.length} directives, ${skills.length} skills)`);
