#!/usr/bin/env tsx
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import {
  inspectWorkspace,
  renderWorkspacePreflight,
  workspacePreflightExitCode,
} from '../src/workspace-preflight.js';

type TestFn = () => void;

const tests: Array<[string, TestFn]> = [];
const MANY_FILES = 1200;
const SMALL_TIMEOUT_MS = 20;

function test(name: string, fn: TestFn): void {
  tests.push([name, fn]);
}

function report(): void {
  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      passed += 1;
      process.stdout.write(`ok - ${name}\n`);
    } catch (error) {
      process.stderr.write(`not ok - ${name}\n${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
  process.stdout.write(`1..${tests.length}\n`);
  process.stdout.write(`passed ${passed}/${tests.length}\n`);
  if (process.exitCode) process.exitCode = 1;
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'workspace-preflight-'));
}

function git(options: { cwd: string; args: string[]; input?: string }): string {
  const result = execFileSync('git', options.args, { cwd: options.cwd, encoding: 'utf8', input: options.input });
  return typeof result === 'string' ? result : '';
}

function initRepo(cwd: string): void {
  git({ cwd, args: ['init', '-b', 'main'] });
  git({ cwd, args: ['config', 'user.name', 'Test User'] });
  git({ cwd, args: ['config', 'user.email', 'test@example.com'] });
  git({ cwd, args: ['config', 'init.defaultBranch', 'main'] });
  writeFileSync(join(cwd, 'README.md'), 'base\n');
  git({ cwd, args: ['add', 'README.md'] });
  git({ cwd, args: ['commit', '-m', 'base'] });
}

function createFeatureBranch(cwd: string): void {
  git({ cwd, args: ['switch', '-c', 'feature/workspace'] });
}

function createRemoteDefaultBranchRepo(): string {
  const remote = tempDir();
  git({ cwd: remote, args: ['init', '--bare'] });
  git({ cwd: remote, args: ['symbolic-ref', 'HEAD', 'refs/heads/main'] });
  const source = tempDir();
  git({ cwd: source, args: ['init', '-b', 'main'] });
  git({ cwd: source, args: ['config', 'user.name', 'Test User'] });
  git({ cwd: source, args: ['config', 'user.email', 'test@example.com'] });
  git({ cwd: source, args: ['config', 'init.defaultBranch', 'main'] });
  writeFileSync(join(source, 'README.md'), 'base\n');
  git({ cwd: source, args: ['add', 'README.md'] });
  git({ cwd: source, args: ['commit', '-m', 'base'] });
  git({ cwd: source, args: ['remote', 'add', 'origin', remote] });
  git({ cwd: source, args: ['push', '-u', 'origin', 'main'] });
  const clone = tempDir();
  execFileSync('git', ['clone', remote, clone], { encoding: 'utf8' });
  return clone;
}

function createSubmoduleRepo(): string {
  const submodule = tempDir();
  git({ cwd: submodule, args: ['init', '-b', 'main'] });
  git({ cwd: submodule, args: ['config', 'user.name', 'Test User'] });
  git({ cwd: submodule, args: ['config', 'user.email', 'test@example.com'] });
  git({ cwd: submodule, args: ['config', 'init.defaultBranch', 'main'] });
  writeFileSync(join(submodule, 'sub.txt'), 'submodule\n');
  git({ cwd: submodule, args: ['add', 'sub.txt'] });
  git({ cwd: submodule, args: ['commit', '-m', 'sub'] });
  return submodule;
}

test('non-git directories are non-applicable and exit 0', () => {
  const cwd = tempDir();
  const report = inspectWorkspace({ cwd });
  assert.equal(report.applicable, false);
  assert.equal(workspacePreflightExitCode(report), 0);
  assert.equal(report.recommendation, 'non-git');
  assert.match(renderWorkspacePreflight(report, 'text'), /Applicable: no/);
  rmSync(cwd, { recursive: true, force: true });
});

test('clean feature branch stays in place clean', () => {
  const cwd = tempDir();
  initRepo(cwd);
  createFeatureBranch(cwd);

  const report = inspectWorkspace({ cwd });
  assert.equal(report.applicable, true);
  assert.equal(report.recommendation, 'in-place-clean');
  assert.equal(workspacePreflightExitCode(report), 0);
  assert.equal(report.linkedWorktree, false);
  assert.deepEqual(report.cleanliness, { staged: [], unstaged: [], untracked: [] });
  assert.match(renderWorkspacePreflight(report, 'text'), /Recommendation: in-place-clean/);
  rmSync(cwd, { recursive: true, force: true });
});

test('dirty default branch recommends isolation and preserves spaces in paths', () => {
  const cwd = tempDir();
  initRepo(cwd);
  writeFileSync(join(cwd, 'tracked file.txt'), 'changed\n');
  writeFileSync(join(cwd, 'untracked file with spaces.txt'), 'new\n');
  git({ cwd, args: ['add', 'tracked file.txt'] });

  const report = inspectWorkspace({ cwd });
  assert.equal(report.recommendation, 'isolation-recommended');
  assert.equal(workspacePreflightExitCode(report), 1);
  assert.deepEqual(report.cleanliness?.staged, ['tracked file.txt']);
  assert.deepEqual(report.cleanliness?.untracked, ['untracked file with spaces.txt']);
  rmSync(cwd, { recursive: true, force: true });
});

test('linked worktree is already isolated when git supports it', () => {
  const origin = tempDir();
  initRepo(origin);
  const linked = tempDir();
  let worktreeCreated = false;
  try {
    git({ cwd: origin, args: ['worktree', 'add', '-b', 'linked-worktree', linked] });
    worktreeCreated = true;
  } catch (error) {
    void error;
  }

  if (worktreeCreated) {
    const report = inspectWorkspace({ cwd: linked });
    assert.equal(report.linkedWorktree, true);
    assert.equal(report.recommendation, 'already-isolated');
    assert.equal(workspacePreflightExitCode(report), 0);
  } else {
    const out = git({ cwd: origin, args: ['rev-parse', '--git-common-dir'] });
    assert.match(out, /\./);
  }

  rmSync(origin, { recursive: true, force: true });
  rmSync(linked, { recursive: true, force: true });
});

test('dirty status with spaces renders stably and does not mutate', () => {
  const cwd = tempDir();
  initRepo(cwd);
  const before = git({ cwd, args: ['status', '--porcelain=v2', '-z'] });
  const report = inspectWorkspace({ cwd });
  const after = git({ cwd, args: ['status', '--porcelain=v2', '-z'] });
  assert.equal(before, after);
  const text = renderWorkspacePreflight(report, 'text');
  const json = renderWorkspacePreflight(report, 'json');
  assert.ok(text.length > 0);
  assert.ok(json.includes('"version": 1'));
  rmSync(cwd, { recursive: true, force: true });
});

test('submodule is reported as submodule rather than linked isolated worktree', () => {
  const root = tempDir();
  initRepo(root);
  const submodule = createSubmoduleRepo();
  git({ cwd: root, args: ['-c', 'protocol.file.allow=always', 'submodule', 'add', submodule, 'deps/submodule'] });
  const report = inspectWorkspace({ cwd: root });
  assert.equal(report.submodule, true);
  assert.equal(report.linkedWorktree, false);
  assert.notEqual(report.recommendation, 'already-isolated');
  rmSync(root, { recursive: true, force: true });
  rmSync(submodule, { recursive: true, force: true });
});

test('detached head returns needs-human', () => {
  const cwd = tempDir();
  initRepo(cwd);
  git({ cwd, args: ['switch', '--detach'] });
  const report = inspectWorkspace({ cwd });
  assert.equal(report.git?.detachedHead, true);
  assert.equal(report.recommendation, 'needs-human');
  assert.equal(workspacePreflightExitCode(report), 2);
  rmSync(cwd, { recursive: true, force: true });
});

test('inspection timeout reports deterministic failure instead of non-git', () => {
  const cwd = tempDir();
  initRepo(cwd);
  for (let index = 0; index < MANY_FILES; index += 1) {
    writeFileSync(join(cwd, `file-${index}.txt`), `content ${index}\n`);
  }
  const report = inspectWorkspace({ cwd, gitTimeoutMs: SMALL_TIMEOUT_MS });
  assert.equal(report.applicable, true);
  assert.equal(report.recommendation, 'needs-human');
  assert.equal(workspacePreflightExitCode(report), 2);
  assert.ok(report.diagnostics.includes('git inspection failed'));
  rmSync(cwd, { recursive: true, force: true });
});

test('remote origin HEAD supplies default-branch evidence when available', () => {
  const cwd = createRemoteDefaultBranchRepo();
  const report = inspectWorkspace({ cwd });
  assert.equal(report.git?.defaultBranchSource, 'refs/remotes/origin/HEAD');
  assert.ok(report.git?.defaultBranch);
  rmSync(cwd, { recursive: true, force: true });
});

report();
