export interface ValidateMcpServerOptions { executable: string; args: readonly string[]; cwd?: string; timeoutMs: number; maxOutputBytes: number; }
export interface McpProtocolIssue { code: string; message: string; detail?: string; }
export interface McpToolFinding { name: string; issues: readonly McpProtocolIssue[]; }
export interface McpValidationReport { version: 1; status: 'ok' | 'findings' | 'protocol-error'; executable: string; args: readonly string[]; timeoutMs: number; maxOutputBytes: number; child: { completed: boolean; exitCode: number | null; signal: NodeJS.Signals | null; timedOut: boolean; }; stdoutBytes: number; stderrBytes: number; stdout: string; stderr: string; protocol: { requestIds: readonly number[]; responseIds: readonly number[]; notifications: readonly string[]; }; findings: readonly McpToolFinding[]; protocolIssues: readonly McpProtocolIssue[]; }
export type McpValidationFormat = 'text' | 'json';
export interface McpParseState { protocolIssues: McpProtocolIssue[]; responseIds: number[]; notifications: string[]; tools: unknown[] | null; }
export interface McpValidationResult { executable: string; args: readonly string[]; timeoutMs: number; maxOutputBytes: number; child: McpValidationReport['child']; stdout: string; stderr: string; responseIds: readonly number[]; notifications: readonly string[]; findings: readonly McpToolFinding[]; protocolIssues: readonly McpProtocolIssue[]; requiredResponseIds: readonly number[]; }
interface JsonRecord { jsonrpc?: unknown; id?: unknown; method?: unknown; result?: unknown; error?: unknown; }

const REQUEST_IDS = [1, 2] as const;
const DETAIL_PREVIEW_CHARS = 120;
const MIN_VAGUE_NAME_LENGTH = 4;
const VAGUE_TOOL_NAMES = new Set(['run', 'query', 'doThing', 'tool', 'action', 'task', 'execute', 'command']);
const VAGUE_DESCRIPTIONS = new Set(['', 'todo', 'tbd', 'placeholder', 'tool', 'command', 'mcp tool']);
const STRING_BOUNDS = ['minLength', 'maxLength', 'pattern', 'enum'] as const;
const NUMERIC_BOUNDS = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum'] as const;
const ARRAY_BOUNDS = ['minItems', 'maxItems'] as const;
const VAGUE_LIMIT_HINTS = ['limit', 'page size', 'page-size'] as const;

export function buildMcpRequestLines(): readonly string[] {
  return [
    JSON.stringify({ jsonrpc: '2.0', id: REQUEST_IDS[0], method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'agent-directives', version: '1.0.0' } } }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', id: REQUEST_IDS[1], method: 'tools/list', params: {} }),
  ];
}

export function parseMcpValidationOutput(options: { stdout: string; state: McpParseState }): void {
  for (const rawLine of options.stdout.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    const parsed = parseJsonLine(line, options.state.protocolIssues);
    if (parsed === null) continue;
    readEnvelope(parsed, options.state);
  }
}

export function analyzeMcpTools(options: { tools: readonly unknown[] }): readonly McpToolFinding[] { const findings: McpToolFinding[] = []; const seenNames = new Set<string>(); for (const tool of options.tools) { if (!isRecord(tool)) continue; const finding = inspectTool(tool, seenNames); if (finding !== null) findings.push(finding); } return findings; }

export function deriveMcpValidationStatus(result: McpValidationResult): McpValidationReport['status'] { if (result.child.timedOut || result.child.signal !== null || result.child.exitCode === null) return 'protocol-error'; if (result.protocolIssues.length > 0) return 'protocol-error'; if (hasMissingResponses(result.responseIds, result.requiredResponseIds)) return 'protocol-error'; if (result.findings.length > 0) return 'findings'; return 'ok'; }

