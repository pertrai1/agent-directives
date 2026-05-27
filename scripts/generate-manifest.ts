#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

type ManifestEntryType = 'directive' | 'skill' | 'rule';

interface ManifestEntry {
  id: string;
  type: ManifestEntryType;
  path: string;
  description: string;
  version: string;
  required: boolean;
  category: string;
  tools: string[];
  applies_to?: string[];
}

interface Manifest {
  version: string;
  entries: ManifestEntry[];
}

const FRONTMATTER_OPEN_LENGTH = 4;

function parseFrontmatter(text: string): Record<string, unknown> {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return {};
  const end = normalized.indexOf('\n---\n', FRONTMATTER_OPEN_LENGTH);
  if (end === -1) return {};
  const raw = normalized.slice(FRONTMATTER_OPEN_LENGTH, end);
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

interface FieldContext {
  key: string;
  path: string;
}

function requireString(value: unknown, ctx: FieldContext): string {
  if (typeof value !== 'string' || !value) throw new Error(`Missing/invalid '${ctx.key}' in ${ctx.path}`);
  return value;
}

function requireBoolean(value: unknown, ctx: FieldContext): boolean {
  if (typeof value !== 'boolean') throw new Error(`Missing/invalid '${ctx.key}' in ${ctx.path}`);
  return value;
}

function requireStringArray(value: unknown, ctx: FieldContext): string[] {
  const ok = Array.isArray(value) && value.length > 0 && value.every((t) => typeof t === 'string');
  if (!ok) throw new Error(`Missing/invalid '${ctx.key}' in ${ctx.path}`);
  return value as string[];
}

function readEntry(path: string, type: ManifestEntryType): ManifestEntry {
  const text = readFileSync(join(repoRoot, path), 'utf8');
  const fm = parseFrontmatter(text);
  const id = String(fm.name ?? '').replace(/^['"]|['"]$/g, '');
  if (!id) throw new Error(`Missing 'name' in ${path}`);
  const entry: ManifestEntry = {
    id,
    type,
    path,
    description: requireString(fm.description, { key: 'description', path }),
    version: requireString(fm.version, { key: 'version', path }),
    required: requireBoolean(fm.required, { key: 'required', path }),
    category: requireString(fm.category, { key: 'category', path }),
    tools: requireStringArray(fm.tools, { key: 'tools', path }),
  };
  // applies_to is optional and only present on file-scoped entries (most rules).
  // Surfacing it here makes manifest.json a self-sufficient discovery index so
  // the routing directive does not need to enumerate every rule inline.
  if (Array.isArray(fm.applies_to) && fm.applies_to.length > 0 && fm.applies_to.every((p) => typeof p === 'string')) {
    entry.applies_to = fm.applies_to as string[];
  }
  return entry;
}

const directives = readdirSync(join(repoRoot, 'directives'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => readEntry(`directives/${f}`, 'directive'));

function readMarkdownEntries(rootDir: string, type: ManifestEntryType): ManifestEntry[] {
  const dir = join(repoRoot, rootDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const relativePath = `${rootDir}/${entry.name}`;
    if (entry.isDirectory()) return readMarkdownEntries(relativePath, type);
    if (!entry.isFile() || !entry.name.endsWith('.md')) return [];
    return [readEntry(relativePath, type)];
  });
}

const skills = readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => readEntry(`skills/${e.name}/SKILL.md`, 'skill'));

const rules = readMarkdownEntries('rules', 'rule');

const manifest: Manifest = {
  version: '1.0.0',
  entries: [...directives, ...skills, ...rules],
};

const outPath = join(repoRoot, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json written — ${manifest.entries.length} entries (${directives.length} directives, ${skills.length} skills, ${rules.length} rules)`);
