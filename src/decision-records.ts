import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { matchGlob } from "./glob.js";

export interface DecisionRecord {
  path: string;
  date?: string;
  task?: string;
  domain?: string;
  kind?: string;
  scope?: string;
  status?: string;
  triggers?: string[];
  applies_to?: string[];
  supersedes?: string[];
  body: string;
  findings: string[];
}

export interface DecisionListOptions {
  cwd: string;
  dir?: string;
  domain?: string;
  trigger?: string;
  path?: string;
}

export interface DecisionListReport {
  cwd: string;
  records: DecisionRecord[];
  diagnostics: string[];
}

export interface ValidationFinding {
  path?: string;
  code: string;
  message: string;
}

const VALID_KINDS = ["repo-policy", "process", "architecture", "code-convention"] as const;
const VALID_SCOPES = ["repo", "cross-cutting", "subtree"] as const;
const VALID_STATUSES = ["active", "superseded", "retired"] as const;

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter(Boolean);
}

function collectDecisionFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectDecisionFiles(full);
    return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
  });
  return files.sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(text: string): { frontmatter: string; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return { frontmatter: match?.[1] ?? "", body: match?.[2] ?? "" };
}

function parseFrontmatterMap(frontmatter: string): Record<string, string[]> {
  const data: Record<string, string[]> = {};
  let currentKey = "";
  for (const line of splitLines(frontmatter)) {
    const keyValue = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    const item = line.match(/^\s*-\s+(.*)$/);
    if (keyValue) {
      currentKey = keyValue[1];
      data[currentKey] = keyValue[2] ? [keyValue[2]] : [];
      continue;
    }
    if (item && currentKey) data[currentKey].push(item[1]);
  }
  return data;
}

function scalar(data: Record<string, string[]>, key: string): string | undefined {
  return data[key]?.[0]?.trim();
}

function list(data: Record<string, string[]>, key: string): string[] | undefined {
  return data[key]?.map((value) => value.trim()).filter(Boolean);
}

function readDecisionFile(pathname: string): DecisionRecord {
  const text = readFileSync(pathname, "utf8");
  const { frontmatter, body } = parseFrontmatter(text);
  const data = parseFrontmatterMap(frontmatter);
  return {
    path: pathname,
    date: scalar(data, "date"),
    task: scalar(data, "task"),
    domain: scalar(data, "domain"),
    kind: scalar(data, "kind"),
    scope: scalar(data, "scope"),
    status: scalar(data, "status"),
    triggers: list(data, "triggers"),
    applies_to: list(data, "applies_to"),
    supersedes: list(data, "supersedes"),
    body: body.trim(),
    findings: [],
  };
}

function isValidCalendarDate(value: string | undefined): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const [year, month, day] = (value ?? "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function filenameDate(pathname: string): string | undefined {
  return pathname.split(/[\\/]/).pop()?.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
}

function validateDate(record: DecisionRecord, findings: string[]): void {
  if (!isValidCalendarDate(record.date)) findings.push("invalid or missing date");
  const fileDate = filenameDate(record.path);
  if (fileDate && record.date && fileDate !== record.date) findings.push("filename date does not match frontmatter date");
}

function validateFilename(record: DecisionRecord, findings: string[]): void {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/i.test(record.path.split(/[\\/]/).pop() ?? "")) findings.push("invalid decision filename");
}

function validateRequiredFields(record: DecisionRecord, findings: string[]): void {
  for (const field of ["task", "domain", "kind", "scope", "status"] as const) {
    if (!record[field]) findings.push(`missing field: ${field}`);
  }
}

function validateEnumFields(record: DecisionRecord, findings: string[]): void {
  if (record.kind && !VALID_KINDS.includes(record.kind as (typeof VALID_KINDS)[number])) findings.push("invalid kind");
  if (record.scope && !VALID_SCOPES.includes(record.scope as (typeof VALID_SCOPES)[number])) findings.push("invalid scope");
  if (record.status && !VALID_STATUSES.includes(record.status as (typeof VALID_STATUSES)[number])) findings.push("invalid status");
}

function validateLists(record: DecisionRecord, findings: string[]): void {
  if (!(record.triggers?.length ?? 0)) findings.push("missing triggers");
  if (!(record.applies_to?.length ?? 0)) findings.push("missing applies_to");
}

function validateFrontmatterPlaceholders(record: DecisionRecord, findings: string[]): void {
  const values = [record.date, record.task, record.domain, record.kind, record.scope, record.status, ...(record.triggers ?? []), ...(record.applies_to ?? []), ...(record.supersedes ?? [])];
  if (values.some((value) => value && /\[[^\]]+\]|\bTODO\b|\bTBD\b|<[^>]+>/i.test(value))) {
    findings.push('frontmatter contains placeholders');
  }
}

