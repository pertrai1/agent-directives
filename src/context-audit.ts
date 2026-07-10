import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterEntries, packageRoot, type ManifestEntry } from './manifest.js';

export interface ContextAuditOptions {
  tool?: string;
  requiredOnly?: boolean;
  selectedEntryIds?: string[];
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
  selectedEntryIds?: string[];
  comparison?: ContextAuditComparison;
  maxTokens?: number;
  overBudget: boolean;
}

export interface ContextAuditComparison {
  availableEntries: number;
  availableBytes: number;
  availableEstimatedTokens: number;
  savingsTokens: number;
  savingsPercent: number;
}

export class ContextAuditSelectionError extends Error {
  override name = 'ContextAuditSelectionError';
}

interface EntrySelection {
  selectedEntryIds?: string[];
  entries: ManifestEntry[];
  available: ManifestEntry[];
}

interface EntryTotals {
  bytes: number;
  estimatedTokens: number;
}

const DEFAULT_LARGEST_COUNT = 10;
const TOKEN_CHARS = 4;
const PERCENT_SCALE = 100;

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

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function selectedIdsFromOptions(options: ContextAuditOptions): string[] | undefined {
  return options.selectedEntryIds && options.selectedEntryIds.length > 0 ? uniqueIds(options.selectedEntryIds) : undefined;
}

function formatIdList(ids: string[]): string {
  return ids.map((id) => `'${id}'`).join(', ');
}

function resolveSelectedEntries(options: { entries: ManifestEntry[]; ids: string[]; tool?: string }): ManifestEntry[] {
  const { entries, ids, tool } = options;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    throw new ContextAuditSelectionError(`Unknown --entries id${unknown.length === 1 ? '' : 's'}: ${formatIdList(unknown)}.`);
  }

  const selected = ids.map((id) => byId.get(id) as ManifestEntry);
  if (!tool) return selected;

  const unsupported = selected.filter((entry) => !entry.tools.includes(tool));
  if (unsupported.length > 0) {
    const details = unsupported.map((entry) => `'${entry.id}' (supports: ${entry.tools.join(', ')})`).join(', ');
    throw new ContextAuditSelectionError(`Selected entr${unsupported.length === 1 ? 'y does' : 'ies do'} not support tool '${tool}': ${details}.`);
  }

  return selected;
}

function selectEntries(entries: ManifestEntry[], options: ContextAuditOptions): EntrySelection {
  const selectedEntryIds = selectedIdsFromOptions(options);
  const available = filterEntries(entries, { tool: options.tool });
  if (selectedEntryIds) {
    return {
      selectedEntryIds,
      available,
      entries: resolveSelectedEntries({ entries, ids: selectedEntryIds, tool: options.tool }),
    };
  }

  return {
    available,
    entries: filterEntries(entries, {
      tool: options.tool,
      required: options.requiredOnly ? true : undefined,
    }),
  };
}

function auditEntries(entries: ManifestEntry[]): ContextAuditEntry[] {
  return entries.map(auditEntry).sort((a, b) => a.id.localeCompare(b.id));
}

function totalEntries(entries: ContextAuditEntry[]): EntryTotals {
  return {
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    estimatedTokens: entries.reduce((sum, entry) => sum + entry.estimatedTokens, 0),
  };
}

function largestEntries(entries: ContextAuditEntry[], count: number): ContextAuditEntry[] {
  return [...entries]
    .sort((a, b) => {
      const tokenDelta = b.estimatedTokens - a.estimatedTokens;
      return tokenDelta === 0 ? a.id.localeCompare(b.id) : tokenDelta;
    })
    .slice(0, count);
}

function buildComparison(options: { selected?: string[]; available: ManifestEntry[]; selectedTotals: EntryTotals }): ContextAuditComparison | undefined {
  if (!options.selected) return undefined;
  const availableAudited = options.available.map(auditEntry);
  const availableTotals = totalEntries(availableAudited);
  const savingsTokens = availableTotals.estimatedTokens - options.selectedTotals.estimatedTokens;
  return {
    availableEntries: availableAudited.length,
    availableBytes: availableTotals.bytes,
    availableEstimatedTokens: availableTotals.estimatedTokens,
    savingsTokens,
    savingsPercent: availableTotals.estimatedTokens === 0 ? 0 : (savingsTokens / availableTotals.estimatedTokens) * PERCENT_SCALE,
  };
}

export function buildContextAudit(entries: ManifestEntry[], options: ContextAuditOptions = {}): ContextAuditResult {
  const selection = selectEntries(entries, options);
  const audited = auditEntries(selection.entries);
  const totals = totalEntries(audited);
  const comparison = buildComparison({ selected: selection.selectedEntryIds, available: selection.available, selectedTotals: totals });

  return {
    tool: options.tool,
    entries: audited,
    totalBytes: totals.bytes,
    estimatedTokens: totals.estimatedTokens,
    requiredEntries: audited.filter((entry) => entry.required).length,
    optionalEntries: audited.filter((entry) => !entry.required).length,
    largestEntries: largestEntries(audited, options.largest ?? DEFAULT_LARGEST_COUNT),
    selectedEntryIds: selection.selectedEntryIds,
    comparison,
    maxTokens: options.maxTokens,
    overBudget: options.maxTokens !== undefined && totals.estimatedTokens > options.maxTokens,
  };
}

export function renderContextAudit(result: ContextAuditResult): string {
  const scope = result.tool ? ` for ${result.tool}` : '';
  const lines = [
    `Context audit${scope}${result.selectedEntryIds ? ' selected entries' : ''}`,
    `Estimated prompt tokens: ${result.estimatedTokens.toLocaleString()} (${result.totalBytes.toLocaleString()} bytes)`,
    `Always-loaded entries: ${result.requiredEntries}`,
    `Lazy/optional entries: ${result.optionalEntries}`,
  ];

  if (result.comparison) {
    lines.splice(1, 0,
      `Selected entries: ${result.entries.length} (${result.estimatedTokens.toLocaleString()} tokens, ${result.totalBytes.toLocaleString()} bytes)`,
      `Available entries${scope}: ${result.comparison.availableEntries} (${result.comparison.availableEstimatedTokens.toLocaleString()} tokens, ${result.comparison.availableBytes.toLocaleString()} bytes)`,
      `Estimated savings: ${result.comparison.savingsTokens.toLocaleString()} tokens (${result.comparison.savingsPercent.toFixed(1)}%)`,
    );
  }

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
