import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterEntries, packageRoot, type ManifestEntry } from './manifest.js';

export interface ContextAuditOptions {
  tool?: string;
  requiredOnly?: boolean;
  maxTokens?: number;
  largest?: number;
}

export interface ContextAuditEntry {
  id: string;
  type: ManifestEntry['type'];
  path: string;
  required: boolean;
  category: string;
  bytes: number;
  estimatedTokens: number;
}

export interface ContextAuditResult {
  tool?: string;
  entries: ContextAuditEntry[];
  totalBytes: number;
  estimatedTokens: number;
  requiredEntries: number;
  optionalEntries: number;
  largestEntries: ContextAuditEntry[];
  maxTokens?: number;
  overBudget: boolean;
}

const DEFAULT_LARGEST_COUNT = 10;
const TOKEN_CHARS = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_CHARS);
}

function auditEntry(entry: ManifestEntry): ContextAuditEntry {
  let content: string;
  try {
    content = readFileSync(join(packageRoot, entry.path), 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const wrappedError = new Error(`Failed to read manifest entry '${entry.id}' at '${entry.path}': ${reason}`) as Error & { cause?: unknown };
    wrappedError.cause = error;
    throw wrappedError;
  }
  return {
    id: entry.id,
    type: entry.type,
    path: entry.path,
    required: entry.required,
    category: entry.category,
    bytes: Buffer.byteLength(content, 'utf8'),
    estimatedTokens: estimateTokens(content),
  };
}

export function buildContextAudit(entries: ManifestEntry[], options: ContextAuditOptions = {}): ContextAuditResult {
  const filtered = filterEntries(entries, {
    tool: options.tool,
    required: options.requiredOnly ? true : undefined,
  });
  const audited = filtered.map(auditEntry).sort((a, b) => a.id.localeCompare(b.id));
  const totalBytes = audited.reduce((sum, entry) => sum + entry.bytes, 0);
  const estimatedTokens = audited.reduce((sum, entry) => sum + entry.estimatedTokens, 0);
  const largestCount = options.largest ?? DEFAULT_LARGEST_COUNT;
  const largestEntries = [...audited]
    .sort((a, b) => {
      const tokenDelta = b.estimatedTokens - a.estimatedTokens;
      return tokenDelta === 0 ? a.id.localeCompare(b.id) : tokenDelta;
    })
    .slice(0, largestCount);

  return {
    tool: options.tool,
    entries: audited,
    totalBytes,
    estimatedTokens,
    requiredEntries: audited.filter((entry) => entry.required).length,
    optionalEntries: audited.filter((entry) => !entry.required).length,
    largestEntries,
    maxTokens: options.maxTokens,
    overBudget: options.maxTokens !== undefined && estimatedTokens > options.maxTokens,
  };
}

export function renderContextAudit(result: ContextAuditResult): string {
  const scope = result.tool ? ` for ${result.tool}` : '';
  const lines = [
    `Context audit${scope}`,
    `Estimated prompt tokens: ${result.estimatedTokens.toLocaleString()} (${result.totalBytes.toLocaleString()} bytes)`,
    `Always-loaded entries: ${result.requiredEntries}`,
    `Lazy/optional entries: ${result.optionalEntries}`,
  ];

  if (result.maxTokens !== undefined) {
    lines.push(`Budget: ${result.maxTokens.toLocaleString()} tokens — ${result.overBudget ? 'FAIL' : 'PASS'}`);
  }

  lines.push('', 'Largest entries:');
  for (const entry of result.largestEntries) {
    const load = entry.required ? 'required' : 'optional';
    lines.push(`  - ${entry.id} (${entry.estimatedTokens.toLocaleString()} tokens, ${load}, ${entry.path})`);
  }

  return `${lines.join('\n')}\n`;
}
