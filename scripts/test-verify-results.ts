#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectVerifyResults } from '../src/verify-results.js';
import { getModifiedFiles, runGates } from '../src/verify-runtime.js';

const root = mkdtempSync(join(tmpdir(), 'verify-results-'));

try {
  const undetected = collectVerifyResults({ cwd: root });
  assert.equal(undetected.status, 'error');
  assert.equal(undetected.exitCode, 2);
  assert.match(undetected.message ?? '', /auto-detect target tool/i);
  assert.deepEqual(undetected.results, []);

  writeFileSync(join(root, 'AGENTS.md'), '# fixture\n', 'utf8');
  const noEntries = collectVerifyResults({ cwd: root });
  assert.equal(noEntries.status, 'passed');
  assert.equal(noEntries.exitCode, 0);
  assert.match(noEntries.message ?? '', /no installed agent-directives/i);
  assert.deepEqual(noEntries.results, []);

  const captured = runGates({
    cwd: root,
    isGit: false,
    changedFiles: [],
    captureOutput: true,
    gates: [{ name: 'capture', run: `${JSON.stringify(process.execPath)} -e "process.stdout.write('captured-output')"`, sourceId: 'test' }],
  });
  assert.equal(captured.hasFailures, false);
  assert.match(captured.results[0].output ?? '', /captured-output/);

  const failed = runGates({
    cwd: root,
    isGit: false,
    changedFiles: [],
    captureOutput: true,
    gates: [{ name: 'failure', run: `${JSON.stringify(process.execPath)} -e "process.stderr.write('captured-failure');process.exit(3)"`, sourceId: 'test' }],
  });
  assert.equal(failed.hasFailures, true);
  assert.equal(failed.results[0].status, 'failed');
  assert.match(failed.results[0].output ?? '', /captured-failure/);

  const skipped = runGates({
    cwd: root,
    isGit: true,
    changedFiles: ['README.md'],
    captureOutput: true,
    gates: [{ name: 'filtered', run: 'unused', files: ['src/**/*.ts'], sourceId: 'test' }],
  });
  assert.equal(skipped.hasFailures, false);
  assert.equal(skipped.results[0].status, 'skipped');

  const renameRepo = mkdtempSync(join(tmpdir(), 'verify-rename-'));
  try {
    execFileSync('git', ['init'], { cwd: renameRepo });
    execFileSync('git', ['config', 'user.email', 'agent@example.com'], { cwd: renameRepo });
    execFileSync('git', ['config', 'user.name', 'Agent'], { cwd: renameRepo });
    writeFileSync(join(renameRepo, 'original.txt'), 'base\n');
    execFileSync('git', ['add', 'original.txt'], { cwd: renameRepo });
    execFileSync('git', ['commit', '-m', 'base'], { cwd: renameRepo });
    execFileSync('git', ['mv', 'original.txt', 'renamed.txt'], { cwd: renameRepo });
    writeFileSync(join(renameRepo, 'renamed.txt'), 'base\nunstaged\n');
    assert.deepEqual(getModifiedFiles(renameRepo), ['renamed.txt']);
  } finally {
    rmSync(renameRepo, { recursive: true, force: true });
  }

  console.log('verify result collection tests passed');
} finally {
  rmSync(root, { recursive: true, force: true });
}
