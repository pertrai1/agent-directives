#!/usr/bin/env tsx
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertContains,
  assertFileExists,
  assertFileMissing,
  reportResults,
  repoRoot,
  runCli,
  test,
  withTempProject,
} from "./test-cli-helpers.js";

const EXECUTABLE_BIT = 0o100;

function assertExecutable(path: string): void {
  if (!(statSync(path).mode & EXECUTABLE_BIT)) throw new Error(`expected executable bit on ${path}`);
}

console.log("helper scripts");
test("sync installs required entries' helper scripts as executables under .agents", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("sync --tool claude --yes", { cwd });
    assertContains(stdout, { needle: "↳ script gates.sh", context: "script sub-line" });
    // gates.sh (verification) and diff.sh (code-reviewer) are owned by required entries.
    for (const rel of [".agents/directives/scripts/gates.sh", ".agents/skills/code-reviewer/scripts/diff.sh"]) {
      const abs = join(cwd, rel);
      assertFileExists(abs);
      assertExecutable(abs);
    }
  });
});

test("installs an optional entry's helper script via add", () => {
  withTempProject((cwd) => {
    runCli("add session-decisions --tool claude", { cwd });
    const script = join(cwd, ".agents/directives/scripts/decisions-index.sh");
    assertFileExists(script);
    assertExecutable(script);
  });
});

test("installs helper scripts under .agents even for cursor", () => {
  withTempProject((cwd) => {
    runCli("sync --tool cursor --yes", { cwd });
    assertFileExists(join(cwd, ".cursor/rules/code-reviewer.mdc"));
    assertFileExists(join(cwd, ".agents/skills/code-reviewer/scripts/diff.sh"));
  });
});

console.log("companion assets");
test("sync installs the adaptive-routing companion asset with identical content for every target", () => {
  const source = join(repoRoot, "directives/references/adaptive-routing-detail.md");
  const expected = readFileSync(source, "utf8");

  for (const tool of ["claude", "codex", "copilot", "cursor"]) {
    withTempProject((cwd) => {
      runCli(`sync --tool ${tool} --yes`, { cwd });
      const installed = join(cwd, ".agents/directives/references/adaptive-routing-detail.md");
      assertFileExists(installed);
      if (readFileSync(installed, "utf8") !== expected) {
        throw new Error(`expected ${tool} companion asset content to match its source`);
      }
      runCli(`check --tool ${tool}`, { cwd });
    });
  }
});

test("check rejects missing or tampered companion assets by content identity", () => {
  withTempProject((cwd) => {
    runCli("sync --tool claude --yes", { cwd });
    const asset = join(cwd, ".agents/directives/references/adaptive-routing-detail.md");

    unlinkSync(asset);
    const missing = runCli("check --tool claude", { cwd, allowFail: true });
    if (missing.code === 0) throw new Error("expected check to fail for a missing companion asset");
    assertContains(missing.stderr, { needle: "adaptive-routing", context: "missing companion asset owner" });

    runCli("sync --tool claude --yes", { cwd });
    writeFileSync(asset, "tampered companion asset");
    const tampered = runCli("check --tool claude", { cwd, allowFail: true });
    if (tampered.code === 0) throw new Error("expected check to fail for a tampered companion asset");
    assertContains(tampered.stderr, { needle: "adaptive-routing", context: "tampered companion asset owner" });

    runCli("sync --tool claude --yes --force", { cwd });
    const sentinel = join(cwd, "outside-sentinel.txt");
    writeFileSync(sentinel, "outside sentinel");
    unlinkSync(asset);
    symlinkSync(sentinel, asset);
    const escaping = runCli("check --tool claude", { cwd, allowFail: true });
    if (escaping.code === 0) throw new Error("expected check to reject a companion asset symlink");
    assertContains(escaping.stderr, { needle: "adaptive-routing", context: "escaping companion asset owner" });

    const unforced = runCli("sync --tool claude --yes", { cwd, allowFail: true });
    if (unforced.code === 0) throw new Error("expected unforced sync to reject a companion asset symlink");
    if (!lstatSync(asset).isSymbolicLink()) throw new Error("unforced sync replaced a companion asset symlink");
    if (readFileSync(sentinel, "utf8") !== "outside sentinel") throw new Error("unforced sync modified the external sentinel");

    runCli("sync --tool claude --yes --force", { cwd });
    if (lstatSync(asset).isSymbolicLink()) throw new Error("forced sync did not replace the companion asset symlink");
    if (readFileSync(sentinel, "utf8") !== "outside sentinel") throw new Error("forced sync modified the external sentinel");
    runCli("check --tool claude", { cwd });
  });
});

