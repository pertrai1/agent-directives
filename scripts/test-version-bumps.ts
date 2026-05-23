#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const validator = join(repoRoot, 'scripts', 'validate-version-bumps.ts');

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function run(command: string, cwd: string, allowFail = false): RunResult {
  try {
    const stdout = execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { stdout, stderr: '', code: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    if (!allowFail) throw err;
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

function withTempRepo(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), 'version-bump-test-'));
  try {
    run('git init -q && git config user.email test@example.com && git config user.name Test', cwd);
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function skillPath(cwd: string, name = 'demo'): string {
  return join(cwd, 'skills', name, 'SKILL.md');
}

function writeInstruction(cwd: string, body: string, version = '1.0.0', name = 'demo'): void {
  mkdirSync(join(cwd, 'skills', name), { recursive: true });
  writeFileSync(skillPath(cwd, name), `---\nname: ${name}\ndescription: Demo skill.\nversion: ${version}\nrequired: false\ncategory: review\ntools:\n  - claude\n---\n\n${body}\n`);
}

console.log('version bump validation');

test('fails when an existing skill changes without a version bump', () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, 'Original behavior.');
    run('git add . && git commit -qm initial', cwd);
    writeInstruction(cwd, 'Changed behavior.');

    const result = run(`tsx ${validator} --base HEAD`, cwd, true);
    if (result.code === 0) throw new Error('expected non-zero exit code');
    if (!result.stderr.includes('changed without a version bump')) {
      throw new Error(`expected missing-version-bump error, got stderr: ${result.stderr}`);
    }
  });
});

test('passes when an existing skill changes with a greater version', () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, 'Original behavior.', '1.0.0');
    run('git add . && git commit -qm initial', cwd);
    writeInstruction(cwd, 'Changed behavior.', '1.0.1');

    const result = run(`tsx ${validator} --base HEAD`, cwd);
    if (!result.stdout.includes('Version bump validation passed')) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test('passes for a new skill with an initial version', () => {
  withTempRepo((cwd) => {
    run('git commit --allow-empty -qm initial', cwd);
    writeInstruction(cwd, 'New behavior.', '1.0.0');
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd);
    if (!result.stdout.includes('Version bump validation passed')) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test('fails when an existing instruction file is deleted', () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, 'Original behavior.', '1.0.0');
    run('git add . && git commit -qm initial', cwd);
    rmSync(skillPath(cwd), { force: true });
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd, true);
    if (result.code === 0) throw new Error('expected non-zero exit code');
    if (!result.stderr.includes('instruction file deleted')) {
      throw new Error(`expected deletion error, got stderr: ${result.stderr}`);
    }
  });
});

test('fails when an existing instruction file is renamed without a major bump', () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, 'Original behavior.', '1.0.0', 'demo');
    run('git add . && git commit -qm initial', cwd);
    mkdirSync(join(cwd, 'skills', 'renamed'), { recursive: true });
    renameSync(skillPath(cwd, 'demo'), skillPath(cwd, 'renamed'));
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd, true);
    if (result.code === 0) throw new Error('expected non-zero exit code');
    if (!result.stderr.includes('without a version bump')) {
      throw new Error(`expected rename version-bump error, got stderr: ${result.stderr}`);
    }
  });
});

test('passes when an existing instruction file is renamed with a major bump', () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, 'Original behavior.', '1.0.0', 'demo');
    run('git add . && git commit -qm initial', cwd);
    writeInstruction(cwd, 'Renamed behavior.', '2.0.0', 'renamed');
    rmSync(join(cwd, 'skills', 'demo'), { recursive: true, force: true });
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd);
    if (!result.stdout.includes('Version bump validation passed')) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test('rejects prerelease versions because the policy only allows plain semver', () => {
  withTempRepo((cwd) => {
    run('git commit --allow-empty -qm initial', cwd);
    writeInstruction(cwd, 'New behavior.', '1.0.0-beta.1');
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd, true);
    if (result.code === 0) throw new Error('expected non-zero exit code');
    if (!result.stderr.includes('plain semver MAJOR.MINOR.PATCH')) {
      throw new Error(`expected plain-semver error, got stderr: ${result.stderr}`);
    }
  });
});

test('fails when the base ref is missing', () => {
  withTempRepo((cwd) => {
    run('git commit --allow-empty -qm initial', cwd);

    const result = run(`tsx ${validator} --base origin/missing`, cwd, true);
    if (result.code === 0) throw new Error('expected non-zero exit code');
    if (!result.stderr.includes('invalid or missing base ref')) {
      throw new Error(`expected invalid-base error, got stderr: ${result.stderr}`);
    }
  });
});

test('parses BOM and CRLF frontmatter versions', () => {
  withTempRepo((cwd) => {
    run('git commit --allow-empty -qm initial', cwd);
    mkdirSync(join(cwd, 'skills', 'demo'), { recursive: true });
    writeFileSync(skillPath(cwd), '\uFEFF---\r\nname: demo\r\ndescription: Demo skill.\r\nversion: 1.0.0\r\nrequired: false\r\ncategory: review\r\ntools:\r\n  - claude\r\n---\r\n\r\nNew behavior.\r\n');
    run('git add -A', cwd);

    const result = run(`tsx ${validator} --base HEAD`, cwd);
    if (!result.stdout.includes('Version bump validation passed')) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

console.log('\nResults');
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
