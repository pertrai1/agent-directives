import { execFileSync } from "node:child_process";

export type HandoffFormat = "text" | "json";

export interface HandoffOptions {
  cwd: string;
  commitLimit?: number;
  stashLimit?: number;
  pathLimit?: number;
  diagnosticLimit?: number;
}

export interface HandoffReport {
  version: 1;
  cwd: string;
  branch?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  diffstat?: string[];
  recentCommits: string[];
  stash: string[];
  diagnostics: string[];
}

const DEFAULT_COMMIT_LIMIT = 5;
const DEFAULT_STASH_LIMIT = 5;
const DEFAULT_PATH_LIMIT = 20;
const DEFAULT_DIAGNOSTIC_LIMIT = 20;
const GIT_BUFFER = 1024 * 1024;
const GIT_TIMEOUT = 4000;
const STATUS_STAGED_INDEX = 0;
const STATUS_UNSTAGED_INDEX = 1;
const STATUS_PATH_INDEX = 3;
const PLACEHOLDER_LIMIT = 1;

type GitOptions = { cwd: string; args: string[]; timeoutMs?: number };

function runGit({ cwd, args, timeoutMs = GIT_TIMEOUT }: GitOptions): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: GIT_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runGitRaw({ cwd, args, timeoutMs = GIT_TIMEOUT }: GitOptions): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: GIT_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function safeGit(options: GitOptions): string | undefined {
  try {
    return runGit(options);
  } catch {
    return undefined;
  }
}

function safeGitRaw(options: GitOptions): string | undefined {
  try {
    return runGitRaw(options);
  } catch {
    return undefined;
  }
}

function splitLines(text?: string): string[] {
  return text === undefined ? [] : text.split(/\r?\n/).filter(Boolean);
}

function splitNulRecords(text?: string): string[] {
  return text === undefined ? [] : text.split("\0").filter(Boolean);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function take(values: string[], limit: number): string[] {
  return values.slice(0, Math.max(0, limit));
}

function parseStatusLines(output?: string): { staged: string[]; unstaged: string[]; untracked: string[] } {
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  const records = splitNulRecords(output);
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const code = record.slice(0, 2);
    if (code === "??") {
      untracked.push(record.slice(STATUS_PATH_INDEX));
      continue;
    }
    if (code.includes("R") || code.includes("C")) {
      const fromPath = records[index + 1] ?? "";
      const path = fromPath.trim();
      if (code[STATUS_STAGED_INDEX] !== " ") staged.push(path);
      if (code[STATUS_UNSTAGED_INDEX] !== " ") unstaged.push(path);
      index += 1;
      continue;
    }
    const path = record.slice(STATUS_PATH_INDEX);
    if (code[STATUS_STAGED_INDEX] !== " ") staged.push(path);
    if (code[STATUS_UNSTAGED_INDEX] !== " ") unstaged.push(path);
  }
  return { staged: uniqueSorted(staged), unstaged: uniqueSorted(unstaged), untracked: uniqueSorted(untracked) };
}

function parseAheadBehind(value?: string): { ahead?: number; behind?: number } {
  if (!value) return {};
  const [ahead, behind] = value.split(/\s+/).map(Number);
  return { ahead: Number.isFinite(ahead) ? ahead : undefined, behind: Number.isFinite(behind) ? behind : undefined };
}

function renderAheadBehind(report: HandoffReport): string {
  return report.ahead !== undefined || report.behind !== undefined ? `${report.ahead ?? 0}/${report.behind ?? 0}` : "unavailable";
}

function renderList(values: string[]): string {
  return values.length ? values.join(", ") : "none";
}

function renderPipeList(values?: string[]): string {
  return values?.length ? values.join(" | ") : "none";
}

function renderFacts(report: HandoffReport): string[] {
  return [
    "## Facts",
    "",
    `- cwd: ${report.cwd}`,
    `- branch: ${report.branch ?? "unavailable"}`,
    `- upstream: ${report.upstream ?? "unavailable"}`,
    `- ahead-behind: ${renderAheadBehind(report)}`,
    `- staged: ${renderList(report.staged)}`,
    `- unstaged: ${renderList(report.unstaged)}`,
    `- untracked: ${renderList(report.untracked)}`,
    `- diffstat: ${renderPipeList(report.diffstat)}`,
    `- recent commits: ${renderPipeList(report.recentCommits)}`,
    `- stash: ${renderPipeList(report.stash)}`,
    `- diagnostics: ${renderPipeList(report.diagnostics)}`,
  ];
}

