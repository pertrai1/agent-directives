import { spawnSync } from 'node:child_process';
import {
  analyzeMcpTools,
  buildMcpRequestLines,
  deriveMcpValidationStatus,
  createMcpValidationReport,
  parseMcpValidationOutput,
  type McpParseState,
  type McpProtocolIssue,
  type McpToolFinding,
  type McpValidationFormat,
  type McpValidationReport,
  type ValidateMcpServerOptions,
} from './mcp-server-schema-validation.js';

export type { McpValidationFormat, McpToolFinding, McpValidationReport, ValidateMcpServerOptions };

export function validateMcpServer(options: ValidateMcpServerOptions): McpValidationReport {
  validatePositiveInteger(options.timeoutMs, 'timeoutMs');
  validatePositiveInteger(options.maxOutputBytes, 'maxOutputBytes');
  const child = spawnSync(options.executable, [...options.args], {
    cwd: options.cwd,
    input: `${buildMcpRequestLines().join('\n')}\n`,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeoutMs,
    maxBuffer: Math.max(options.maxOutputBytes, MIN_BUFFER_BYTES),
  });
  const state = createParseState();
  const stdout = capText(child.stdout, options.maxOutputBytes);
  const stderr = capText(child.stderr, options.maxOutputBytes);
  parseMcpValidationOutput({ stdout, state });
  const findings = state.tools === null || state.protocolIssues.length > 0 ? [] : analyzeMcpTools({ tools: state.tools });
  const report = createMcpValidationReport({
    executable: options.executable,
    args: options.args,
    timeoutMs: options.timeoutMs,
    maxOutputBytes: options.maxOutputBytes,
    child: buildChildState(child),
    stdout,
    stderr,
    responseIds: state.responseIds,
    notifications: state.notifications,
    findings,
    protocolIssues: state.protocolIssues,
    requiredResponseIds: [INITIALIZE_REQUEST_ID, TOOLS_LIST_REQUEST_ID],
  });
  const protocolIssues = addMissingResponseIssues({ issues: report.protocolIssues, received: report.responseIds, required: report.requiredResponseIds });
  return {
    version: 1,
    status: deriveMcpValidationStatus({ ...report, protocolIssues }),
    ...report,
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    protocol: {
      requestIds: [INITIALIZE_REQUEST_ID, TOOLS_LIST_REQUEST_ID],
      responseIds: [...state.responseIds].sort((a, b) => a - b),
      notifications: [...state.notifications].sort(),
    },
    findings: [...findings].sort((a, b) => a.name.localeCompare(b.name)),
    protocolIssues: [...protocolIssues].sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message) || (a.detail ?? '').localeCompare(b.detail ?? '')),
  };
}

export function mcpValidationExitCode(report: McpValidationReport): 0 | 1 | 2 {
  if (report.status === 'protocol-error') return 2;
  if (report.status === 'findings') return 1;
  return 0;
}

export function renderMcpValidation(report: McpValidationReport, format: McpValidationFormat): string {
  if (format === 'json') return JSON.stringify(report, null, 2);
  const lines = [
    `mcp-server-validation v${report.version}`,
    `status: ${report.status}`,
    `child: ${report.child.completed ? 'completed' : 'not-completed'} exit=${stringifyNullable(report.child.exitCode)} signal=${stringifyNullable(report.child.signal)} timeout=${report.child.timedOut}`,
    `stdout-bytes: ${report.stdoutBytes}/${report.maxOutputBytes}`,
    `stderr-bytes: ${report.stderrBytes}/${report.maxOutputBytes}`,
  ];
  if (report.protocolIssues.length > 0) {
    lines.push('protocol issues:');
    for (const issue of report.protocolIssues) lines.push(`  - ${issue.code}: ${issue.message}${issue.detail ? ` (${issue.detail})` : ''}`);
  }
  if (report.findings.length > 0) {
    lines.push('findings:');
    for (const finding of report.findings) {
      lines.push(`  - ${finding.name}`);
      for (const issue of finding.issues) lines.push(`      * ${issue.code}: ${issue.message}${issue.detail ? ` (${issue.detail})` : ''}`);
    }
  }
  return lines.join('\n');
}

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer`);
}

function createParseState(): McpParseState {
  return { protocolIssues: [], responseIds: [], notifications: [], tools: null };
}

function buildChildState(child: { status: number | null; signal: NodeJS.Signals | null; error?: { code?: string } | Error | null }): McpValidationReport['child'] {
  const timedOut = hasTimeoutCode(child.error);
  return {
    completed: child.status !== null || child.signal !== null || !child.error,
    exitCode: child.status,
    signal: child.signal,
    timedOut,
  };
}

function hasTimeoutCode(error: { code?: string } | Error | null | undefined): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ETIMEDOUT';
}

function capText(text: string | Buffer | Uint8Array | null | undefined, maxBytes: number): string {
  if (typeof text === 'string') return Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8');
  if (text instanceof Uint8Array) return Buffer.from(text).subarray(0, maxBytes).toString('utf8');
  return Buffer.from('', 'utf8').subarray(0, maxBytes).toString('utf8');
}

function stringifyNullable(value: number | string | null): string {
  return value === null ? 'null' : String(value);
}

function addMissingResponseIssues(options: { issues: readonly McpProtocolIssue[]; received: readonly number[]; required: readonly number[] }): McpProtocolIssue[] { const missing = options.required.filter((id) => !options.received.includes(id)); return missing.length === 0 ? [...options.issues] : [...options.issues, ...missing.map((id) => ({ code: 'missing-required-response', message: 'required JSON-RPC response was not received', detail: `id=${id}` }))]; }

const INITIALIZE_REQUEST_ID = 1;
const TOOLS_LIST_REQUEST_ID = 2;
const MIN_BUFFER_BYTES = 1024;
