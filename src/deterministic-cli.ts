import { InvalidArgumentError, type Command } from 'commander';
import { readFileSync } from 'node:fs';
import {
  agentStateExitCode,
  buildDecisionTemplate,
  collectHandoffState,
  listDecisionRecords,
  renderDecisionIndex,
  renderHandoffState,
  validateDecisionRecord,
  validateHandoffCapsule,
  type DecisionRecord,
} from './agent-state-report.js';
import { boundaryDiffExitCode, inspectBoundaryDiff, renderBoundaryDiff } from './boundary-diff.js';
import { mcpValidationExitCode, renderMcpValidation, validateMcpServer } from './mcp-server-validation.js';
import { buildVerificationReport, renderVerificationReport, verificationReportExitCode } from './verification-report.js';
import { collectVerifyResults } from './verify-results.js';
import { inspectWorkspace, renderWorkspacePreflight, workspacePreflightExitCode } from './workspace-preflight.js';

type OutputFormat = 'text' | 'json';

const DEFAULT_REPORT_LINES = 40;
const DEFAULT_GIT_TIMEOUT_MS = 5000;
const DEFAULT_GIT_BUFFER_BYTES = 1_048_576;
const DEFAULT_EDGE_LIMIT = 100;
const DEFAULT_MCP_OUTPUT_BYTES = 65_536;
const DEFAULT_SMALL_LIMIT = 5;
const DEFAULT_PATH_LIMIT = 20;

function positiveInteger(value: string): number {
  if (!/^\d+$/.test(value) || Number(value) <= 0 || !Number.isSafeInteger(Number(value))) {
    throw new InvalidArgumentError('expected a positive integer');
  }
  return Number(value);
}

export function parseOutputFormat(value: string): OutputFormat {
  if (value !== 'text' && value !== 'json') throw new InvalidArgumentError("expected 'text' or 'json'");
  return value;
}

function output(value: string): void {
  process.stdout.write(value.endsWith('\n') ? value : `${value}\n`);
}

function setExitCode(code: number): void {
  if (code !== 0) process.exitCode = code;
}

