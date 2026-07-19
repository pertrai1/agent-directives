#!/usr/bin/env tsx
import { lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertFileMissing,
  reportResults,
  runCli,
  test,
  withTempProject,
} from "./test-cli-helpers.js";

function assertExternalSentinelUnchanged(external: string): void {
  const contents = readdirSync(external).sort();
  if (contents.join(",") !== "sentinel.txt") {
    throw new Error(`unsafe install escaped through an ancestor symlink: ${contents.join(", ")}`);
  }
  if (readFileSync(join(external, "sentinel.txt"), "utf8") !== "outside sentinel") {
    throw new Error("unsafe install modified the external sentinel");
  }
}

console.log("install path safety");
test("force rejects a symlinked .agents install root without escaping", () => {
  withTempProject((external) => {
    writeFileSync(join(external, "sentinel.txt"), "outside sentinel");
    withTempProject((cwd) => {
      symlinkSync(external, join(cwd, ".agents"));

      const result = runCli("sync --tool claude --yes --force", { cwd, allowFail: true });
      if (result.code === 0) throw new Error("expected sync to reject a symlinked .agents root");
      assertExternalSentinelUnchanged(external);
    });
  });
});

test("force rejects a nested .agents ancestor symlink without escaping", () => {
  withTempProject((external) => {
    writeFileSync(join(external, "sentinel.txt"), "outside sentinel");
    withTempProject((cwd) => {
      mkdirSync(join(cwd, ".agents"));
      symlinkSync(external, join(cwd, ".agents/directives"));

      const result = runCli("add adaptive-routing --tool claude --force", { cwd, allowFail: true });
      if (result.code === 0) throw new Error("expected add to reject a nested .agents ancestor symlink");
      assertExternalSentinelUnchanged(external);
    });
  });
});

test("force rejects a symlinked Cursor install root without escaping", () => {
  withTempProject((external) => {
    writeFileSync(join(external, "sentinel.txt"), "outside sentinel");
    withTempProject((cwd) => {
      symlinkSync(external, join(cwd, ".cursor"));

      const result = runCli("sync --tool cursor --yes --force", { cwd, allowFail: true });
      if (result.code === 0) throw new Error("expected sync to reject a symlinked .cursor root");
      assertExternalSentinelUnchanged(external);
    });
  });
});

test("force exits nonzero when a directory conflict remains and leaves the entry unchanged", () => {
  withTempProject((cwd) => {
    const asset = join(cwd, ".agents/directives/references/adaptive-routing-detail.md");
    const bootstrap = join(cwd, ".agents/directives/adaptive-routing.md");
    mkdirSync(asset, { recursive: true });

    const result = runCli("sync --tool claude --yes --force", { cwd, allowFail: true });
    if (result.code === 0) throw new Error("expected force to fail for a directory target conflict");
    if (!lstatSync(asset).isDirectory()) throw new Error("force replaced a directory target conflict");
    assertFileMissing(bootstrap);
  });
});

reportResults();
