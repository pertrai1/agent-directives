#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
test("lists entries by default and rejects invalid tool", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("list", { cwd });
    assertContains(stdout, { needle: "adaptive-routing", context: "list default" });
    assertContains(stdout, { needle: "code-reviewer", context: "list default" });

    const { code } = runCli("list --tool bogus", { cwd, allowFail: true });
    if (code === 0) throw new Error("expected non-zero exit");
  });
});

test("filters list by flags (required, category, type, tool)", () => {
  withTempProject((cwd) => {
    const required = runCli("list --required", { cwd }).stdout;
    assertContains(required, { needle: "adaptive-routing", context: "list --required" });
    assertNotContains(required, { needle: "architecture-boundaries", context: "list --required" });

    const category = runCli("list --category memory", { cwd }).stdout;
    assertContains(category, { needle: "error-memory", context: "list --category" });
    assertNotContains(category, { needle: "code-reviewer", context: "list --category" });

    const ruleType = runCli("list --type rule", { cwd }).stdout;
    assertContains(ruleType, { needle: "angular-components-and-templates", context: "list --type rule" });
    assertNotContains(ruleType, { needle: "adaptive-routing", context: "list --type rule" });

    const tool = runCli("list --tool cursor", { cwd }).stdout;
    assertContains(tool, { needle: "adaptive-routing", context: "list --tool" });
    assertNotContains(tool, { needle: "workspace-isolation", context: "list --tool" });
  });
});

console.log("\ncontext-audit");
test("reports prompt weight and rejects malformed options", () => {
  withTempProject((cwd) => {
    const { stdout } = runCli("context-audit --tool claude --required", { cwd });
    assertContains(stdout, { needle: "Context audit for claude", context: "context-audit" });
    assertContains(stdout, { needle: "adaptive-routing", context: "context-audit entry" });

    const budget = runCli("context-audit --tool claude --required --max-tokens 1", { cwd, allowFail: true });
    if (budget.code === 0) throw new Error("expected non-zero exit for budget");
    assertContains(budget.stderr, { needle: "Context budget exceeded", context: "budget failure" });

    const badMax = runCli("context-audit --tool claude --max-tokens 1000ms", { cwd, allowFail: true });
    if (badMax.code === 0) throw new Error("expected non-zero exit for --max-tokens");
    assertContains(badMax.stderr, { needle: "Invalid --max-tokens '1000ms'", context: "max-tokens" });

    const badLargest = runCli("context-audit --tool claude --largest 3files", { cwd, allowFail: true });
    if (badLargest.code === 0) throw new Error("expected non-zero exit for --largest");
    assertContains(badLargest.stderr, { needle: "Invalid --largest '3files'", context: "largest" });
  });
});

test("audits selected entries against available tool context", () => {
  withTempProject((cwd) => {
    const selected = runCli(
      "context-audit --tool codex --entries adaptive-routing,systematic-debugging,test-reviewer,architecture-boundary-reviewer --largest 2",
      { cwd },
    ).stdout;
    assertContains(selected, { needle: "Context audit for codex selected entries", context: "selected audit heading" });
    assertContains(selected, { needle: "Selected entries: 4", context: "selected audit count" });
    assertContains(selected, { needle: "Available entries for codex:", context: "selected audit available" });
    assertContains(selected, { needle: "Estimated savings:", context: "selected audit savings" });
    assertContains(selected, { needle: "systematic-debugging", context: "selected audit largest" });

    const requiredWithEntries = runCli(
      "context-audit --tool codex --required --entries architecture-boundary-reviewer",
      { cwd },
    ).stdout;
    assertContains(requiredWithEntries, { needle: "Selected entries: 1", context: "selected overrides required count" });
    assertContains(requiredWithEntries, { needle: "architecture-boundary-reviewer", context: "selected overrides required entry" });
  });
});

test("rejects unknown and unsupported selected context audit entries", () => {
  withTempProject((cwd) => {
    const unknown = runCli("context-audit --tool codex --entries adaptive-routing,missing-route-entry", { cwd, allowFail: true });
    if (unknown.code === 0) throw new Error("expected non-zero exit for unknown selected entry");
    assertContains(unknown.stderr, { needle: "Unknown --entries id: 'missing-route-entry'", context: "unknown selected entry" });

    const unsupported = runCli("context-audit --tool cursor --entries workspace-isolation", { cwd, allowFail: true });
    if (unsupported.code === 0) throw new Error("expected non-zero exit for unsupported selected entry");
    assertContains(unsupported.stderr, { needle: "Selected entry does not support tool 'cursor': 'workspace-isolation'", context: "unsupported selected entry" });
  });
});

