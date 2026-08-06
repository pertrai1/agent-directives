import { deepStrictEqual } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectHandoffState } from "../src/agent-state-report.js";

const repo = mkdtempSync(join(tmpdir(), "agent-state-rename-"));

function git(args: string[]): void {
  execFileSync("git", args, { cwd: repo, stdio: "ignore" });
}

try {
  git(["init"]);
  git(["config", "user.email", "agent@example.com"]);
  git(["config", "user.name", "Agent"]);
  writeFileSync(join(repo, "original.txt"), "base\n");
  git(["add", "original.txt"]);
  git(["commit", "-m", "base"]);
  git(["mv", "original.txt", "renamed.txt"]);
  writeFileSync(join(repo, "renamed.txt"), "base\nunstaged\n");

  const report = collectHandoffState({ cwd: repo });
  deepStrictEqual(report.staged, ["renamed.txt"]);
  deepStrictEqual(report.unstaged, ["renamed.txt"]);
  deepStrictEqual(report.untracked, []);
} finally {
  rmSync(repo, { recursive: true, force: true });
}
