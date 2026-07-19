#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatterBlock } from './frontmatter.js';
import { validateAssetSource } from './validate-asset-source.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const errors: string[] = [], warnings: string[] = [];

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function exists(path: string): boolean {
  return existsSync(join(repoRoot, path));
}

function fail(message: string): void {
  errors.push(message);
}

function warn(message: string): void {
  warnings.push(message);
}

function extractPaths(text: string): string[] {
  const matches = text.match(/(?:AGENTS\.md|templates\/[A-Za-z0-9_.-]+\.md|directives\/[A-Za-z0-9_-]+\.md|skills\/[A-Za-z0-9_-]+\/SKILL\.md|rules\/[A-Za-z0-9_/-]+\.md|evals\/scenarios\/[A-Za-z0-9_-]+\.md)/g) ?? [];
  return [...new Set(matches)];
}

function section(text: string, heading: string): string {
  const match = text.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match?.[1] ?? '';
}

const BASE_VALID_CATEGORIES = ['workflow', 'architecture', 'memory', 'testing', 'review', 'planning', 'debugging'];
const VALID_TOOLS = new Set(['claude', 'copilot', 'codex', 'cursor']);
const FRONTMATTER_OPEN_LENGTH = 4;

function normalizeText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function unquoteYamlScalar(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function validateStringArrayShape({ path, keyPath, value }: { path: string; keyPath: string; value: unknown }): void {
  if (value === undefined) return;
  const ok = Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.length > 0);
  if (!ok) fail(`${path}: optional routing metadata '${keyPath}' must be a non-empty string array`);
}

function validateRoutingMetadata(path: string, fm: string): void {
  const parsed = parseFrontmatterBlock(fm);
  validateStringArrayShape({ path, keyPath: 'triggers', value: parsed.triggers });
  validateStringArrayShape({ path, keyPath: 'applies_to', value: parsed.applies_to });

  const routing = parsed.routing;
  if (routing === undefined) return;
  if (!routing || typeof routing !== 'object' || Array.isArray(routing)) {
    fail(`${path}: optional routing metadata 'routing' must be a mapping`);
    return;
  }

  for (const key of [
    'triggers',
    'paths',
    'applies_to',
    'commonPaths',
    'common_paths',
    'capabilityTags',
    'capability_tags',
    'dependsAfter',
    'depends_after',
    'oftenComposesWith',
    'often_composes_with',
  ]) {
    validateStringArrayShape({ path, keyPath: `routing.${key}`, value: (routing as Record<string, unknown>)[key] });
  }
}

function validateScriptPaths(path: string, fm: string): void {
  const parsed = parseFrontmatterBlock(fm);
  const scripts = parsed.scripts;
  if (scripts === undefined) return;
  const ok = Array.isArray(scripts) && scripts.length > 0 && scripts.every((item) => typeof item === 'string' && item.length > 0);
  if (!ok) {
    fail(`${path}: optional 'scripts' must be a non-empty string array`);
    return;
  }
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
  for (const script of scripts as string[]) {
    if (script.startsWith('/') || script.includes('..')) {
      fail(`${path}: script path '${script}' must be repo-relative without '..'`);
      continue;
    }
    const relative = `${dir}/${script}`;
    if (!exists(relative)) fail(`${path}: declared script missing: ${relative}`);
  }
}

function validateAssetPaths(path: string, fm: string): void {
  const parsed = parseFrontmatterBlock(fm);
  const assets = parsed.assets;
  if (assets === undefined) return;
  const ok = Array.isArray(assets) && assets.length > 0 && assets.every((item) => typeof item === 'string' && item.length > 0);
  if (!ok) {
    fail(`${path}: optional 'assets' must be a non-empty string array`);
    return;
  }
  for (const asset of assets as string[]) {
    const error = validateAssetSource({ repoRoot, entryPath: path, asset });
    if (error) fail(error);
  }
}

function validateRequiredKeys(path: string, fm: string): void {
  const requiredKeys = ['name', 'description', 'category'];
  if (path.startsWith('rules/')) requiredKeys.push('version');

  for (const key of requiredKeys) {
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)) fail(`${path}: missing frontmatter key '${key}'`);
  }
  if (!/^required:\s+(true|false)\s*$/m.test(fm)) fail(`${path}: missing or invalid frontmatter key 'required' (must be true or false)`);
  if (!/^tools:\s*$/m.test(fm)) fail(`${path}: missing frontmatter key 'tools'`);
}

function validateCategoryValue(path: string, fm: string): void {
  const categoryRaw = fm.match(/^category:\s*(\S+)/m)?.[1];
  const category = categoryRaw ? unquoteYamlScalar(categoryRaw) : undefined;
  if (category && !VALID_CATEGORIES.has(category)) {
    fail(`${path}: unknown category '${category}' (expected: ${[...VALID_CATEGORIES].join(', ')})`);
  }
}

function validateToolsValues(path: string, fm: string): void {
  const toolsBlock = fm.match(/^tools:\s*\n((?:\s+-\s+\S+\n?)*)/m)?.[1] ?? '';
  if (!/^\s*-\s+\S+/m.test(toolsBlock)) fail(`${path}: frontmatter key 'tools' must include at least one item`);
  for (const toolMatch of toolsBlock.matchAll(/^\s+-\s+(\S+)/gm)) {
    const tool = unquoteYamlScalar(toolMatch[1]);
    if (!VALID_TOOLS.has(tool)) fail(`${path}: unknown tool '${tool}' in tools list (expected: ${[...VALID_TOOLS].join(', ')})`);
  }
}

