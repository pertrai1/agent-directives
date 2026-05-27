#!/usr/bin/env tsx
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  assertContains,
  assertFileExists,
  assertFileMissing,
  assertNotContains,
  reportResults,
  runCli,
  test,
  withTempProject,
} from "./test-cli-helpers.js";

console.log("list");
test("lists entries by default", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list", { cwd });
    assertContains(stdout, { needle: "adaptive-routing", context: "list default" });
    assertContains(stdout, { needle: "code-reviewer", context: "list default" });
  });
});

test("filters by --required", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list --required", { cwd });
    assertContains(stdout, { needle: "adaptive-routing", context: "list --required" });
    assertNotContains(stdout, { needle: "architecture-boundaries", context: "list --required" });
  });
});

test("filters by --category", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list --category memory", { cwd });
    assertContains(stdout, { needle: "error-memory", context: "list --category memory" });
    assertNotContains(stdout, { needle: "code-reviewer", context: "list --category memory" });
  });
});

test("filters by --type rule", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list --type rule", { cwd });
    assertContains(stdout, { needle: "angular-components-and-templates", context: "list --type rule includes Angular rule" });
    assertContains(stdout, { needle: "rule", context: "list --type rule shows type" });
    assertNotContains(stdout, { needle: "adaptive-routing", context: "list --type rule excludes directives" });
  });
});

test("filters by --tool", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list --tool cursor", { cwd });
    assertContains(stdout, { needle: "adaptive-routing", context: "list --tool cursor" });
    assertNotContains(stdout, { needle: "workspace-isolation", context: "list --tool cursor" });
  });
});

test("rejects invalid --tool", () => {
  withTempProject((cwd) => {
    const { code } = runCli("list --tool bogus", { cwd, allowFail: true });
    if (code === 0) throw new Error("expected non-zero exit");
  });
});

console.log("\ncontext-audit");
test("reports prompt weight for required entries", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("context-audit --tool claude --required", { cwd });
    assertContains(stdout, { needle: "Context audit for claude", context: "context-audit heading" });
    assertContains(stdout, { needle: "Estimated prompt tokens:", context: "context-audit total" });
    assertContains(stdout, { needle: "Always-loaded entries:", context: "context-audit required count" });
    assertContains(stdout, { needle: "Largest entries:", context: "context-audit largest section" });
    assertContains(stdout, { needle: "adaptive-routing", context: "context-audit includes required entry" });
    assertNotContains(stdout, { needle: "architecture-boundaries", context: "context-audit excludes optional entries" });
  });
});

test("fails when context budget is exceeded", () => {
  withTempProject((cwd) => {
    const { stderr, code } = runCli(
      "context-audit --tool claude --required --max-tokens 1",
      { cwd, allowFail: true },
    );
    if (code === 0) throw new Error("expected non-zero exit");
    assertContains(stderr, { needle: "Context budget exceeded", context: "context-audit budget failure" });
  });
});

test("rejects malformed integer options", () => {
  withTempProject((cwd) => {
    const badMaxTokens = runCli(
      "context-audit --tool claude --max-tokens 1000ms",
      { cwd, allowFail: true },
    );
    if (badMaxTokens.code === 0)
      throw new Error("expected non-zero exit for malformed --max-tokens");
    assertContains(badMaxTokens.stderr, { needle: "Invalid --max-tokens '1000ms'", context: "malformed --max-tokens" });

    const badLargest = runCli(
      "context-audit --tool claude --largest 3files",
      { cwd, allowFail: true },
    );
    if (badLargest.code === 0)
      throw new Error("expected non-zero exit for malformed --largest");
    assertContains(badLargest.stderr, { needle: "Invalid --largest '3files'", context: "malformed --largest" });
  });
});

console.log("\nadd");
test("installs to entry.path for --tool claude", () => {
  withTempProject((cwd) => {
    runCli("add adaptive-routing --tool claude", { cwd });
    assertFileExists(join(cwd, "directives/adaptive-routing.md"));
  });
});

test("installs rule into rules directory", () => {
  withTempProject((cwd) => {
    runCli("add angular-components-and-templates --tool claude", { cwd });
    assertFileExists(join(cwd, "rules/angular/components-and-templates.md"));
  });
});

test("installs skill SKILL.md into nested directory", () => {
  withTempProject((cwd) => {
    runCli("add code-reviewer --tool claude", { cwd });
    assertFileExists(join(cwd, "skills/code-reviewer/SKILL.md"));
  });
});

test("writes to .cursor/rules for --tool cursor", () => {
  withTempProject((cwd) => {
    runCli("add adaptive-routing --tool cursor", { cwd });
    assertFileExists(join(cwd, ".cursor/rules/adaptive-routing.mdc"));
  });
});

