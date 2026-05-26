#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

type LoadedFile = {
  path: string;
  sha256: string;
  bytes: number;
};

type Manifest = {
  scenario: string;
  date: string;
  commit: string;
  client: string;
  instruction_surface: string;
  workspace: string;
  assembled_prompt: string;
  prompt: string;
  loaded_files: LoadedFile[];
  expected_loads: string[];
  claimed_route: string | null;
  claimed_loaded_files: string[];
  completed_at?: string;
  exit_status?: number | null;
  error_message?: string;
};

function usage(): never {
  console.error('usage: evals/run-scenario.sh [--print-only] <scenario-name>');
  process.exit(2);
}

const args = process.argv.slice(2);
let printOnly = false;
if (args[0] === '--print-only') {
  printOnly = true;
  args.shift();
}
if (args.length !== 1) usage();

const scenario = args[0];
if (!/^[A-Za-z0-9_-]+$/.test(scenario)) {
  console.error(`invalid scenario name: ${scenario}`);
  process.exit(2);
}
const scenarioFile = join(repoRoot, 'evals', 'scenarios', `${scenario}.md`);
let scenarioText = '';
try {
  scenarioText = readFileSync(scenarioFile, 'utf8');
} catch {
  console.error(`scenario not found: ${scenarioFile}`);
  process.exit(1);
}

function section(name: string): string {
  const match = scenarioText.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match?.[1]?.trimEnd() ?? '';
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

const setup = section('Setup');
const prompt = section('Prompt');
const directiveUnderTest = section('Directive Under Test');
const pathPattern = /(?:AGENTS\.md|directives\/[a-zA-Z0-9_-]+\.md|skills\/[a-zA-Z0-9_-]+\/SKILL\.md)/g;
const refs = unique(setup.match(pathPattern) ?? []);
const expectedLoads = unique([...refs, ...(directiveUnderTest.match(pathPattern) ?? [])]);

if (refs.length === 0) {
  console.error(`no directive/skill references found in ${scenarioFile}`);
  process.exit(1);
}

const workspace = mkdtempSync(join(tmpdir(), `eval-${scenario}-`));
const claudeMd = join(workspace, 'CLAUDE.md');
const loadedFiles: LoadedFile[] = [];
let assembled = '';

for (const ref of refs) {
  const source = join(repoRoot, ref);
  let body = '';
  try {
    body = readFileSync(source, 'utf8');
  } catch {
    console.error(`referenced file missing: ${source}`);
    process.exit(1);
  }
  const bytes = Buffer.byteLength(body);
  const sha256 = createHash('sha256').update(body).digest('hex');
  loadedFiles.push({ path: ref, sha256, bytes });
  assembled += `<!-- loaded from ${ref} -->\n\n${body}\n\n`;
}
writeFileSync(claudeMd, assembled);

const commitResult = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
const commit = commitResult.error || commitResult.status !== 0 || !commitResult.stdout.trim()
  ? 'unknown'
  : commitResult.stdout.trim();
if (commit === 'unknown') {
  const detail = commitResult.error?.message || commitResult.stderr?.trim() || `status ${commitResult.status}`;
  console.error(`warning: unable to resolve current git commit: ${detail}`);
}
const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(repoRoot, 'evals', 'results', 'runs', `${safeDate}-${scenario}`);
mkdirSync(runDir, { recursive: true });
const assembledCopy = join(runDir, 'assembled-prompt.md');
writeFileSync(assembledCopy, assembled);

const manifestPath = join(runDir, 'manifest.json');
const manifest: Manifest = {
  scenario,
  date: new Date().toISOString(),
  commit,
  client: 'claude',
  instruction_surface: 'CLAUDE.md',
  workspace,
  assembled_prompt: relative(repoRoot, assembledCopy),
  prompt,
  loaded_files: loadedFiles,
  expected_loads: expectedLoads,
  claimed_route: null,
  claimed_loaded_files: []
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Workspace: ${workspace}`);
console.log(`Run log: ${relative(repoRoot, runDir)}`);
console.log('Loaded into CLAUDE.md:');
for (const ref of refs) console.log(`  - ${ref}`);
console.log('');
console.log(`----- scenario prompt (${scenario}) -----`);
console.log(prompt);
console.log('----- end prompt -----');
console.log('');

if (printOnly) {
  console.log('--print-only set; not launching claude.');
  console.log('');
  console.log('----- CLAUDE.md preview -----');
  console.log(assembled);
  console.log('----- end CLAUDE.md preview -----');
  process.exit(0);
}

console.log(`Launching claude in ${workspace}. Workspace is retained for this run log.`);
console.log('Tip: your global ~/.claude/CLAUDE.md is still loaded — move it aside if it conflicts.');
console.log('');
const result = spawnSync('claude', { cwd: workspace, stdio: 'inherit' });
manifest.completed_at = new Date().toISOString();
if (result.error) {
  const error = result.error as NodeJS.ErrnoException;
  const EXIT_COMMAND_NOT_FOUND = 127;
  const exitStatus = error.code === 'ENOENT' ? EXIT_COMMAND_NOT_FOUND : 1;
  console.error(`Failed to launch claude: ${result.error.message}`);
  manifest.exit_status = exitStatus;
  manifest.error_message = result.error.message;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(exitStatus);
}
manifest.exit_status = result.status;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.exit(result.status ?? 1);
