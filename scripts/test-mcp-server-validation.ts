import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateMcpServer, renderMcpValidation, mcpValidationExitCode } from '../src/mcp-server-validation.js';

const baseDir = mkdtempSync(join(tmpdir(), 'mcp-validation-'));
const INITIALIZE_TIMEOUT_MS = 1500;
const INITIALIZE_MAX_BYTES = 2048;
const TIMEOUT_TIMEOUT_MS = 200;
const TIMEOUT_MAX_BYTES = 128;
const SAFE_TIMEOUT_MS = 1000;
const SAFE_MAX_BYTES = 1024;

function makeFixture(name: string, body: string): string {
  const path = join(baseDir, `${name}.mjs`);
  writeFileSync(path, body, 'utf8');
  return path;
}

function runFixture(path: string, args: readonly string[] = []): ReturnType<typeof validateMcpServer> {
  return validateMcpServer({
    executable: process.execPath,
    args: [path, ...args],
    timeoutMs: INITIALIZE_TIMEOUT_MS,
    maxOutputBytes: INITIALIZE_MAX_BYTES,
  });
}

try {
  const valid = makeFixture('valid', `
    import { createInterface } from 'node:readline';
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    let buffer = '';
    rl.on('line', (line) => {
      if (!line.trim()) return;
      const msg = JSON.parse(line);
      if (msg.method === 'initialize') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } }) + '\\n');
      } else if (msg.method === 'notifications/initialized') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/ack', params: {} }) + '\\n');
      } else if (msg.method === 'tools/list') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'inspect-files', description: 'Inspect files', inputSchema: { type: 'object', properties: { path: { type: 'string', minLength: 1 } }, required: ['path'] } }] } }) + '\\n');
      }
    });
  `);
  const validReport = runFixture(valid);
  const repeatedValidReport = runFixture(valid);
  assert.equal(mcpValidationExitCode(validReport), 0);
  assert.equal(validReport.status, 'ok');
  assert.equal(renderMcpValidation(validReport, 'json'), renderMcpValidation(repeatedValidReport, 'json'));
  assert.equal(renderMcpValidation(validReport, 'json'), renderMcpValidation(validReport, 'json'));
  assert.match(renderMcpValidation(validReport, 'text'), /status: ok/);

  const findings = makeFixture('findings', `
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } }) + '\\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [
      { name: 'run', description: '', inputSchema: { type: 'object', properties: { limit: { type: 'integer' } }, required: ['limit'] } },
      { name: 'run', description: 'tool', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }
    ] } }) + '\\n');
  `);
  const findingsReport = runFixture(findings);
  assert.equal(mcpValidationExitCode(findingsReport), 1);
  assert.equal(findingsReport.status, 'findings');
  assert.ok(findingsReport.findings.length > 0);
  assert.equal(renderMcpValidation(findingsReport, 'json'), renderMcpValidation(findingsReport, 'json'));

  const malformed = makeFixture('malformed', `
    process.stdout.write('not-json\\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [] } }) + '\\n');
  `);
  const malformedReport = runFixture(malformed);
  assert.equal(mcpValidationExitCode(malformedReport), 2);
  assert.equal(malformedReport.status, 'protocol-error');
  assert.ok(malformedReport.protocolIssues.some((issue) => issue.code === 'malformed-json'));

  const missingInitialize = makeFixture('missing-initialize', `
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [] } }) + '\\n');
  `);
  const missingInitializeReport = runFixture(missingInitialize);
  assert.equal(mcpValidationExitCode(missingInitializeReport), 2);
  assert.equal(missingInitializeReport.status, 'protocol-error');
  assert.ok(missingInitializeReport.protocolIssues.some((issue) => issue.code === 'missing-required-response' && issue.detail === 'id=1'));

  const timeout = makeFixture('timeout', `
    setInterval(() => {}, 1000);
  `);
  const timeoutReport = validateMcpServer({
    executable: process.execPath,
    args: [timeout],
    timeoutMs: TIMEOUT_TIMEOUT_MS,
    maxOutputBytes: TIMEOUT_MAX_BYTES,
  });
  assert.equal(mcpValidationExitCode(timeoutReport), 2);
  assert.equal(timeoutReport.status, 'protocol-error');
  assert.equal(timeoutReport.stdoutBytes <= TIMEOUT_MAX_BYTES, true);
  assert.equal(timeoutReport.stderrBytes <= TIMEOUT_MAX_BYTES, true);

  const inert = makeFixture('inert', `
    const args = process.argv.slice(2);
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } }) + '\\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'safe', description: 'safe', inputSchema: { type: 'object', properties: {}, required: [] } }] } }) + '\\n');
    process.stderr.write(JSON.stringify({ args }) + '\\n');
  `);
  const metacharacters = [';rm -rf /', '$(touch hacked)', '&&', '|'];
  const inertReport = validateMcpServer({
    executable: process.execPath,
    args: [inert, ...metacharacters],
    timeoutMs: SAFE_TIMEOUT_MS,
    maxOutputBytes: SAFE_MAX_BYTES,
  });
  assert.ok(inertReport.stderr.includes('"args"'));
  assert.ok(inertReport.stderr.includes(';rm -rf /'));
  assert.ok(inertReport.stderr.includes('$(touch hacked)'));

  const annotations = makeFixture('annotations', `
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } }) + '\\n');
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [
      { name: 'annotated', description: 'annotated', annotations: { readOnlyHint: true, destructiveHint: 'nope', idempotentHint: false, openWorldHint: true }, inputSchema: { type: 'object', properties: {}, required: [] } }
    ] } }) + '\\n');
  `);
  const annotationsReport = runFixture(annotations);
  assert.equal(mcpValidationExitCode(annotationsReport), 1);
  assert.equal(annotationsReport.status, 'findings');
  assert.ok(annotationsReport.findings.some((finding) => finding.name === 'annotated'));
  assert.ok(annotationsReport.findings.some((finding) => finding.issues.some((issue) => issue.code === 'invalid-annotation-flag')));

  console.log('ok');
} finally {
  rmSync(baseDir, { recursive: true, force: true });
}