test("skips identical file on re-run", () => {
  withTempProject((cwd) => {
    runCli("add adaptive-routing --tool claude", { cwd });
    const { stdout } = runCli("add adaptive-routing --tool claude", { cwd });
    assertContains(stdout, { needle: "up-to-date", context: "second add" });
  });
});

test("refuses to overwrite different content without --force", () => {
  withTempProject((cwd) => {
    mkdirSync(join(cwd, "directives"), { recursive: true });
    writeFileSync(
      join(cwd, "directives/adaptive-routing.md"),
      "custom content",
    );
    const { code } = runCli("add adaptive-routing --tool claude", { cwd, allowFail: true });
    if (code === 0) throw new Error("expected non-zero exit code");
    if (
      readFileSync(join(cwd, "directives/adaptive-routing.md"), "utf8") !==
      "custom content"
    ) {
      throw new Error("file was overwritten without --force");
    }
  });
});

test("overwrites with --force", () => {
  withTempProject((cwd) => {
    mkdirSync(join(cwd, "directives"), { recursive: true });
    writeFileSync(
      join(cwd, "directives/adaptive-routing.md"),
      "custom content",
    );
    runCli("add adaptive-routing --tool claude --force", { cwd });
    const content = readFileSync(
      join(cwd, "directives/adaptive-routing.md"),
      "utf8",
    );
    if (content === "custom content")
      throw new Error("file was not overwritten");
    assertContains(content, { needle: "adaptive-routing", context: "forced overwrite" });
  });
});

test("rejects unknown entry", () => {
  withTempProject((cwd) => {
    const { code } = runCli("add nonexistent-entry --tool claude", { cwd, allowFail: true });
    if (code === 0) throw new Error("expected non-zero exit code");
  });
});

console.log("\ncheck");
test("reports missing required in empty project", () => {
  withTempProject((cwd) => {
    const { stderr, code } = runCli("check --tool claude", { cwd, allowFail: true });
    if (code === 0) throw new Error("expected non-zero exit code");
    assertContains(stderr, { needle: "Missing", context: "check missing" });
  });
});

test("reports success when all required installed", () => {
  withTempProject((cwd) => {
    runCli("sync --tool claude --yes", { cwd });
    const { stdout } = runCli("check --tool claude", { cwd });
    assertContains(stdout, { needle: "All", context: "check success" });
  });
});

console.log("\nsync");
test("installs all required with --yes", () => {
  withTempProject((cwd) => {
    runCli("sync --tool claude --yes", { cwd });
    assertFileExists(join(cwd, "directives/adaptive-routing.md"));
    assertFileExists(join(cwd, "directives/codebase-navigation.md"));
    assertFileExists(join(cwd, "directives/task-framing.md"));
    assertFileExists(join(cwd, "directives/verification.md"));
    assertFileExists(join(cwd, "skills/code-reviewer/SKILL.md"));
    assertFileExists(join(cwd, "skills/systematic-debugging/SKILL.md"));
    assertFileExists(join(cwd, "skills/test-reviewer/SKILL.md"));
    assertFileMissing(join(cwd, "directives/architecture-boundaries.md"));
  });
});

test("sync --tool cursor only installs cursor-compatible required entries", () => {
  withTempProject((cwd) => {
    runCli("sync --tool cursor --yes", { cwd });
    assertFileExists(join(cwd, ".cursor/rules/adaptive-routing.mdc"));
    assertFileExists(join(cwd, ".cursor/rules/code-reviewer.mdc"));
  });
});

test("sync --rules auto installs Angular rules for Angular projects", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    writeFileSync(join(cwd, "angular.json"), "{}\n");
    const { stdout } = runCli("sync --yes --rules auto", { cwd });
    assertContains(stdout, { needle: "Installing 3 selected rule entries (angular)", context: "sync rules auto output" });
    assertFileExists(join(cwd, "rules/angular/components-and-templates.md"));
    assertFileExists(join(cwd, "rules/angular/project-structure.md"));
    assertFileExists(join(cwd, "rules/angular/testing.md"));
  });
});

test("sync --rules auto does not install Angular rules for non-Angular projects", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    runCli("sync --yes --rules auto", { cwd });
    assertFileMissing(join(cwd, "rules/angular/components-and-templates.md"));
  });
});

test("sync auto-detects tool from CLAUDE.md", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    const { stdout } = runCli("sync --yes", { cwd });
    assertContains(stdout, { needle: "Tool: claude", context: "auto-detect" });
  });
});

reportResults();
