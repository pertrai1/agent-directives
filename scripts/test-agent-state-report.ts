import { strictEqual, deepStrictEqual, ok } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  agentStateExitCode,
  buildDecisionTemplate,
  collectHandoffState,
  listDecisionRecords,
  renderDecisionIndex,
  renderHandoffState,
  validateDecisionRecord,
  validateHandoffCapsule,
} from "../src/agent-state-report.js";

const GIT_BUFFER = 1024 * 1024;

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: GIT_BUFFER }).trim();
}

function assert(condition: unknown, message: string): asserts condition {
  ok(condition, message);
}

function makeRemoteRepo(): string {
  const remote = mkdtempSync(join(tmpdir(), "agent-state-report-remote-"));
  git(remote, ["init", "--bare"]);
  return remote;
}

function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "agent-state-report-"));
  git(root, ["init"]);
  git(root, ["config", "user.email", "agent@example.com"]);
  git(root, ["config", "user.name", "Agent"]);
  writeFileSync(join(root, "tracked.txt"), "base\n");
  writeFileSync(join(root, "tracked-stash.txt"), "stash base\n");
  writeFileSync(join(root, "tracked-dirty.txt"), "dirty base\n");
  git(root, ["add", "tracked.txt"]);
  git(root, ["add", "tracked-stash.txt"]);
  git(root, ["add", "tracked-dirty.txt"]);
  git(root, ["commit", "-m", "base"]);
  return root;
}

function prepareHandoffRepo(): string {
  const repo = makeRepo();
  const remote = makeRemoteRepo();
  git(repo, ["remote", "add", "origin", remote]);
  git(repo, ["branch", "-M", "main"]);
  git(repo, ["push", "-u", "origin", "main"]);
  git(repo, ["commit", "--allow-empty", "-m", "local ahead"]);
  writeFileSync(join(repo, "tracked-stash.txt"), "stash me later\n");
  writeFileSync(join(repo, "tracked-dirty.txt"), "dirty\n");
  writeFileSync(join(repo, "staged.txt"), "staged\n");
  git(repo, ["add", "staged.txt"]);
  writeFileSync(join(repo, "untracked.txt"), "untracked\n");
  git(repo, ["stash", "push", "-m", "wip", "--", "tracked-stash.txt"]);
  return repo;
}

function assertHandoffReport(report: ReturnType<typeof collectHandoffState>): void {
  strictEqual(report.version, 1);
  strictEqual(report.branch, "main");
  strictEqual(report.upstream, "origin/main");
  strictEqual(report.ahead, 1);
  strictEqual(report.behind, 0);
  deepStrictEqual(report.staged, ["staged.txt"]);
  deepStrictEqual(report.unstaged, ["tracked-dirty.txt"]);
  deepStrictEqual(report.untracked, ["untracked.txt"]);
  strictEqual(report.recentCommits.length, 2);
  strictEqual(report.stash.length, 1);
}

function assertHandoffRendering(report: ReturnType<typeof collectHandoffState>): void {
  const text = renderHandoffState(report, "text");
  assert(text.includes("## Intent"), "handoff scaffold should include intent section");
  assert(text.includes("## Rejected Context"), "handoff scaffold should include rejected context section");
  assert(!text.includes("2026-"), "handoff rendering must not inject timestamps");
  ok(renderHandoffState(report, "json").includes('"branch": "main"'));
  assert(validateHandoffCapsule(text).some((finding: { code: string }) => finding.code === "placeholder"), "capsule validation should find remaining placeholders");
}

function assertUnstagedPathPreserved(): void {
  const repo = mkdtempSync(join(tmpdir(), "agent-state-unstaged-"));
  git(repo, ["init"]);
  git(repo, ["config", "user.email", "agent@example.com"]);
  git(repo, ["config", "user.name", "Agent"]);
  mkdirSync(join(repo, "src"), { recursive: true });
  writeFileSync(join(repo, "src", "cli.ts"), "base\n");
  git(repo, ["add", "src/cli.ts"]);
  git(repo, ["commit", "-m", "base"]);
  writeFileSync(join(repo, "src", "cli.ts"), "dirty\n");
  const report = collectHandoffState({ cwd: repo });
  deepStrictEqual(report.staged, []);
  deepStrictEqual(report.unstaged, ["src/cli.ts"]);
  deepStrictEqual(report.untracked, []);
}