export function createMcpValidationReport(options: {
  executable: string;
  args: readonly string[];
  timeoutMs: number;
  maxOutputBytes: number;
  child: McpValidationReport['child'];
  stdout: string;
  stderr: string;
  responseIds: readonly number[];
  notifications: readonly string[];
  findings: readonly McpToolFinding[];
  protocolIssues: readonly McpProtocolIssue[];
  requiredResponseIds: readonly number[];
}): McpValidationResult {
  return {
    executable: options.executable,
    args: [...options.args],
    timeoutMs: options.timeoutMs,
    maxOutputBytes: options.maxOutputBytes,
    child: options.child,
    stdout: options.stdout,
    stderr: options.stderr,
    responseIds: options.responseIds,
    notifications: options.notifications,
    findings: options.findings,
    protocolIssues: options.protocolIssues,
    requiredResponseIds: options.requiredResponseIds,
  };
}

function parseJsonLine(line: string, issues: McpProtocolIssue[]): JsonRecord | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    if (isRecord(parsed)) return parsed as JsonRecord;
  } catch {
    issues.push({ code: 'malformed-json', message: 'stdout contained a non-JSON line', detail: line.slice(0, DETAIL_PREVIEW_CHARS) });
    return null;
  }
  issues.push({ code: 'invalid-envelope', message: 'stdout line was not a JSON object' });
  return null;
}

function readEnvelope(envelope: JsonRecord, state: McpParseState): void {
  if (envelope.jsonrpc !== '2.0') {
    state.protocolIssues.push({ code: 'invalid-envelope', message: 'response envelope must declare jsonrpc 2.0' });
    return;
  }
  if (typeof envelope.method === 'string') {
    state.notifications.push(envelope.method);
    return;
  }
  if (!isValidResponseId(envelope.id)) {
    state.protocolIssues.push({ code: 'invalid-envelope', message: 'response is missing a valid id' });
    return;
  }
  state.responseIds.push(envelope.id);
  if (envelope.error !== undefined) {
    state.protocolIssues.push({ code: 'rpc-error', message: 'response contained an error object' });
    return;
  }
  if (!isRecord(envelope.result)) {
    state.protocolIssues.push({ code: 'invalid-envelope', message: 'response missing result object' });
    return;
  }
  if (envelope.id === REQUEST_IDS[1]) {
    state.tools = readToolsList(envelope.result, state.protocolIssues);
  }
}

function readToolsList(result: Record<string, unknown>, issues: McpProtocolIssue[]): unknown[] | null {
  const tools = result.tools;
  if (!Array.isArray(tools)) {
    issues.push({ code: 'invalid-tools-list', message: 'tools/list result missing tools array' });
    return null;
  }
  return tools;
}

function inspectTool(tool: Record<string, unknown>, seenNames: Set<string>): McpToolFinding | null { const name = typeof tool.name === 'string' ? tool.name.trim() : ''; const issues: McpProtocolIssue[] = []; const identifier = name.length > 0 ? name : '(unnamed tool)'; inspectToolIdentity({ name, issues, seenNames }); inspectToolDescription({ tool, issues, identifier }); inspectToolAnnotations({ tool, issues, identifier }); const schema = isRecord(tool.inputSchema) ? tool.inputSchema : null; if (schema === null) issues.push({ code: 'non-object-schema', message: 'inputSchema must be an object', detail: identifier }); else inspectToolSchema({ schema, issues, identifier }); return issues.length > 0 ? { name: identifier, issues: sortIssues(issues) } : null; }

