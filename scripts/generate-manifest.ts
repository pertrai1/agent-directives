#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

type ManifestEntryType = 'directive' | 'skill' | 'rule' | 'template';

interface ManifestRouting {
  triggers?: string[];
  commonPaths?: string[];
  capabilityTags?: string[];
  dependsAfter?: string[];
  oftenComposesWith?: string[];
}

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
  routing?: ManifestRouting;
  scripts?: string[];
}

interface Manifest {
  version: string;
  entries: ManifestEntry[];
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

function optionalStringArray(value: unknown, ctx: FieldContext): string[] | undefined {
  if (value === undefined) return undefined;
  const ok = Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.length > 0);
  if (!ok) throw new Error(`Invalid optional '${ctx.key}' in ${ctx.path}; expected a non-empty string array`);
  return value as string[];
}

function optionalMapping({ value, key, path }: { value: unknown; key: string; path: string }): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`Invalid optional '${key}' in ${path}; expected a mapping`);
  }
  return value as Record<string, unknown>;
}

function uniqueStrings(values: Array<string[] | undefined>): string[] | undefined {
  const merged = values.flatMap((value) => value ?? []);
  const unique = [...new Set(merged)];
  return unique.length > 0 ? unique : undefined;
}

function readArray({ source, keys, path }: { source: Record<string, unknown>; keys: string[]; path: string }): string[] | undefined {
  const values = keys.map((key) => optionalStringArray(source[key], { key, path }));
  return uniqueStrings(values);
}

function buildRouting(fm: Record<string, unknown>, path: string): ManifestRouting | undefined {
  const routingSource = optionalMapping({ value: fm.routing, key: 'routing', path });
  const routing: ManifestRouting = {};

  const triggers = uniqueStrings([
    optionalStringArray(fm.triggers, { key: 'triggers', path }),
    readArray({ source: routingSource, keys: ['triggers'], path }),
  ]);
  if (triggers) routing.triggers = triggers;

  const commonPaths = uniqueStrings([
    optionalStringArray(fm.applies_to, { key: 'applies_to', path }),
    readArray({ source: routingSource, keys: ['commonPaths', 'common_paths', 'paths'], path }),
  ]);
  if (commonPaths) routing.commonPaths = commonPaths;

  const capabilityTags = uniqueStrings([
    readArray({ source: routingSource, keys: ['capabilityTags', 'capability_tags', 'applies_to'], path }),
  ]);
  if (capabilityTags) routing.capabilityTags = capabilityTags;

  const dependsAfter = readArray({ source: routingSource, keys: ['dependsAfter', 'depends_after'], path });
  if (dependsAfter) routing.dependsAfter = dependsAfter;

  const oftenComposesWith = readArray({ source: routingSource, keys: ['oftenComposesWith', 'often_composes_with'], path });
  if (oftenComposesWith) routing.oftenComposesWith = oftenComposesWith;

  return Object.keys(routing).length > 0 ? routing : undefined;
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
  const routing = buildRouting(fm, path);
  if (routing) entry.routing = routing;
  const scripts = buildScripts(fm, path);
  if (scripts) entry.scripts = scripts;
  return entry;
}

// buildScripts resolves the optional frontmatter `scripts:` list (paths relative
// to the entry file's directory) into repo-relative paths, validating that each
// referenced script exists so a broken reference fails manifest generation
// rather than surfacing as a silently-missing file at install time.
function buildScripts(fm: Record<string, unknown>, path: string): string[] | undefined {
  const scripts = optionalStringArray(fm.scripts, { key: 'scripts', path });
  if (!scripts) return undefined;
  const dir = path.slice(0, path.lastIndexOf('/'));
  return scripts.map((script) => {
    if (script.startsWith('/') || script.includes('..')) {
      throw new Error(`Invalid script path '${script}' in ${path}; expected a repo-relative path without '..'`);
    }
    const relative = `${dir}/${script}`;
    if (!existsSync(join(repoRoot, relative))) {
      throw new Error(`Script not found for ${path}: ${relative}`);
    }
    return relative;
  });
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

const templates: ManifestEntry[] = [
  {
    id: 'decision-log-template',
    type: 'template',
    path: 'templates/decision-log.md',
    description: 'Blank template matching the session-decisions frontmatter schema and section structure.',
    version: '1.0.0',
    required: true,
    category: 'memory',
    tools: ['claude', 'copilot', 'codex', 'cursor'],
  },
];

const manifest: Manifest = {
  version: '1.0.0',
  entries: [...directives, ...skills, ...rules, ...templates],
};

const outPath = join(repoRoot, 'manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json written — ${manifest.entries.length} entries (${directives.length} directives, ${skills.length} skills, ${rules.length} rules, ${templates.length} templates)`);