function writeDecision(pathname: string, body: string): void {
  mkdirSync(join(pathname, ".."), { recursive: true });
  writeFileSync(pathname, body);
}

const DECISION_DIR = "docs/decisions";
const DECISION_FILE = "2026-01-10-agent-state.md";
const MALFORMED_FILE = "2026-01-12-malformed.md";
const UNRELATED_FILE = "2026-01-11-other-domain.md";
const RECENT_LIMIT = 3;
const STASH_LIMIT = 3;
const PATH_LIMIT = 10;
const DIAGNOSTIC_LIMIT = 10;

function createDecisionRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), "agent-state-decisions-"));
  mkdirSync(join(repo, DECISION_DIR), { recursive: true });
  return repo;
}

function writeActiveDecision(repo: string): void {
  writeDecision(
    join(repo, DECISION_DIR, DECISION_FILE),
    `---\n` +
      `date: 2026-01-10\n` +
      `task: Record agent state reporting\n` +
      `domain: agent-state-reporting\n` +
      `kind: process\n` +
      `scope: repo\n` +
      `status: active\n` +
      `triggers:\n` +
      `  - handoff\n` +
      `  - decision index\n` +
      `applies_to:\n` +
      `  - src/*.ts\n` +
      `supersedes:\n` +
      `  - 2025-12-01-old-agent-state.md\n` +
      `---\n` +
      `# Preserve deterministic agent state reporting\n\n` +
      `## Context\nA real workflow tradeoff existed.\n\n` +
      `## Decision\nUse deterministic local parsing.\n\n` +
      `## Rejected Alternatives\n- Shell parsing\n\n` +
      `## Consequences\n- Easier: stable reports\n`,
  );
}

function writeInactiveDecision(repo: string): void {
  writeDecision(
    join(repo, DECISION_DIR, UNRELATED_FILE),
    `---\n` +
      `date: 2026-01-11\n` +
      `task: Irrelevant entry\n` +
      `domain: other-domain\n` +
      `kind: architecture\n` +
      `scope: cross-cutting\n` +
      `status: retired\n` +
      `triggers:\n` +
      `  - unrelated\n` +
      `applies_to:\n` +
      `  - src/elsewhere.ts\n` +
      `supersedes: []\n` +
      `---\n` +
      `# Not active\n\n` +
      `## Context\nx\n\n## Decision\ny\n\n## Rejected Alternatives\nz\n\n## Consequences\nw\n`,
  );
}

function writeMalformedDecision(repo: string): void {
  writeDecision(
    join(repo, DECISION_DIR, MALFORMED_FILE),
    `---\n` +
      `date: 2026-13-40\n` +
      `task: Broken record\n` +
      `domain: malformed\n` +
      `kind: invalid-kind\n` +
      `scope: invalid-scope\n` +
      `status: active\n` +
      `triggers:\n` +
      `  - TODO trigger\n` +
      `applies_to:\n` +
      `  - [placeholder]\n` +
      `supersedes:\n` +
      `  - missing.md\n` +
      `---\n` +
      `# [placeholder]\n\n` +
      `## Context\nTODO\n\n## Decision\nTBD\n`,
  );
}

function prepareDecisionRepo(): string {
  const repo = createDecisionRepo();
  writeActiveDecision(repo);
  writeInactiveDecision(repo);
  writeMalformedDecision(repo);
  return repo;
}