test("companion asset conflicts block the bootstrap atomically without force", () => {
  withTempProject((cwd) => {
    const asset = join(cwd, ".agents/directives/references/adaptive-routing-detail.md");
    const bootstrap = join(cwd, ".agents/directives/adaptive-routing.md");
    mkdirSync(dirname(asset), { recursive: true });
    writeFileSync(asset, "custom companion asset");

    const result = runCli("add adaptive-routing --tool claude", { cwd, allowFail: true });
    if (result.code === 0) throw new Error("expected unforced companion conflict to fail");
    assertContains(result.stderr, { needle: "asset conflict", context: "companion asset conflict report" });
    if (readFileSync(asset, "utf8") !== "custom companion asset") throw new Error("companion asset overwritten without --force");
    assertFileMissing(bootstrap);
  });
});

test("helper conflict leaves the entry unchanged without force", () => {
  withTempProject((cwd) => {
    const scriptPath = join(cwd, ".agents/directives/scripts/gates.sh");
    const entryPath = join(cwd, ".agents/directives/verification.md");
    mkdirSync(dirname(scriptPath), { recursive: true });
    writeFileSync(scriptPath, "custom script");

    const noForce = runCli("add verification --tool claude", { cwd, allowFail: true });
    if (noForce.code === 0) throw new Error("expected non-zero exit for conflicting script");
    assertContains(noForce.stderr, { needle: "script conflict", context: "script conflict report" });
    if (readFileSync(scriptPath, "utf8") !== "custom script") throw new Error("script overwritten without --force");
    assertFileMissing(entryPath);

    runCli("add verification --tool claude --force", { cwd });
    if (readFileSync(scriptPath, "utf8") === "custom script") throw new Error("script not overwritten with --force");
  });
});

test("working diff covers the complete working tree", () => {
  withTempProject((cwd) => {
    execFileSync("git", ["init", "-q"], { cwd });
    writeFileSync(join(cwd, "staged.txt"), "base staged\n");
    writeFileSync(join(cwd, "unstaged.txt"), "base unstaged\n");
    execFileSync("git", ["add", "staged.txt", "unstaged.txt"], { cwd });
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"],
      { cwd },
    );

    writeFileSync(join(cwd, "staged.txt"), "new staged content\n");
    execFileSync("git", ["add", "staged.txt"], { cwd });
    writeFileSync(join(cwd, "unstaged.txt"), "new unstaged content\n");
    writeFileSync(join(cwd, "untracked.txt"), "new untracked content\n");

    const output = execFileSync(
      "/bin/bash",
      [join(repoRoot, "skills/code-reviewer/scripts/diff.sh"), "--working"],
      { cwd, encoding: "utf8" },
    );
    for (const expected of [
      "staged.txt",
      "new staged content",
      "unstaged.txt",
      "new unstaged content",
      "untracked.txt",
      "new untracked content",
    ]) {
      assertContains(output, { needle: expected, context: "complete working diff" });
    }
  });
});

test("requested unavailable static-analysis gate fails visibly", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ scripts: { check: "node -e \"process.exit(0)\"" } }));
    const result = spawnSync(
      "/bin/bash",
      [join(repoRoot, "directives/scripts/gates.sh"), "static-analysis"],
      { cwd, encoding: "utf8" },
    );
    if (result.status === 0) throw new Error("expected unavailable requested gate to fail");
    assertContains(`${result.stdout}${result.stderr}`, {
      needle: "Unavailable requested gate: static-analysis",
      context: "missing static-analysis gate error",
    });
  });
});

