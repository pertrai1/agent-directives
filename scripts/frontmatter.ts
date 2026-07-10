const FRONTMATTER_OPEN_LENGTH = 4;

interface ParseListOptions {
  lines: string[];
  start: number;
  indent: number;
}

interface ParseMappingOptions {
  lines: string[];
  start: number;
  baseIndent: number;
}

interface ParsedValue {
  value: unknown;
  next: number;
}

function unquoteYamlScalar(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function parseScalar(value: string): string | boolean {
  const unquoted = unquoteYamlScalar(value);
  if (unquoted === 'true') return true;
  if (unquoted === 'false') return false;
  return unquoted;
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function parseList({ lines, start, indent }: ParseListOptions): { value: string[]; next: number } {
  const value: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (indentation(line) !== indent || !line.trimStart().startsWith('- ')) break;
    value.push(unquoteYamlScalar(line.trimStart().replace(/^-\s+/, '')));
    i++;
  }
  return { value, next: i };
}

function nextContentLine(lines: string[], start: number): { line: string; indent: number } | undefined {
  const line = lines.slice(start).find((candidate) => candidate.trim());
  return line ? { line, indent: indentation(line) } : undefined;
}

function parseNestedValue({ lines, start, parentIndent }: { lines: string[]; start: number; parentIndent: number }): ParsedValue {
  const next = nextContentLine(lines, start);
  if (!next) return { value: [], next: start };
  if (next.line.trimStart().startsWith('- ') && next.indent >= parentIndent) {
    return parseList({ lines, start, indent: next.indent });
  }
  if (next.indent > parentIndent) {
    return parseMapping({ lines, start, baseIndent: next.indent });
  }
  return { value: [], next: start };
}

function parseMapping({ lines, start, baseIndent }: ParseMappingOptions): { value: Record<string, unknown>; next: number } {
  const value: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const lineIndent = indentation(line);
    if (lineIndent < baseIndent) break;

    const match = line.trimStart().match(/^(\w[\w-]*):\s*(.*)$/);
    if (lineIndent > baseIndent || !match) {
      i++;
      continue;
    }

    const [, key, rawValue] = match;
    if (rawValue) {
      value[key] = parseScalar(rawValue);
      i++;
      continue;
    }

    const parsed = parseNestedValue({ lines, start: i + 1, parentIndent: lineIndent });
    value[key] = parsed.value;
    i = parsed.next === i + 1 ? i + 1 : parsed.next;
  }
  return { value, next: i };
}

export function parseFrontmatterBlock(fm: string): Record<string, unknown> {
  return parseMapping({ lines: fm.split('\n'), start: 0, baseIndent: 0 }).value;
}

export function parseFrontmatter(text: string): Record<string, unknown> {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return {};
  const end = normalized.indexOf('\n---\n', FRONTMATTER_OPEN_LENGTH);
  if (end === -1) return {};
  const raw = normalized.slice(FRONTMATTER_OPEN_LENGTH, end);
  return parseFrontmatterBlock(raw);
}
