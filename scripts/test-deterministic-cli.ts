#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const cliPath = join(repoRoot, 'src', 'cli.ts');
const tsxImport = import.meta.resolve('tsx');
const CLI_TIMEOUT_MS = 10_000;
const CLI_BUFFER_BYTES = 1_048_576;

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, ['--import', tsxImport, cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: CLI_TIMEOUT_MS,
    maxBuffer: CLI_BUFFER_BYTES,
  });
  return { status: result.status ?? 2, stdout: result.stdout, stderr: result.stderr };
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function makeRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'deterministic-cli-'));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test User']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'init.defaultBranch', 'main']);
  writeFileSync(join(cwd, 'base.txt'), 'base\n');
  git(cwd, ['add', 'base.txt']);
  git(cwd, ['commit', '-m', 'base']);
  return cwd;
}

function assertJson(result: CliResult): Record<string, unknown> {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function testHelpAndInvalidOptions(): void {
  const cwd = mkdtempSync(join(tmpdir(), 'deterministic-cli-help-'));
  try {
    const help = runCli(['--help'], cwd);
    assert.equal(help.status, 0);
    for (const command of ['verification-report', 'workspace-preflight', 'boundary-diff', 'mcp-validate', 'agent-state']) {
      assert.match(help.stdout, new RegExp(command));
    }
    const invalid = runCli(['workspace-preflight', '--format', 'yaml'], cwd);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /text.*json/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function testWorkspaceAndBoundaryCommands(): void {
  const nonGit = mkdtempSync(join(tmpdir(), 'deterministic-cli-nongit-'));
  const repo = makeRepo();
  try {
    const preflight = assertJson(runCli(['workspace-preflight', '--format', 'json'], nonGit));
    assert.equal(preflight.version, 1);
    assert.equal(preflight.recommendation, 'non-git');
    writeFileSync(join(repo, 'added.ts'), "import value from './value.js';\nconsole.log(value);\n");
    const boundary = assertJson(runCli(['boundary-diff', '--base', 'HEAD', '--format', 'json'], repo));
    assert.equal(boundary.status, 'observed');
    assert.ok((boundary.edges as Array<{ targetText: string }>).some((edge) => edge.targetText === './value.js'));
  } finally {
    rmSync(nonGit, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
}

function decisionContent(): string {
  return [
    '---', 'date: 2026-08-05', 'task: Test deterministic CLI', 'domain: cli-contract',
    'kind: process', 'scope: repo', 'status: active', 'triggers:', '  - cli',
    'applies_to:', '  - src/*.ts', 'supersedes:', '---', '# Deterministic CLI', '',
    '## Context', 'Context.', '', '## Decision', 'Decision.', '',
    '## Rejected Alternatives', 'None.', '', '## Consequences', 'Stable output.', '',
  ].join('\n');
}

function writeDecision(repo: string): string {
  const directory = join(repo, 'docs', 'decisions');
  mkdirSync(directory, { recursive: true });
  const path = join(directory, '2026-08-05-cli-contract.md');
  writeFileSync(path, decisionContent());
  return path;
}

function testAgentStateCommands(): void {
  const repo = makeRepo();
  try {
    const handoff = assertJson(runCli(['agent-state', 'handoff', '--format', 'json'], repo));
    assert.equal(handoff.version, 1);
    const scaffoldPath = join(repo, 'handoff.md');
    const scaffold = runCli(['agent-state', 'handoff'], repo);
    writeFileSync(scaffoldPath, scaffold.stdout);
    const handoffValidation = runCli(['agent-state', 'handoff', 'validate', scaffoldPath, '--format', 'json'], repo);
    assert.equal(handoffValidation.status, 1);
    assert.ok((JSON.parse(handoffValidation.stdout) as { findings: unknown[] }).findings.length > 0);
    const decision = writeDecision(repo);
    const listed = assertJson(runCli(['agent-state', 'decisions', 'list', '--format', 'json', '--domain', 'cli-contract'], repo));
    assert.equal((listed.records as unknown[]).length, 1);
    const validated = assertJson(runCli(['agent-state', 'decisions', 'validate', decision, '--format', 'json'], repo));
    assert.deepEqual(validated.findings, []);
    const template = runCli(['agent-state', 'decisions', 'template', '--date', '2026-08-05', '--task', 'CLI', '--domain', 'cli-contract', '--kind', 'process', '--scope', 'repo', '--trigger', 'cli', '--applies-to', 'src/*.ts'], repo);
    assert.equal(template.status, 0, template.stderr);
    assert.match(template.stdout, /## Consequences/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

function testMcpAndVerificationCommands(): void {
  const repo = makeRepo();
  try {
    const server = join(repo, 'server.mjs');
    writeFileSync(server, `process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:{capabilities:{}}})+'\\n');process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:2,result:{tools:[]}})+'\\n');`);
    const mcp = assertJson(runCli(['mcp-validate', process.execPath, server, '--format', 'json'], repo));
    assert.equal(mcp.status, 'ok');
    writeFileSync(join(repo, 'AGENTS.md'), '# local agent instructions\n');
    const sync = runCli(['sync', '--tool', 'codex', '--yes'], repo);
    assert.equal(sync.status, 0, sync.stderr);
    const legacyVerify = runCli(['verify'], repo);
    assert.equal(legacyVerify.status, 0, legacyVerify.stderr);
    assert.match(legacyVerify.stdout, /VERIFICATION REPORT/);
    const verification = assertJson(runCli(['verification-report', '--format', 'json'], repo));
    assert.equal(verification.version, 1);
    assert.ok('evidence' in verification);
    assert.ok((verification.gates as unknown[]).length > 0, 'verification report should expose installed gate results');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

testHelpAndInvalidOptions();
testWorkspaceAndBoundaryCommands();
testAgentStateCommands();
testMcpAndVerificationCommands();
process.stdout.write('deterministic CLI tests passed\n');
