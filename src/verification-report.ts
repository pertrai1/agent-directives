import { inspect } from 'node:util';
import type { VerifyResult } from './verify-runtime.js';

export const VERIFICATION_REPORT_VERSION = 1 as const;

export type VerificationGateStatus = VerifyResult['status'];

export interface VerificationGateResult extends Pick<VerifyResult, 'name' | 'command' | 'status'> {
  error?: string;
  output?: string;
}

export interface VerificationEvidenceEntry {
  state: 'verified' | 'unverified' | 'incomplete' | 'malformed';
  summary?: string;
  details?: string;
}

export interface VerificationReportInput {
  changedFiles: readonly string[];
  gateResults: readonly VerificationGateResult[];
  maxOutputLines: number;
  maxOutputBytes?: number;
  testEvidence?: VerificationEvidenceEntry;
  functionalEvidence?: VerificationEvidenceEntry;
  integrationEvidence?: VerificationEvidenceEntry;
  docsEvidence?: VerificationEvidenceEntry;
  scopeEvidence?: VerificationEvidenceEntry;
  blockingFindings?: readonly string[];
}

export interface VerificationGateReport {
  name: string;
  command: string;
  status: VerificationGateStatus;
  error?: string;
  excerpt?: string;
}

export interface VerificationReportEvidence {
  state: 'verified' | 'unverified' | 'incomplete' | 'malformed';
  summary?: string;
  details?: string;
}

export interface VerificationReport {
  version: typeof VERIFICATION_REPORT_VERSION;
  changedFiles: string[];
  gates: VerificationGateReport[];
  evidence: {
    test: VerificationReportEvidence;
    functional: VerificationReportEvidence;
    integration: VerificationReportEvidence;
    docs: VerificationReportEvidence;
    scope: VerificationReportEvidence;
  };
  blockingFindings: string[];
}

type RenderFormat = 'text' | 'json';
const DEFAULT_MAX_OUTPUT_BYTES = 65_536;

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer; received ${inspect(value)}`);
  }
}

function sortedCopy(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeEvidence(entry?: VerificationEvidenceEntry): VerificationReportEvidence {
  if (!entry) {
    return { state: 'unverified' };
  }
  return {
    state: entry.state,
    summary: entry.summary,
    details: entry.details,
  };
}

function retainByteTail(output: string, maxOutputBytes: number): string {
  const bytes = Buffer.from(output, 'utf8');
  if (bytes.length <= maxOutputBytes) return output;
  const marker = `... byte-truncated ${bytes.length - maxOutputBytes} byte(s); showing tail\n`;
  const markerBytes = Buffer.from(marker, 'utf8');
  if (markerBytes.length >= maxOutputBytes) return markerBytes.subarray(0, maxOutputBytes).toString('utf8');
  const tailBytes = maxOutputBytes - markerBytes.length;
  return `${marker}${bytes.subarray(bytes.length - tailBytes).toString('utf8')}`;
}

function normalizeExcerpt(options: { output: string | undefined; maxOutputLines: number; maxOutputBytes: number }): string | undefined {
  const { output, maxOutputLines, maxOutputBytes } = options;
  if (output === undefined) {
    return undefined;
  }
  const lines = output.split(/\r?\n/);
  const lineBounded = lines.length <= maxOutputLines
    ? output
    : `... truncated ${lines.length - maxOutputLines} line(s); showing last ${maxOutputLines} line(s)\n${lines.slice(-maxOutputLines).join('\n')}`;
  return retainByteTail(lineBounded, maxOutputBytes);
}

function normalizeGate(gate: VerificationGateResult, limits: { maxOutputLines: number; maxOutputBytes: number }): VerificationGateReport {
  return {
    name: gate.name,
    command: gate.command,
    status: gate.status,
    error: gate.error,
    excerpt: normalizeExcerpt({ output: gate.output, maxOutputLines: limits.maxOutputLines, maxOutputBytes: limits.maxOutputBytes }),
  };
}

export function buildVerificationReport(input: VerificationReportInput): VerificationReport {
  requirePositiveInteger(input.maxOutputLines, 'maxOutputLines');
  const maxOutputBytes = input.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  requirePositiveInteger(maxOutputBytes, 'maxOutputBytes');
  const changedFiles = sortedCopy(input.changedFiles);
  const gates = [...input.gateResults]
    .map((gate) => normalizeGate(gate, { maxOutputLines: input.maxOutputLines, maxOutputBytes }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    version: VERIFICATION_REPORT_VERSION,
    changedFiles,
    gates,
    evidence: {
      test: normalizeEvidence(input.testEvidence),
      functional: normalizeEvidence(input.functionalEvidence),
      integration: normalizeEvidence(input.integrationEvidence),
      docs: normalizeEvidence(input.docsEvidence),
      scope: normalizeEvidence(input.scopeEvidence),
    },
    blockingFindings: sortedCopy(input.blockingFindings ?? []),
  };
}

function renderEvidenceLine(label: string, evidence: VerificationReportEvidence): string {
  const summary = evidence.summary ? ` — ${evidence.summary}` : '';
  const details = evidence.details ? `\n  ${evidence.details}` : '';
  return `- ${label}: ${evidence.state.toUpperCase()}${summary}${details}`;
}

function renderListSection(options: { label: string; values: readonly string[]; indent?: string }): string[] {
  const { label, values, indent = '  ' } = options;
  const lines = [`- ${label}:`];
  if (values.length === 0) {
    lines.push(`${indent}- none`);
    return lines;
  }
  for (const value of values) {
    lines.push(`${indent}- ${value}`);
  }
  return lines;
}

function renderGateSection(gate: VerificationGateReport): string[] {
  const lines = [`  - ${gate.name} [${gate.status}]`, `    command: ${gate.command}`];
  if (gate.error) {
    lines.push(`    error: ${gate.error}`);
  }
  if (gate.excerpt) {
    lines.push('    excerpt: |');
    for (const excerptLine of gate.excerpt.split(/\r?\n/)) {
      lines.push(`      ${excerptLine}`);
    }
  }
  return lines;
}

export function renderVerificationReport(report: VerificationReport, format: RenderFormat): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [];
  lines.push('## Verification report');
  lines.push('');
  lines.push(`- version: ${report.version}`);
  lines.push(...renderListSection({ label: 'changed files', values: report.changedFiles }));
  lines.push('- gates:');
  if (report.gates.length === 0) {
    lines.push('  - none');
  } else {
    for (const gate of report.gates) {
      lines.push(...renderGateSection(gate));
    }
  }
  lines.push('- evidence:');
  lines.push(renderEvidenceLine('test', report.evidence.test));
  lines.push(renderEvidenceLine('functional', report.evidence.functional));
  lines.push(renderEvidenceLine('integration', report.evidence.integration));
  lines.push(renderEvidenceLine('docs', report.evidence.docs));
  lines.push(renderEvidenceLine('scope', report.evidence.scope));
  lines.push(...renderListSection({ label: 'blocking findings', values: report.blockingFindings }));
  return `${lines.join('\n')}\n`;
}

export function verificationReportExitCode(report: VerificationReport): 0 | 1 | 2 {
  const hasMalformedEvidence = Object.values(report.evidence).some((entry) => entry.state === 'incomplete' || entry.state === 'malformed');
  if (hasMalformedEvidence) {
    return 2;
  }
  if (report.gates.some((gate) => gate.status === 'failed') || report.blockingFindings.length > 0) {
    return 1;
  }
  return 0;
}