function assertDecisionListing(repo: string): void {
  const report = listDecisionRecords({ cwd: repo, dir: DECISION_DIR, domain: "agent-state-reporting", trigger: "handoff", path: "src/agent-state-report.ts" });
  deepStrictEqual(report.records.map((record: { path: string }) => record.path.endsWith(DECISION_FILE)), [true]);
  strictEqual(report.records[0].findings.length, 0);
  const rendered = renderDecisionIndex(report, "text");
  assert(rendered.includes("agent-state-reporting"), "index should include record metadata");
  assert(!rendered.includes("A real workflow tradeoff existed."), "index should not include unrelated bodies");
  const invalid = validateDecisionRecord(join(repo, DECISION_DIR, MALFORMED_FILE));
  assert(invalid.some((finding: { code: string }) => finding.code === "invalid-record"), "malformed record should produce invalid findings");
  assert(invalid.some((finding: { code: string }) => finding.code === "broken-supersedes"), "missing supersedes targets should be reported");
  assert(invalid.some((finding: { message: string }) => finding.message.includes("placeholder")), "placeholders should be detected");
  assert(invalid.some((finding: { message: string }) => finding.message.includes("frontmatter contains placeholders")), "frontmatter placeholders should be detected");
  strictEqual(agentStateExitCode(report, invalid), 1);
}

function assertNoMutation(): void {
  const repo = mkdtempSync(join(tmpdir(), "agent-state-no-mutation-"));
  git(repo, ["init"]);
  mkdirSync(join(repo, "docs", "decisions"), { recursive: true });
  const before = spawnSync("git", ["status", "--short"], { cwd: repo, encoding: "utf8", maxBuffer: GIT_BUFFER });
  strictEqual(before.status, 0);
  const report = listDecisionRecords({ cwd: repo, dir: "docs/decisions" });
  strictEqual(report.records.length, 0);
  const after = spawnSync("git", ["status", "--short"], { cwd: repo, encoding: "utf8", maxBuffer: GIT_BUFFER });
  strictEqual(after.stdout, before.stdout);
  strictEqual(after.stderr, before.stderr);
  strictEqual(after.status, 0);
}

function assertCleanRepoReporting(): void {
  const repo = mkdtempSync(join(tmpdir(), "agent-state-clean-"));
  git(repo, ["init"]);
  git(repo, ["config", "user.email", "agent@example.com"]);
  git(repo, ["config", "user.name", "Agent"]);
  writeFileSync(join(repo, "tracked.txt"), "base\n");
  git(repo, ["add", "tracked.txt"]);
  git(repo, ["commit", "-m", "base"]);
  const report = collectHandoffState({ cwd: repo });
  deepStrictEqual(report.staged, []);
  deepStrictEqual(report.unstaged, []);
  deepStrictEqual(report.untracked, []);
  deepStrictEqual(report.diffstat, []);
  deepStrictEqual(report.stash, []);
  deepStrictEqual(report.diagnostics, []);
}

function assertDecisionTemplateBuilder(): void {
  const template = buildDecisionTemplate({
    date: "2026-01-10",
    task: "Record agent state reporting",
    domain: "agent-state-reporting",
    kind: "process",
    scope: "repo",
    status: "active",
    triggers: ["handoff"],
    appliesTo: ["src/*.ts"],
    supersedes: ["2025-12-01-old-agent-state.md"],
  });
  assert(template.includes("date: 2026-01-10"), "template builder should include frontmatter");
  assert(template.includes("## Consequences"), "template builder should include required sections");
}

function main(): void {
  const handoffReport = collectHandoffState({ cwd: prepareHandoffRepo(), commitLimit: RECENT_LIMIT, stashLimit: STASH_LIMIT, pathLimit: PATH_LIMIT, diagnosticLimit: DIAGNOSTIC_LIMIT });
  assertHandoffReport(handoffReport);
  assertHandoffRendering(handoffReport);
  assertUnstagedPathPreserved();
  assertCleanRepoReporting();
  assertDecisionListing(prepareDecisionRepo());
  assertDecisionTemplateBuilder();
  assertNoMutation();
}

main();
