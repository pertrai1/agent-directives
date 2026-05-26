#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const errors: string[] = [];
const warnings: string[] = [];

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
  const matches = text.match(/(?:AGENTS\.md|templates\/[A-Za-z0-9_.-]+\.md|directives\/[A-Za-z0-9_-]+\.md|skills\/[A-Za-z0-9_-]+\/SKILL\.md|evals\/scenarios\/[A-Za-z0-9_-]+\.md)/g) ?? [];
  return [...new Set(matches)];
}

function section(text: string, heading: string): string {
  const match = text.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match?.[1] ?? '';
}

function validateFrontmatter(path: string): void {
  const text = read(path);
  if (!text.startsWith('---\n')) {
    fail(`${path}: missing YAML frontmatter`);
    return;
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    fail(`${path}: unterminated YAML frontmatter`);
    return;
  }
  const fm = text.slice(4, end);
  for (const key of ['name', 'description', 'category']) {
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)) fail(`${path}: missing frontmatter key '${key}'`);
  }
  if (!/^required:\s+(true|false)\s*$/m.test(fm)) fail(`${path}: missing or invalid frontmatter key 'required' (must be true or false)`);
  if (!/^tools:\s*$/m.test(fm)) fail(`${path}: missing frontmatter key 'tools'`);
  const validCategories = new Set(['workflow', 'architecture', 'memory', 'testing', 'review', 'planning', 'debugging']);
  const category = fm.match(/^category:\s*(\S+)/m)?.[1];
  if (category && !validCategories.has(category)) fail(`${path}: unknown category '${category}' (expected: ${[...validCategories].join(', ')})`);
  const validTools = new Set(['claude', 'copilot', 'codex', 'cursor']);
  const toolsBlock = fm.match(/^tools:\s*\n((?:\s+-\s+\S+\n?)*)/m)?.[1] ?? '';
  if (!/^\s*-\s+\S+/m.test(toolsBlock)) fail(`${path}: frontmatter key 'tools' must include at least one item`);
  for (const toolMatch of toolsBlock.matchAll(/^\s+-\s+(\S+)/gm)) {
    const tool = toolMatch[1];
    if (!validTools.has(tool)) fail(`${path}: unknown tool '${tool}' in tools list (expected: ${[...validTools].join(', ')})`);
  }
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  const expectedName = path.startsWith('skills/') ? path.split('/')[1] : path.split('/').pop()?.replace(/\.md$/, '');
  if (name && expectedName && name !== expectedName) {
    fail(`${path}: frontmatter name '${name}' does not match '${expectedName}'`);
  }
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
const templates = readdirSync(join(repoRoot, 'templates')).filter((file) => file.endsWith('.md')).map((file) => `templates/${file}`);
const scenarios = readdirSync(join(repoRoot, 'evals', 'scenarios')).filter((file) => file.endsWith('.md')).map((file) => `evals/scenarios/${file}`);

for (const path of [...directives, ...skills]) validateFrontmatter(path);
for (const path of ['AGENTS.md', 'README.md', 'evals/README.md', 'evals/results/README.md', ...directives, ...skills, ...templates]) {
  validateReferencedPaths(path);
}
for (const path of scenarios) validateScenario(path);

let adaptive = '';
if (exists('directives/adaptive-routing.md')) {
  adaptive = read('directives/adaptive-routing.md');
} else {
  fail('directives/adaptive-routing.md: missing required routing directive');
}
for (const skill of skills) {
  if (!adaptive.includes(skill)) warn(`directives/adaptive-routing.md does not mention ${skill}`);
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
console.log(`Directive validation passed: ${directives.length} directives, ${skills.length} skills, ${templates.length} templates, ${scenarios.length} scenarios.`);
