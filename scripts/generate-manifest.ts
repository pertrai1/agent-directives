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

function requireString(value: unknown, key: string, path: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing/invalid '${key}' in ${path}`);
  return value;
}

function requireBoolean(value: unknown, key: string, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Missing/invalid '${key}' in ${path}`);
  return value;
}

function requireStringArray(value: unknown, key: string, path: string): string[] {
  const ok = Array.isArray(value) && value.length > 0 && value.every((t) => typeof t === 'string');
  if (!ok) throw new Error(`Missing/invalid '${key}' in ${path}`);
  return value as string[];
}

function readEntry(path: string, type: 'directive' | 'skill'): ManifestEntry {
  const text = readFileSync(join(repoRoot, path), 'utf8');
  const fm = parseFrontmatter(text);
  const id = String(fm.name ?? '').replace(/^['"]|['"]$/g, '');
  if (!id) throw new Error(`Missing 'name' in ${path}`);
  return {
    id,
    type,
    path,
    description: requireString(fm.description, 'description', path),
    version: requireString(fm.version, 'version', path),
    required: requireBoolean(fm.required, 'required', path),
    category: requireString(fm.category, 'category', path),
    tools: requireStringArray(fm.tools, 'tools', path),
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
  entries: [...directives, ...skills],
};

const outPath = join(repoRoot, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json written — ${manifest.entries.length} entries (${directives.length} directives, ${skills.length} skills)`);
