import type { ManifestEntry } from './manifest.js';

const MIN_UNDERLINE_WIDTH = 4;
const ID_COLUMN_WIDTH = 34;
const TYPE_COLUMN_WIDTH = 10;

export function renderEntryList(entries: ManifestEntry[]): string {
  const byCategory = groupByCategory(entries);
  return Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, categoryEntries]) => renderCategory(category, categoryEntries))
    .join('\n');
}

function groupByCategory(entries: ManifestEntry[]): Map<string, ManifestEntry[]> {
  const byCategory = new Map<string, ManifestEntry[]>();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category) ?? [];
    bucket.push(entry);
    byCategory.set(entry.category, bucket);
  }
  return byCategory;
}

function renderCategory(category: string, entries: ManifestEntry[]): string {
  const lines = [`\n${category}`, '─'.repeat(Math.max(category.length, MIN_UNDERLINE_WIDTH))];
  for (const entry of entries.sort((a, b) => a.id.localeCompare(b.id))) {
    const marker = entry.required ? '★' : ' ';
    lines.push(`  ${marker} ${entry.id.padEnd(ID_COLUMN_WIDTH)} ${entry.type.padEnd(TYPE_COLUMN_WIDTH)} ${entry.description}`);
  }
  return lines.join('\n');
}