test("requested conventional static-analysis gate runs and reports success", () => {
  withTempProject((cwd) => {
    const staticAnalysis = "node -e \"require('fs').writeFileSync('static-analysis-ran.txt','yes')\"";
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ scripts: { "static-analysis": staticAnalysis } }));

    const result = spawnSync(
      "/bin/bash",
      [join(repoRoot, "directives/scripts/gates.sh"), "static-analysis"],
      { cwd, encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(`expected static-analysis gate to pass: ${result.stderr}`);
    assertContains(result.stdout, { needle: "## static-analysis", context: "static-analysis label" });
    assertContains(result.stdout, { needle: "STATUS: PASS", context: "static-analysis success" });
    assertContains(readFileSync(join(cwd, "static-analysis-ran.txt"), "utf8"), {
      needle: "yes",
      context: "static-analysis command effect",
    });
  });
});

test("invalid MAX_LINES exits 2 with an actionable diagnostic", () => {
  withTempProject((cwd) => {
    const result = spawnSync(
      "/bin/bash",
      [join(repoRoot, "directives/scripts/gates.sh"), "static-analysis"],
      { cwd, encoding: "utf8", env: { ...process.env, MAX_LINES: "many" } },
    );
    if (result.status !== 2) throw new Error(`expected invalid MAX_LINES to exit 2, got ${result.status}`);
    assertContains(result.stderr, { needle: "MAX_LINES must be a positive integer", context: "invalid MAX_LINES diagnostic" });
  });
});

test("zero MAX_LINES exits 2 with an actionable diagnostic", () => {
  withTempProject((cwd) => {
    const result = spawnSync(
      "/bin/bash",
      [join(repoRoot, "directives/scripts/gates.sh"), "static-analysis"],
      { cwd, encoding: "utf8", env: { ...process.env, MAX_LINES: "0" } },
    );
    if (result.status !== 2) throw new Error(`expected zero MAX_LINES to exit 2, got ${result.status}`);
    assertContains(result.stderr, { needle: "MAX_LINES must be a positive integer", context: "zero MAX_LINES diagnostic" });
  });
});

test("default gates run the aggregate npm check", () => {
  withTempProject((cwd) => {
    const checkScript = "node -e \"require('fs').writeFileSync('check-ran.txt','yes')\"";
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ scripts: { check: checkScript } }));
    execFileSync("/bin/bash", [join(repoRoot, "directives/scripts/gates.sh")], { cwd });
    assertContains(readFileSync(join(cwd, "check-ran.txt"), "utf8"), { needle: "yes", context: "aggregate npm check" });
  });
});

test("check reports an entry whose declared helper is missing", () => {
  withTempProject((cwd) => {
    runCli("sync --tool claude --yes", { cwd });
    unlinkSync(join(cwd, ".agents/directives/scripts/gates.sh"));

    const result = runCli("check --tool claude", { cwd, allowFail: true });
    if (result.code === 0) throw new Error("expected check to fail for a missing declared helper");
    assertContains(result.stderr, { needle: "verification", context: "missing helper owner" });
  });
});

test("decision index emits its table without column", () => {
  withTempProject((cwd) => {
    const decisions = join(cwd, "docs/decisions");
    const commandBin = join(cwd, "bin");
    mkdirSync(decisions, { recursive: true });
    mkdirSync(commandBin);
    writeFileSync(
      join(decisions, "2026-07-18-example.md"),
      "---\ndate: 2026-07-18\nkind: process\nscope: repo\nstatus: active\ndomain: example\ntriggers:\n  - example trigger\n---\n",
    );
    for (const command of ["find", "sort", "awk", "cat"]) {
      const source = execFileSync("/bin/sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).trim();
      symlinkSync(source, join(commandBin, command));
    }

    const output = execFileSync(
      "/bin/bash",
      [join(repoRoot, "directives/scripts/decisions-index.sh"), "--active", decisions],
      { cwd, encoding: "utf8", env: { ...process.env, PATH: commandBin } },
    );
    assertContains(output, { needle: "DATE\tKIND\tSCOPE", context: "unformatted decision header" });
    assertContains(output, { needle: "2026-07-18\tprocess\trepo\tactive\texample", context: "unformatted decision row" });
  });
});

reportResults();
