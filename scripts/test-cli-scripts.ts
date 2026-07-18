#!/usr/bin/env tsx
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertContains,
  assertFileExists,
  reportResults,
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

test("refuses to overwrite a conflicting helper script without force", () => {
  withTempProject((cwd) => {
    const scriptPath = join(cwd, ".agents/directives/scripts/gates.sh");
    mkdirSync(dirname(scriptPath), { recursive: true });
    writeFileSync(scriptPath, "custom script");

    const noForce = runCli("add verification --tool claude", { cwd, allowFail: true });
    if (noForce.code === 0) throw new Error("expected non-zero exit for conflicting script");
    assertContains(noForce.stderr, { needle: "script conflict", context: "script conflict report" });
    if (readFileSync(scriptPath, "utf8") !== "custom script") throw new Error("script overwritten without --force");

    runCli("add verification --tool claude --force", { cwd });
    if (readFileSync(scriptPath, "utf8") === "custom script") throw new Error("script not overwritten with --force");
  });
});

reportResults();
