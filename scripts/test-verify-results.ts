#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectVerifyResults } from '../src/verify-results.js';
import { runGates } from '../src/verify-runtime.js';

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

  console.log('verify result collection tests passed');
} finally {
  rmSync(root, { recursive: true, force: true });
}