function inspectToolAnnotations(options: { tool: Record<string, unknown>; issues: McpProtocolIssue[]; identifier: string }): void { const annotations = options.tool.annotations; if (annotations === undefined) return; if (!isRecord(annotations)) { options.issues.push({ code: 'invalid-annotations', message: 'annotations must be an object', detail: options.identifier }); return; } for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'] as const) { const value = annotations[key]; if (value !== undefined && typeof value !== 'boolean') options.issues.push({ code: 'invalid-annotation-flag', message: `${key} must be a boolean`, detail: options.identifier }); } }

function inspectToolIdentity(options: { name: string; issues: McpProtocolIssue[]; seenNames: Set<string> }): void { const lower = options.name.toLowerCase(); if (options.seenNames.has(lower)) options.issues.push({ code: 'duplicate-tool-name', message: 'duplicate tool name', detail: options.name }); options.seenNames.add(lower); if (isVagueName(lower)) options.issues.push({ code: 'vague-tool-name', message: 'tool name is too vague', detail: options.name }); }

function inspectToolDescription(options: { tool: Record<string, unknown>; issues: McpProtocolIssue[]; identifier: string }): void { const description = typeof options.tool.description === 'string' ? options.tool.description.trim().toLowerCase() : ''; if (VAGUE_DESCRIPTIONS.has(description)) options.issues.push({ code: 'vague-description', message: 'tool description is empty or vague', detail: options.identifier }); }

function inspectToolSchema(options: { schema: Record<string, unknown>; issues: McpProtocolIssue[]; identifier: string }): void { inspectSchemaNode({ schema: options.schema, issues: options.issues, toolName: options.identifier }); inspectRequiredProperties({ schema: options.schema, issues: options.issues, toolName: options.identifier }); }

function inspectRequiredProperties(options: { schema: Record<string, unknown>; issues: McpProtocolIssue[]; toolName: string }): void { const required = readStringList(options.schema.required); const properties = isRecord(options.schema.properties) ? options.schema.properties : null; if (properties === null || required.length === 0) return; for (const requiredName of required.sort()) { if (!(requiredName in properties)) options.issues.push({ code: 'missing-required-property', message: 'required property is absent from properties', detail: `${options.toolName}:${requiredName}` }); } }

function inspectSchemaNode(options: { schema: Record<string, unknown>; issues: McpProtocolIssue[]; toolName: string }): void { collectMissingBounds(options); collectSchemaChildren(options); }

function collectMissingBounds(options: { schema: Record<string, unknown>; issues: McpProtocolIssue[]; toolName: string }): void { if (isArrayType(options.schema.type) && !hasAnyBound(options.schema, ARRAY_BOUNDS)) options.issues.push({ code: 'unbounded-collection', message: 'array schema lacks item bounds', detail: options.toolName }); if (isStringType(options.schema.type) && !hasAnyBound(options.schema, STRING_BOUNDS)) options.issues.push({ code: 'unbounded-string', message: 'string schema lacks applicable bounds', detail: options.toolName }); if (isNumericType(options.schema.type) && !hasAnyBound(options.schema, NUMERIC_BOUNDS)) options.issues.push({ code: 'unbounded-number', message: 'numeric schema lacks applicable bounds', detail: options.toolName }); if (hasLimitHint(options.schema.description) && !hasAnyBound(options.schema, NUMERIC_BOUNDS)) options.issues.push({ code: 'unbounded-limit-field', message: 'limit/page-size field lacks bounds', detail: options.toolName }); }

function collectSchemaChildren(options: { schema: Record<string, unknown>; issues: McpProtocolIssue[]; toolName: string }): void { if (!isRecord(options.schema.properties)) return; for (const propertyName of Object.keys(options.schema.properties).sort()) { const propertyValue = options.schema.properties[propertyName]; if (isRecord(propertyValue)) inspectSchemaNode({ schema: propertyValue, issues: options.issues, toolName: `${options.toolName}.${propertyName}` }); } }

function readStringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }

function hasAnyBound(schema: Record<string, unknown>, keys: readonly string[]): boolean { return keys.some((key) => key in schema); }

function hasLimitHint(description: unknown): boolean { if (typeof description !== 'string') return false; const lower = description.toLowerCase(); return VAGUE_LIMIT_HINTS.some((hint) => lower.includes(hint)); }

function isArrayType(type: unknown): boolean { return type === 'array' || (Array.isArray(type) && type.includes('array')); }

function isStringType(type: unknown): boolean { return type === 'string' || (Array.isArray(type) && type.includes('string')); }

function isNumericType(type: unknown): boolean { return type === 'number' || type === 'integer' || (Array.isArray(type) && (type.includes('number') || type.includes('integer'))); }

function isVagueName(name: string): boolean { return name.length < MIN_VAGUE_NAME_LENGTH || VAGUE_TOOL_NAMES.has(name); }

function sortIssues(issues: McpProtocolIssue[]): McpProtocolIssue[] { return [...issues].sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message) || (a.detail ?? '').localeCompare(b.detail ?? '')); }

function isValidResponseId(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

function hasMissingResponses(received: readonly number[], required: readonly number[]): boolean { return required.some((id) => !received.includes(id)); }
