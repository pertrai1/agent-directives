#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertContains,
  reportResults,
  repoRoot,
  runCli,
  test,
  withTempProject,
} from "./test-cli-helpers.js";

function createManifestFixture(cwd: string): void {
  for (const directory of ["directives", "skills", "rules"]) {
    cpSync(join(repoRoot, directory), join(cwd, directory), { recursive: true });
  }
  for (const file of [
    "scripts/generate-manifest.ts",
    "scripts/frontmatter.ts",
    "src/is-safe-repo-relative-path.ts",
    "src/resolve-safe-path-within-root.ts",
  ]) {
    const target = join(cwd, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repoRoot, file), target);
  }
}

function manifestGenerationError(cwd: string): string {
  try {
    execSync("tsx scripts/generate-manifest.ts", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return String((error as { stderr?: Buffer | string }).stderr ?? error);
  }
  throw new Error("expected manifest generation to reject invalid companion asset");
}

console.log("routing companion assets");
test("manifest generation rejects unsafe, empty, missing, and symlinked adaptive-routing assets", () => {
  withTempProject((cwd) => {
    createManifestFixture(cwd);
    const target = join(cwd, "directives/adaptive-routing.md");
    const asset = join(cwd, "directives/references/adaptive-routing-detail.md");
    const original = readFileSync(target, "utf8");
    const originalAsset = readFileSync(asset, "utf8");
    const invalidPaths = ["../README.md", "references/missing-detail.md", "references\\routing-detail.md", "C:/routing-detail.md", "references/../routing-detail.md"];

    for (const invalidPath of invalidPaths) {
      writeFileSync(target, original.replace("references/adaptive-routing-detail.md", invalidPath));
      assertContains(manifestGenerationError(cwd), { needle: invalidPath.includes("missing") ? "non-empty regular file" : "Invalid asset path", context: invalidPath });
    }
    writeFileSync(target, original);
    writeFileSync(asset, "");
    assertContains(manifestGenerationError(cwd), { needle: "non-empty regular file", context: "empty companion asset" });
    writeFileSync(asset, originalAsset);
    renameSync(asset, `${asset}.source`);
    symlinkSync(`${asset}.source`, asset);
    assertContains(manifestGenerationError(cwd), { needle: "non-empty regular file", context: "symlinked companion asset" });
  });
});

test("manifest generation rejects a symlinked source ancestor", () => {
  withTempProject((external) => {
    withTempProject((cwd) => {
      createManifestFixture(cwd);
      const references = join(cwd, "directives/references");
      const externalReferences = join(external, "references");
      renameSync(references, externalReferences);
      symlinkSync(externalReferences, references);

      assertContains(manifestGenerationError(cwd), { needle: "Unsafe asset source path", context: "symlinked source ancestor" });
    });
  });
});

test("enforces the adaptive-routing bootstrap token budget", () => {
  withTempProject((cwd) => {
    const result = runCli("context-audit --tool codex --entries adaptive-routing --max-tokens 3000", { cwd });
    assertContains(result.stdout, { needle: "Budget: 3,000 tokens — PASS", context: "adaptive-routing budget" });
  });
});

reportResults();