console.log("\nsync and check");
test("installs required entries and validates check command", () => {
  withTempProject((cwd) => {
    const emptyCheck = runCli("check --tool claude", { cwd, allowFail: true });
    if (emptyCheck.code === 0) throw new Error("expected non-zero exit for empty check");
    assertContains(emptyCheck.stderr, { needle: "Missing", context: "check empty" });

    runCli("sync --tool claude --yes", { cwd });
    const expected = [
      "directives/adaptive-routing.md",
      "directives/codebase-navigation.md",
      "directives/task-framing.md",
      "directives/verification.md",
      "skills/code-reviewer/SKILL.md",
      "skills/systematic-debugging/SKILL.md",
      "skills/test-reviewer/SKILL.md"
    ];
    for (const file of expected) assertFileExists(join(cwd, file));
    assertFileMissing(join(cwd, "directives/architecture-boundaries.md"));

    const successCheck = runCli("check --tool claude", { cwd }).stdout;
    assertContains(successCheck, { needle: "All", context: "check success" });
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
    assertContains(stdout, { needle: "Installing 6 selected rule entries (angular)", context: "sync rules auto output" });
    const expected = [
      "coding-style.md", "components-and-templates.md", "patterns.md",
      "project-structure.md", "security.md", "testing.md"
    ];
    for (const f of expected) assertFileExists(join(cwd, `rules/angular/${f}`));
  });
});

test("sync --rules auto does not install Angular rules for non-Angular projects", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    runCli("sync --yes --rules auto", { cwd });
    assertFileMissing(join(cwd, "rules/angular/components-and-templates.md"));
  });
});

test("sync --rules auto installs Python rules for Python projects", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    writeFileSync(join(cwd, "pyproject.toml"), "[project]\n");
    const { stdout } = runCli("sync --yes --rules auto", { cwd });
    assertContains(stdout, { needle: "Installing 5 selected rule entries (python)", context: "sync rules auto output" });
    const expected = ["coding-style.md", "patterns.md", "project-structure.md", "security.md", "testing.md"];
    for (const f of expected) assertFileExists(join(cwd, `rules/python/${f}`));
  });
});

test("sync --rules auto does not install Python rules for non-Python projects", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    runCli("sync --yes --rules auto", { cwd });
    assertFileMissing(join(cwd, "rules/python/coding-style.md"));
  });
});

test("sync auto-detects tool from CLAUDE.md", () => {
  withTempProject((cwd) => {
    writeFileSync(join(cwd, "CLAUDE.md"), "# project\n");
    const { stdout } = runCli("sync --yes", { cwd });
    assertContains(stdout, { needle: "Tool: claude", context: "auto-detect" });
  });
});

console.log("\nadd");
test("adds different types of entries (directives, rules, skills)", () => {
  withTempProject((cwd) => {
    runCli("add adaptive-routing --tool claude", { cwd });
    assertFileExists(join(cwd, "directives/adaptive-routing.md"));

    runCli("add angular-components-and-templates --tool claude", { cwd });
    assertFileExists(join(cwd, "rules/angular/components-and-templates.md"));

    runCli("add code-reviewer --tool claude", { cwd });
    assertFileExists(join(cwd, "skills/code-reviewer/SKILL.md"));

    runCli("add adaptive-routing --tool cursor", { cwd });
    assertFileExists(join(cwd, ".cursor/rules/adaptive-routing.mdc"));

    const dup = runCli("add adaptive-routing --tool claude", { cwd });
    assertContains(dup.stdout, { needle: "up-to-date", context: "duplicate add" });

    const unknown = runCli("add nonexistent-entry --tool claude", { cwd, allowFail: true });
    if (unknown.code === 0) throw new Error("expected non-zero exit code for unknown");
  });
});

test("refuses to overwrite different content without force and overwrites with force", () => {
  withTempProject((cwd) => {
    mkdirSync(join(cwd, "directives"), { recursive: true });
    writeFileSync(join(cwd, "directives/adaptive-routing.md"), "custom content");

    const noForce = runCli("add adaptive-routing --tool claude", { cwd, allowFail: true });
    if (noForce.code === 0) throw new Error("expected non-zero exit code without force");
    if (readFileSync(join(cwd, "directives/adaptive-routing.md"), "utf8") !== "custom content") {
      throw new Error("file was overwritten without --force");
    }

    runCli("add adaptive-routing --tool claude --force", { cwd });
    const content = readFileSync(join(cwd, "directives/adaptive-routing.md"), "utf8");
    if (content === "custom content") throw new Error("file was not overwritten with force");
    assertContains(content, { needle: "adaptive-routing", context: "forced overwrite" });
  });
});

reportResults();