function renderPrompts(): string[] {
  return [
    "## Intent",
    "",
    "- [ ] What outcome should the next agent pursue?",
    "- [ ] What decisions are already made?",
    "",
    "## Decisions",
    "",
    "- [ ] What was accepted, deferred, or rejected?",
    "",
    "## Risks",
    "",
    "- [ ] What could still go wrong?",
    "",
    "## Rejected Context",
    "",
    "- [ ] What should not be re-opened unless necessary?",
    "",
    "## Next Input",
    "",
    "- [ ] What exact input does the next agent need?",
  ];
}

function renderHandoffText(report: HandoffReport): string {
  return ["# Handoff Capsule", "", ...renderFacts(report), "", ...renderPrompts()].join("\n");
}

function renderHandoffJson(report: HandoffReport): string {
  return JSON.stringify(report, null, 2);
}

function detectPlaceholders(text: string): string[] {
  const patterns = [/\[[^\]]+\]/g, /\bTODO\b/gi, /\bTBD\b/gi, /<[^>]+>/g];
  const matches = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) matches.add(match[0]);
  }
  return [...matches].sort((a, b) => a.localeCompare(b));
}

export function collectHandoffState(options: HandoffOptions): HandoffReport {
  const cwd = options.cwd;
  const commitLimit = options.commitLimit ?? DEFAULT_COMMIT_LIMIT;
  const stashLimit = options.stashLimit ?? DEFAULT_STASH_LIMIT;
  const pathLimit = options.pathLimit ?? DEFAULT_PATH_LIMIT;
  const diagnosticLimit = options.diagnosticLimit ?? DEFAULT_DIAGNOSTIC_LIMIT;
  const diagnostics: string[] = [];
  const branch = safeGit({ cwd, args: ["branch", "--show-current"] });
  const upstream = safeGit({ cwd, args: ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"] });
  const aheadBehind = safeGit({ cwd, args: ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"] });
  const status = safeGitRaw({ cwd, args: ["status", "--porcelain=v1", "-z"] });
  const diffstat = safeGit({ cwd, args: ["diff", "--stat"] });
  const commits = safeGit({ cwd, args: ["log", "--oneline", `-${commitLimit}`, "--decorate=short"] });
  const stash = safeGit({ cwd, args: ["stash", "list", `-n${stashLimit}`] });
  appendMissingDiagnostics({ diagnostics, status, diffstat, commits, stash, branch });
  const parsedStatus = parseStatusLines(status ?? "");
  return {
    version: 1,
    cwd,
    branch,
    upstream,
    ...parseAheadBehind(aheadBehind),
    staged: take(parsedStatus.staged, pathLimit),
    unstaged: take(parsedStatus.unstaged, pathLimit),
    untracked: take(parsedStatus.untracked, pathLimit),
    diffstat: diffstat ? take(splitLines(diffstat), pathLimit) : [],
    recentCommits: commits ? take(splitLines(commits), commitLimit) : [],
    stash: stash ? take(splitLines(stash), stashLimit) : [],
    diagnostics: take(uniqueSorted(diagnostics), diagnosticLimit),
  };
}

function appendMissingDiagnostics(options: {
  diagnostics: string[];
  status?: string | null;
  diffstat?: string | null;
  commits?: string | null;
  stash?: string | null;
  branch?: string | null;
}): void {
  const { diagnostics, status, diffstat, commits, stash, branch } = options;
  if (status === undefined) diagnostics.push("git status unavailable");
  if (diffstat === undefined) diagnostics.push("git diff stat unavailable");
  if (commits === undefined) diagnostics.push("git log unavailable");
  if (stash === undefined) diagnostics.push("stash unavailable");
  if (branch === undefined) diagnostics.push("branch unavailable");
}

export function renderHandoffState(report: HandoffReport, format: HandoffFormat): string {
  return format === "json" ? renderHandoffJson(report) : renderHandoffText(report);
}

export function validateHandoffCapsule(text: string): { code: string; message: string }[] {
  const requiredSections = ["Intent", "Decisions", "Risks", "Rejected Context", "Next Input"];
  const findings: { code: string; message: string }[] = [];
  for (const section of requiredSections) {
    if (!new RegExp(`^##\\s+${section}\\s*$`, "m").test(text)) {
      findings.push({ code: "missing-section", message: `missing required section: ${section}` });
    }
  }
  for (const placeholder of detectPlaceholders(text)) {
    findings.push({ code: "placeholder", message: `placeholder remains: ${placeholder}` });
  }
  if (findings.length < PLACEHOLDER_LIMIT) return findings;
  return findings;
}