function validateBody(record: DecisionRecord, findings: string[]): void {
  if (!record.body) findings.push("missing body");
  if (/\[[^\]]+\]|TODO|TBD/.test(record.body)) findings.push("body contains placeholders");
  if (!/^# /m.test(record.body)) findings.push("missing title section");
  for (const section of ["Context", "Decision", "Rejected Alternatives", "Consequences"]) {
    if (!new RegExp(`^##\\s+${section}\\s*$`, "m").test(record.body)) findings.push(`missing body section: ${section}`);
  }
}

function validateDecisionRecordShape(record: DecisionRecord): string[] {
  const findings: string[] = [];
  validateDate(record, findings);
  validateFilename(record, findings);
  validateRequiredFields(record, findings);
  validateEnumFields(record, findings);
  validateLists(record, findings);
  validateFrontmatterPlaceholders(record, findings);
  validateBody(record, findings);
  return findings;
}

function candidateMatches(record: DecisionRecord, pathValue: string): boolean {
  const candidate = pathValue.split("\\").join("/");
  return (record.applies_to ?? []).some((pattern) => matchGlob(candidate, pattern));
}

function compareDecisionRecords(left: DecisionRecord, right: DecisionRecord): number {
  const dateCompare = (right.date ?? "").localeCompare(left.date ?? "");
  return dateCompare === 0 ? left.path.localeCompare(right.path) : dateCompare;
}

function validateSupersedes(record: DecisionRecord, directory: string): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const supersedes = record.supersedes ?? [];
  if (!supersedes.length) return findings;
  const existing = new Set(collectDecisionFiles(directory).map((pathname) => relative(directory, pathname).split(sep).join("/")));
  for (const entry of supersedes) {
    const normalized = entry.split("\\").join("/");
    if (!existing.has(normalized)) findings.push({ path: record.path, code: "broken-supersedes", message: `missing supersedes target: ${entry}` });
  }
  return findings;
}

export function listDecisionRecords(options: DecisionListOptions): DecisionListReport {
  const cwd = resolve(options.cwd);
  const dir = resolve(cwd, options.dir ?? "docs/decisions");
  const diagnostics: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return { cwd, records: [], diagnostics: [`missing decision directory: ${dir}`] };
  }
  const records = collectDecisionFiles(dir)
    .map((pathname) => {
      const record = readDecisionFile(pathname);
      record.findings = validateDecisionRecordShape(record);
      record.body = "";
      return record;
    })
    .filter((record) => record.status === "active")
    .filter((record) => !options.domain || record.domain === options.domain)
    .filter((record) => !options.trigger || record.triggers?.some((trigger) => trigger.includes(options.trigger ?? "")))
    .filter((record) => !options.path || candidateMatches(record, options.path))
    .sort(compareDecisionRecords);
  return { cwd, records, diagnostics };
}

export function validateDecisionRecord(recordOrPath: DecisionRecord | string): ValidationFinding[] {
  const record = typeof recordOrPath === "string" ? readDecisionFile(recordOrPath) : recordOrPath;
  const findings: ValidationFinding[] = validateDecisionRecordShape(record).map((message) => ({ path: record.path, code: "invalid-record", message }));
  if (typeof recordOrPath === "string") {
    findings.push(...validateSupersedes(record, resolve(record.path, "..")));
  }
  return findings;
}

export function renderDecisionIndex(report: DecisionListReport, format: "text" | "json"): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  return report.records
    .map((record) => [record.date, record.domain, record.kind, record.status, record.path, ...(record.triggers ?? []), ...(record.applies_to ?? [])].filter(Boolean).join(" | "))
    .join("\n");
}

export function buildDecisionTemplate(options: { date: string; task: string; domain: string; kind: DecisionRecord["kind"]; scope: DecisionRecord["scope"]; status: DecisionRecord["status"]; triggers: string[]; appliesTo: string[]; supersedes?: string[] }): string {
  return [
    "---",
    `date: ${options.date}`,
    `task: ${options.task}`,
    `domain: ${options.domain}`,
    `kind: ${options.kind}`,
    `scope: ${options.scope}`,
    `status: ${options.status}`,
    "triggers:",
    ...options.triggers.map((trigger) => `  - ${trigger}`),
    "applies_to:",
    ...options.appliesTo.map((appliesTo) => `  - ${appliesTo}`),
    "supersedes:",
    ...(options.supersedes ?? []).map((supersede) => `  - ${supersede}`),
    "---",
    "# Title",
    "",
    "## Context",
    "",
    "## Decision",
    "",
    "## Rejected Alternatives",
    "",
    "## Consequences",
    "",
  ].join("\n");
}