function expectedNameFor(path: string): string | undefined {
  if (path.startsWith('skills/')) return path.split('/')[1];
  if (path.startsWith('rules/')) {
    const parts = path.split('/');
    return `${parts[1]}-${parts.at(-1)?.replace(/\.md$/, '')}`;
  }
  return path.split('/').pop()?.replace(/\.md$/, '');
}

function readMarkdownEntries(rootDir: string): string[] {
  const absoluteRoot = join(repoRoot, rootDir);
  if (!existsSync(absoluteRoot)) return [];
  return readdirSync(absoluteRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const relativePath = `${rootDir}/${entry.name}`;
    if (entry.isDirectory()) return readMarkdownEntries(relativePath);
    if (!entry.isFile() || !entry.name.endsWith('.md')) return [];
    return [relativePath];
  });
}

function validateNameMatches(path: string, fm: string): void {
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  const expectedName = expectedNameFor(path);
  if (name && expectedName && name !== expectedName) {
    fail(`${path}: frontmatter name '${name}' does not match '${expectedName}'`);
  }
}

function validateFrontmatter(path: string): void {
  const text = normalizeText(read(path));
  if (!text.startsWith('---\n')) {
    fail(`${path}: missing YAML frontmatter`);
    return;
  }
  const end = text.indexOf('\n---\n', FRONTMATTER_OPEN_LENGTH);
  if (end === -1) {
    fail(`${path}: unterminated YAML frontmatter`);
    return;
  }
  const fm = text.slice(FRONTMATTER_OPEN_LENGTH, end);
  validateRequiredKeys(path, fm);
  validateCategoryValue(path, fm);
  validateToolsValues(path, fm);
  validateNameMatches(path, fm);
  validateRoutingMetadata(path, fm);
  validateScriptPaths(path, fm);
  validateAssetPaths(path, fm);
}

function validateReferencedPaths(path: string): void {
  const text = read(path);
  for (const ref of extractPaths(text)) {
    if (ref.includes('/foo/') || ref.endsWith('/foo.md')) continue;
    if (!exists(ref)) fail(`${path}: references missing path ${ref}`);
  }
}

function validateScenario(path: string): void {
  const text = read(path);
  for (const heading of ['Directive Under Test', 'Setup', 'Prompt', 'Expected Behaviors', 'Anti-Behaviors', 'Quality Criteria']) {
    if (!section(text, heading).trim()) fail(`${path}: missing or empty ## ${heading}`);
  }
  const setupRefs = extractPaths(section(text, 'Setup')).filter((ref) => ref === 'AGENTS.md' || ref.startsWith('directives/') || ref.startsWith('skills/'));
  if (setupRefs.length === 0) fail(`${path}: Setup must reference at least one loadable instruction file`);
  for (const ref of setupRefs) {
    if (!exists(ref)) fail(`${path}: Setup references missing path ${ref}`);
  }
}

const directives = readdirSync(join(repoRoot, 'directives')).filter((file) => file.endsWith('.md')).map((file) => `directives/${file}`);
const skills = readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const path = `skills/${entry.name}/SKILL.md`;
    if (!exists(path)) {
      fail(`skills/${entry.name}: missing SKILL.md`);
      return [];
    }
    return [path];
  });
const rules = readMarkdownEntries('rules');
const ruleCategories = readdirSync(join(repoRoot, 'rules'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const VALID_CATEGORIES = new Set([...BASE_VALID_CATEGORIES, ...ruleCategories]);
const templates = readdirSync(join(repoRoot, 'templates')).filter((file) => file.endsWith('.md')).map((file) => `templates/${file}`);
const scenarios = readdirSync(join(repoRoot, 'evals', 'scenarios')).filter((file) => file.endsWith('.md')).map((file) => `evals/scenarios/${file}`);

for (const path of [...directives, ...skills, ...rules]) validateFrontmatter(path);
for (const path of ['AGENTS.md', 'README.md', 'evals/README.md', 'evals/results/README.md', ...directives, ...skills, ...rules, ...templates]) {
  validateReferencedPaths(path);
}
for (const path of scenarios) validateScenario(path);

let adaptive = '';
if (exists('directives/adaptive-routing.md')) {
  adaptive = read('directives/adaptive-routing.md');
} else {
  fail('directives/adaptive-routing.md: missing required routing directive');
}
const adaptiveCompanions = parseFrontmatterBlock(adaptive).assets;
const adaptiveRoutingText = [
  adaptive,
  ...(Array.isArray(adaptiveCompanions)
    ? adaptiveCompanions
      .filter((asset): asset is string => typeof asset === 'string' && asset.length > 0)
      .map((asset) => `directives/${asset}`)
      .filter(exists)
      .map(read)
    : []),
].join('\n');
for (const skill of skills) {
  if (!adaptiveRoutingText.includes(skill)) warn(`directives/adaptive-routing.md or its companion assets do not mention ${skill}`);
}

if (warnings.length) {
  console.log('Warnings:');
  for (const message of warnings) console.log(`  - ${message}`);
}
if (errors.length) {
  console.error('Directive validation failed:');
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`Directive validation passed: ${directives.length} directives, ${skills.length} skills, ${rules.length} rules, ${templates.length} templates, ${scenarios.length} scenarios.`);
