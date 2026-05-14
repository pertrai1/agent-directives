#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const cliPath = join(repoRoot, 'src', 'cli.ts');

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runCli(args: string, cwd: string, opts: { allowFail?: boolean } = {}): RunResult {
  try {
    const stdout = execSync(`tsx ${cliPath} ${args}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', code: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    if (!opts.allowFail) {
      const stderr = e.stderr ? e.stderr.toString() : String(err);
      throw new Error(`CLI failed (${e.status ?? 'unknown'}): ${stderr}`);
    }
    return {
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : '',
      code: e.status ?? 1,
    };
  }
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: ${message}`);
    console.log(`  ✗ ${name}`);
    console.log(`      ${message}`);
  }
}

function withTempProject(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), 'skills-cli-test-'));
  try {
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function assertContains(haystack: string, needle: string, context: string): void {
  if (!haystack.includes(needle)) throw new Error(`${context}: expected output to contain '${needle}'`);
}

function assertNotContains(haystack: string, needle: string, context: string): void {
  if (haystack.includes(needle)) throw new Error(`${context}: expected output NOT to contain '${needle}'`);
}

function assertFileExists(path: string): void {
  if (!existsSync(path)) throw new Error(`expected file to exist: ${path}`);
}

function assertFileMissing(path: string): void {
  if (existsSync(path)) throw new Error(`expected file NOT to exist: ${path}`);
}

console.log('skills list');
test('lists entries by default', () => {
  withTempProject((cwd) => {
    const { stdout } = runCli('list', cwd);
    assertContains(stdout, 'adaptive-routing', 'list default');
    assertContains(stdout, 'code-reviewer', 'list default');
  });
});

test('filters by --required', () => {
  withTempProject((cwd) => {
    const { stdout } = runCli('list --required', cwd);
    assertContains(stdout, 'adaptive-routing', 'list --required');
    assertNotContains(stdout, 'architecture-boundaries', 'list --required');
  });
});

test('filters by --category', () => {
  withTempProject((cwd) => {
    const { stdout } = runCli('list --category memory', cwd);
    assertContains(stdout, 'error-memory', 'list --category memory');
    assertNotContains(stdout, 'code-reviewer', 'list --category memory');
  });
});

test('filters by --tool', () => {
  withTempProject((cwd) => {
    const { stdout } = runCli('list --tool cursor', cwd);
    assertContains(stdout, 'adaptive-routing', 'list --tool cursor');
    assertNotContains(stdout, 'workspace-isolation', 'list --tool cursor');
  });
});

test('rejects invalid --tool', () => {
  withTempProject((cwd) => {
    const { code } = runCli('list --tool bogus', cwd, { allowFail: true });
    if (code === 0) throw new Error('expected non-zero exit');
  });
});

console.log('\nskills add');
test('installs to entry.path for --tool claude', () => {
  withTempProject((cwd) => {
    runCli('add adaptive-routing --tool claude', cwd);
    assertFileExists(join(cwd, 'directives/adaptive-routing.md'));
  });
});

test('installs skill SKILL.md into nested directory', () => {
  withTempProject((cwd) => {
    runCli('add code-reviewer --tool claude', cwd);
    assertFileExists(join(cwd, 'skills/code-reviewer/SKILL.md'));
  });
});

test('writes to .cursor/rules for --tool cursor', () => {
  withTempProject((cwd) => {
    runCli('add adaptive-routing --tool cursor', cwd);
    assertFileExists(join(cwd, '.cursor/rules/adaptive-routing.mdc'));
  });
});

test('skips identical file on re-run', () => {
  withTempProject((cwd) => {
    runCli('add adaptive-routing --tool claude', cwd);
    const { stdout } = runCli('add adaptive-routing --tool claude', cwd);
    assertContains(stdout, 'up-to-date', 'second add');
  });
});

test('refuses to overwrite different content without --force', () => {
  withTempProject((cwd) => {
    mkdirSync(join(cwd, 'directives'), { recursive: true });
    writeFileSync(join(cwd, 'directives/adaptive-routing.md'), 'custom content');
    const { code } = runCli('add adaptive-routing --tool claude', cwd, { allowFail: true });
    if (code === 0) throw new Error('expected non-zero exit code');
    if (readFileSync(join(cwd, 'directives/adaptive-routing.md'), 'utf8') !== 'custom content') {
      throw new Error('file was overwritten without --force');
    }
  });
});

test('overwrites with --force', () => {
  withTempProject((cwd) => {
    mkdirSync(join(cwd, 'directives'), { recursive: true });
    writeFileSync(join(cwd, 'directives/adaptive-routing.md'), 'custom content');
    runCli('add adaptive-routing --tool claude --force', cwd);
    const content = readFileSync(join(cwd, 'directives/adaptive-routing.md'), 'utf8');
    if (content === 'custom content') throw new Error('file was not overwritten');
    assertContains(content, 'adaptive-routing', 'forced overwrite');
  });
});

test('rejects unknown entry', () => {
  withTempProject((cwd) => {
    const { code } = runCli('add nonexistent-entry --tool claude', cwd, { allowFail: true });
    if (code === 0) throw new Error('expected non-zero exit code');
  });
});

console.log('\nskills check');
test('reports missing required in empty project', () => {
  withTempProject((cwd) => {
    const { stderr, code } = runCli('check --tool claude', cwd, { allowFail: true });
    if (code === 0) throw new Error('expected non-zero exit code');
    assertContains(stderr, 'Missing', 'check missing');
  });
});

test('reports success when all required installed', () => {
  withTempProject((cwd) => {
    runCli('sync --tool claude --yes', cwd);
    const { stdout } = runCli('check --tool claude', cwd);
    assertContains(stdout, 'All', 'check success');
  });
});

console.log('\nskills sync');
test('installs all required with --yes', () => {
  withTempProject((cwd) => {
    runCli('sync --tool claude --yes', cwd);
    assertFileExists(join(cwd, 'directives/adaptive-routing.md'));
    assertFileExists(join(cwd, 'directives/codebase-navigation.md'));
    assertFileExists(join(cwd, 'directives/task-framing.md'));
    assertFileExists(join(cwd, 'directives/verification.md'));
    assertFileExists(join(cwd, 'skills/code-reviewer/SKILL.md'));
    assertFileExists(join(cwd, 'skills/systematic-debugging/SKILL.md'));
    assertFileExists(join(cwd, 'skills/test-reviewer/SKILL.md'));
    assertFileMissing(join(cwd, 'directives/architecture-boundaries.md'));
  });
});

test('sync --tool cursor only installs cursor-compatible required entries', () => {
  withTempProject((cwd) => {
    runCli('sync --tool cursor --yes', cwd);
    assertFileExists(join(cwd, '.cursor/rules/adaptive-routing.mdc'));
    assertFileExists(join(cwd, '.cursor/rules/code-reviewer.mdc'));
  });
});

test('sync auto-detects tool from CLAUDE.md', () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, 'CLAUDE.md'), '# project\n');
    const { stdout } = runCli('sync --yes', cwd);
    assertContains(stdout, 'Tool: claude', 'auto-detect');
  });
});

console.log('\nResults');
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