function collectString(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function registerVerificationReport(program: Command): void {
  program.command('verification-report')
    .description('Run installed verification gates and emit a deterministic evidence report')
    .option('--cwd <path>', 'Workspace to inspect')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .option('--max-output-lines <count>', 'Maximum retained lines per gate', positiveInteger, DEFAULT_REPORT_LINES)
    .option('--max-output-bytes <count>', 'Maximum retained bytes per gate', positiveInteger, DEFAULT_MCP_OUTPUT_BYTES)
    .action((options: { cwd?: string; format: OutputFormat; maxOutputLines: number; maxOutputBytes: number }) => {
      const run = collectVerifyResults({ cwd: options.cwd ?? process.cwd() });
      const invalid = run.exitCode === 2;
      const report = buildVerificationReport({
        changedFiles: run.changedFiles,
        gateResults: run.results,
        maxOutputLines: options.maxOutputLines,
        maxOutputBytes: options.maxOutputBytes,
        scopeEvidence: invalid ? { state: 'incomplete', summary: run.message } : { state: 'verified', summary: run.message },
      });
      output(renderVerificationReport(report, options.format));
      setExitCode(invalid ? 2 : verificationReportExitCode(report));
    });
}

function registerWorkspacePreflight(program: Command): void {
  program.command('workspace-preflight')
    .description('Inspect workspace isolation facts without changing repository state')
    .option('--cwd <path>', 'Workspace to inspect')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .option('--timeout-ms <count>', 'Per-git-command timeout', positiveInteger, DEFAULT_GIT_TIMEOUT_MS)
    .option('--max-buffer-bytes <count>', 'Maximum bytes retained from a git command', positiveInteger, DEFAULT_GIT_BUFFER_BYTES)
    .action((options: { cwd?: string; format: OutputFormat; timeoutMs: number; maxBufferBytes: number }) => {
      const report = inspectWorkspace({ cwd: options.cwd, gitTimeoutMs: options.timeoutMs, maxBufferBytes: options.maxBufferBytes });
      output(renderWorkspacePreflight(report, options.format));
      setExitCode(workspacePreflightExitCode(report));
    });
}

function registerBoundaryDiff(program: Command): void {
  program.command('boundary-diff')
    .description('Report changed JavaScript/TypeScript dependency edges from a git comparison')
    .requiredOption('--base <ref>', 'Base git reference')
    .option('--head <ref>', 'Head git reference; omit to inspect the working tree')
    .option('--cwd <path>', 'Repository to inspect')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .option('--max-edges <count>', 'Maximum reported edges', positiveInteger, DEFAULT_EDGE_LIMIT)
    .action((options: { base: string; head?: string; cwd?: string; format: OutputFormat; maxEdges: number }) => {
      const report = inspectBoundaryDiff({ cwd: options.cwd ?? process.cwd(), baseRef: options.base, headRef: options.head, maxEdges: options.maxEdges });
      output(renderBoundaryDiff(report, options.format));
      setExitCode(boundaryDiffExitCode(report));
    });
}

function registerMcpValidation(program: Command): void {
  program.command('mcp-validate <executable> [serverArgs...]')
    .description('Launch and validate an MCP stdio server without client registration')
    .option('--cwd <path>', 'Child process working directory')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .option('--timeout-ms <count>', 'Protocol timeout', positiveInteger, DEFAULT_GIT_TIMEOUT_MS)
    .option('--max-output-bytes <count>', 'Maximum retained stdout and stderr bytes', positiveInteger, DEFAULT_MCP_OUTPUT_BYTES)
    .action((...actionArgs: [string, string[], { cwd?: string; format: OutputFormat; timeoutMs: number; maxOutputBytes: number }]) => {
      const [executable, serverArgs, options] = actionArgs;
      const report = validateMcpServer({ executable, args: serverArgs, cwd: options.cwd, timeoutMs: options.timeoutMs, maxOutputBytes: options.maxOutputBytes });
      output(renderMcpValidation(report, options.format));
      setExitCode(mcpValidationExitCode(report));
    });
}

function registerHandoffCommand(parent: Command): void {
  const handoff = parent.command('handoff')
    .description('Collect repository facts and render a handoff capsule scaffold')
    .option('--cwd <path>', 'Repository to inspect')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .option('--commit-limit <count>', 'Maximum recent commits', positiveInteger, DEFAULT_SMALL_LIMIT)
    .option('--stash-limit <count>', 'Maximum stash entries', positiveInteger, DEFAULT_SMALL_LIMIT)
    .option('--path-limit <count>', 'Maximum paths per category', positiveInteger, DEFAULT_PATH_LIMIT)
    .option('--diagnostic-limit <count>', 'Maximum diagnostics', positiveInteger, DEFAULT_PATH_LIMIT)
    .action((options: { cwd?: string; format: OutputFormat; commitLimit: number; stashLimit: number; pathLimit: number; diagnosticLimit: number }) => {
      const report = collectHandoffState({ cwd: options.cwd ?? process.cwd(), commitLimit: options.commitLimit, stashLimit: options.stashLimit, pathLimit: options.pathLimit, diagnosticLimit: options.diagnosticLimit });
      output(renderHandoffState(report, options.format));
      setExitCode(agentStateExitCode(report));
    });
  handoff.command('validate <file>')
    .description('Validate required handoff sections and unresolved placeholders')
    .action((file: string) => {
      const format = (handoff.opts() as { format: OutputFormat }).format;
      const findings = validateHandoffCapsule(readFileSync(file, 'utf8'));
      const textFindings = findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n');
      const textOutput = textFindings.length > 0 ? textFindings : 'valid';
      const rendered = format === 'json'
        ? JSON.stringify({ version: 1, file, findings }, null, 2)
        : textOutput;
      output(rendered);
      setExitCode(findings.length > 0 ? 1 : 0);
    });
}

function registerDecisionList(parent: Command): void {
  parent.command('list')
    .description('List active decision metadata with optional deterministic filters')
    .option('--cwd <path>', 'Repository to inspect')
    .option('--dir <path>', 'Decision directory', 'docs/decisions')
    .option('--domain <domain>', 'Exact decision domain')
    .option('--trigger <trigger>', 'Trigger substring')
    .option('--path <path>', 'Path matched against applies_to globs')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .action((options: { cwd?: string; dir: string; domain?: string; trigger?: string; path?: string; format: OutputFormat }) => {
      const report = listDecisionRecords({ cwd: options.cwd ?? process.cwd(), dir: options.dir, domain: options.domain, trigger: options.trigger, path: options.path });
      output(renderDecisionIndex(report, options.format));
      setExitCode(agentStateExitCode(report));
    });
}

function registerDecisionValidate(parent: Command): void {
  parent.command('validate <file>')
    .description('Validate one decision record')
    .option('--format <format>', 'Output format: text or json', parseOutputFormat, 'text')
    .action((file: string, options: { format: OutputFormat }) => {
      const findings = validateDecisionRecord(file);
      const textFindings = findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n');
      const textOutput = textFindings.length > 0 ? textFindings : 'valid';
      const rendered = options.format === 'json'
        ? JSON.stringify({ version: 1, file, findings }, null, 2)
        : textOutput;
      output(rendered);
      setExitCode(findings.length > 0 ? 1 : 0);
    });
}

function registerDecisionTemplate(parent: Command): void {
  parent.command('template')
    .description('Render an in-memory decision-record template without writing a file')
    .requiredOption('--date <date>', 'Decision date in YYYY-MM-DD form')
    .requiredOption('--task <task>', 'Task that produced the decision')
    .requiredOption('--domain <domain>', 'Stable decision domain')
    .requiredOption('--kind <kind>', 'repo-policy, process, architecture, or code-convention')
    .requiredOption('--scope <scope>', 'repo, cross-cutting, or subtree')
    .option('--status <status>', 'active, superseded, or retired', 'active')
    .option('--trigger <trigger>', 'Repeatable retrieval trigger', collectString, [])
    .option('--applies-to <glob>', 'Repeatable affected path/glob', collectString, [])
    .option('--supersedes <path>', 'Repeatable superseded record', collectString, [])
    .action((options: { date: string; task: string; domain: string; kind: DecisionRecord['kind']; scope: DecisionRecord['scope']; status: DecisionRecord['status']; trigger: string[]; appliesTo: string[]; supersedes: string[] }) => {
      output(buildDecisionTemplate({ date: options.date, task: options.task, domain: options.domain, kind: options.kind, scope: options.scope, status: options.status, triggers: options.trigger, appliesTo: options.appliesTo, supersedes: options.supersedes }));
    });
}

function registerAgentState(program: Command): void {
  const parent = program.command('agent-state').description('Collect deterministic handoff and decision-record evidence');
  registerHandoffCommand(parent);
  const decisions = parent.command('decisions').description('List, validate, or scaffold decision records');
  registerDecisionList(decisions);
  registerDecisionValidate(decisions);
  registerDecisionTemplate(decisions);
}

export function registerDeterministicCommands(program: Command): void {
  registerVerificationReport(program);
  registerWorkspacePreflight(program);
  registerBoundaryDiff(program);
  registerMcpValidation(program);
  registerAgentState(program);
}
