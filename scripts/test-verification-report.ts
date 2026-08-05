#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import {
  buildVerificationReport,
  renderVerificationReport,
  verificationReportExitCode,
} from '../src/verification-report.js';

const DEFAULT_TEST_BYTE_LIMIT = 1024;
const BYTE_TEST_LINE_LIMIT = 10;
const BYTE_TEST_LIMIT = 64;
const OVERSIZED_OUTPUT_LENGTH = 1000;

const input = {
  changedFiles: ['z-last.md', 'a-first.md'],
  gateResults: [
    {
      name: 'zeta',
      command: 'run zeta',
      status: 'passed' as const,
    },
    {
      name: 'alpha',
      command: 'run alpha',
      status: 'failed' as const,
      error: 'boom',
      output: 'line 1\nline 2\nline 3\nline 4',
    },
  ],
  testEvidence: { state: 'verified' as const, summary: 'tests passed' },
  maxOutputLines: 2,
  maxOutputBytes: DEFAULT_TEST_BYTE_LIMIT,
  blockingFindings: ['needs human review'],
};

const originalSnapshot = JSON.parse(JSON.stringify(input));

const report = buildVerificationReport(input);
assert.deepEqual(input, originalSnapshot, 'buildVerificationReport must not mutate caller input');
assert.deepEqual(report.changedFiles, ['a-first.md', 'z-last.md']);
assert.deepEqual(report.gates.map((gate) => gate.name), ['alpha', 'zeta']);
assert.equal(report.gates[0].excerpt, '... truncated 2 line(s); showing last 2 line(s)\nline 3\nline 4');
assert.equal(report.evidence.functional.state, 'unverified');
assert.equal(report.evidence.integration.state, 'unverified');
assert.equal(report.evidence.docs.state, 'unverified');
assert.equal(report.evidence.scope.state, 'unverified');

const textOnce = renderVerificationReport(report, 'text');
const textTwice = renderVerificationReport(report, 'text');
assert.equal(textOnce, textTwice, 'text rendering must be stable across repeated calls');
assert.match(textOnce, /## Verification report/);
assert.match(textOnce, /- functional: UNVERIFIED/);
assert.match(textOnce, /- alpha \[failed\]/);

const jsonOnce = renderVerificationReport(report, 'json');
const jsonTwice = renderVerificationReport(report, 'json');
assert.equal(jsonOnce, jsonTwice, 'json rendering must be stable across repeated calls');
assert.deepEqual(
  JSON.parse(jsonOnce),
  {
    version: 1,
    changedFiles: ['a-first.md', 'z-last.md'],
    gates: [
      {
        name: 'alpha',
        command: 'run alpha',
        status: 'failed',
        error: 'boom',
        excerpt: '... truncated 2 line(s); showing last 2 line(s)\nline 3\nline 4',
      },
      {
        name: 'zeta',
        command: 'run zeta',
        status: 'passed',
      },
    ],
    evidence: {
      test: { state: 'verified', summary: 'tests passed' },
      functional: { state: 'unverified' },
      integration: { state: 'unverified' },
      docs: { state: 'unverified' },
      scope: { state: 'unverified' },
    },
    blockingFindings: ['needs human review'],
  },
  'json rendering must preserve ordered report data',
);

assert.equal(verificationReportExitCode(report), 1, 'failed gate and blocking finding should yield exit 1');
assert.equal(
  verificationReportExitCode({
    ...report,
    gates: report.gates.map((gate) => ({ ...gate, status: 'passed' as const })),
    blockingFindings: [],
  }),
  0,
  'successful report should yield exit 0',
);
assert.equal(
  verificationReportExitCode({
    ...report,
    gates: report.gates.map((gate) => ({ ...gate, status: 'passed' as const })),
    evidence: {
      ...report.evidence,
      docs: { state: 'incomplete' },
    },
    blockingFindings: [],
  }),
  2,
  'incomplete evidence should yield exit 2',
);

assert.throws(() => buildVerificationReport({ ...input, maxOutputLines: 0 }), /positive integer/);
assert.throws(() => buildVerificationReport({ ...input, maxOutputLines: -1 }), /positive integer/);
assert.throws(() => buildVerificationReport({ ...input, maxOutputBytes: 0 }), /positive integer/);

const byteBounded = buildVerificationReport({
  ...input,
  maxOutputLines: BYTE_TEST_LINE_LIMIT,
  maxOutputBytes: BYTE_TEST_LIMIT,
  gateResults: [{ name: 'bytes', command: 'bytes', status: 'failed', output: 'x'.repeat(OVERSIZED_OUTPUT_LENGTH) }],
});
assert.ok(Buffer.byteLength(byteBounded.gates[0].excerpt ?? '', 'utf8') <= BYTE_TEST_LIMIT, 'excerpt must honor byte cap');

console.log('verification report tests passed');
