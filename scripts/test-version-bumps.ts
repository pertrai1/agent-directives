#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const validator = join(repoRoot, "scripts", "validate-version-bumps.ts");

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function run(opts: { bin: string; args: string[]; cwd: string; allowFail?: boolean }): RunResult {
  const result = spawnSync(opts.bin, opts.args, {
    cwd: opts.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const code = result.status ?? 1;
  if (code !== 0 && !opts.allowFail) {
    throw new Error(stderr.length > 0 ? stderr : `Command failed (${code}): ${opts.bin}`);
  }
  return { stdout, stderr, code };
}

function git(cwd: string, args: string[]): RunResult {
  return run({ bin: "git", args, cwd });
}

function validatorRun(opts: { cwd: string; args?: string[]; allowFail?: boolean }): RunResult {
  return run({
    bin: "tsx",
    args: [validator, ...(opts.args ?? [])],
    cwd: opts.cwd,
    allowFail: opts.allowFail,
  });
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`  ✗ ${name}`);
    console.log(`      ${message}`);
  }
}

function withTempRepo(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), "version-bump-test-"));
  try {
    git(cwd, ["init", "-q"]);
    git(cwd, ["config", "user.email", "test@example.com"]);
    git(cwd, ["config", "user.name", "Test"]);
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function skillPath(cwd: string, name = "demo"): string {
  return join(cwd, "skills", name, "SKILL.md");
}

function writeInstruction(
  cwd: string,
  opts: { body: string; version?: string; name?: string },
): void {
  const { body, version = "1.0.0", name = "demo" } = opts;
  mkdirSync(join(cwd, "skills", name), { recursive: true });
  writeFileSync(
    skillPath(cwd, name),
    `---\nname: ${name}\ndescription: Demo skill.\nversion: ${version}\nrequired: false\ncategory: review\ntools:\n  - claude\n---\n\n${body}\n`,
  );
}

console.log("version bump validation");

test("fails when an existing skill changes without a version bump", () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, { body: "Original behavior." });
    git(cwd, ["add", "."]);
    git(cwd, ["commit", "-qm", "initial"]);
    writeInstruction(cwd, { body: "Changed behavior." });

    const result = validatorRun({ cwd, args: ["--base", "HEAD"], allowFail: true });
    if (result.code === 0) throw new Error("expected non-zero exit code");
    if (!result.stderr.includes("changed without a version bump")) {
      throw new Error(
        `expected missing-version-bump error, got stderr: ${result.stderr}`,
      );
    }
  });
});

test("passes when an existing skill changes with a greater version", () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, { body: "Original behavior.", version: "1.0.0" });
    git(cwd, ["add", "."]);
    git(cwd, ["commit", "-qm", "initial"]);
    writeInstruction(cwd, { body: "Changed behavior.", version: "1.0.1" });

    const result = validatorRun({ cwd, args: ["--base", "HEAD"] });
    if (!result.stdout.includes("Version bump validation passed")) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test("passes for a new skill with an initial version", () => {
  withTempRepo((cwd) => {
    git(cwd, ["commit", "--allow-empty", "-qm", "initial"]);
    writeInstruction(cwd, { body: "New behavior.", version: "1.0.0" });
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"] });
    if (!result.stdout.includes("Version bump validation passed")) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test("fails when an existing instruction file is deleted", () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, { body: "Original behavior.", version: "1.0.0" });
    git(cwd, ["add", "."]);
    git(cwd, ["commit", "-qm", "initial"]);
    rmSync(skillPath(cwd), { force: true });
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"], allowFail: true });
    if (result.code === 0) throw new Error("expected non-zero exit code");
    if (!result.stderr.includes("instruction file deleted")) {
      throw new Error(`expected deletion error, got stderr: ${result.stderr}`);
    }
  });
});

test("fails when an existing instruction file is renamed without a major bump", () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, { body: "Original behavior.", version: "1.0.0", name: "demo" });
    git(cwd, ["add", "."]);
    git(cwd, ["commit", "-qm", "initial"]);
    mkdirSync(join(cwd, "skills", "renamed"), { recursive: true });
    renameSync(skillPath(cwd, "demo"), skillPath(cwd, "renamed"));
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"], allowFail: true });
    if (result.code === 0) throw new Error("expected non-zero exit code");
    if (!result.stderr.includes("without a version bump")) {
      throw new Error(
        `expected rename version-bump error, got stderr: ${result.stderr}`,
      );
    }
  });
});

test("passes when an existing instruction file is renamed with a major bump", () => {
  withTempRepo((cwd) => {
    writeInstruction(cwd, { body: "Original behavior.", version: "1.0.0", name: "demo" });
    git(cwd, ["add", "."]);
    git(cwd, ["commit", "-qm", "initial"]);
    writeInstruction(cwd, { body: "Renamed behavior.", version: "2.0.0", name: "renamed" });
    rmSync(join(cwd, "skills", "demo"), { recursive: true, force: true });
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"] });
    if (!result.stdout.includes("Version bump validation passed")) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

test("rejects prerelease versions because the policy only allows plain semver", () => {
  withTempRepo((cwd) => {
    git(cwd, ["commit", "--allow-empty", "-qm", "initial"]);
    writeInstruction(cwd, { body: "New behavior.", version: "1.0.0-beta.1" });
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"], allowFail: true });
    if (result.code === 0) throw new Error("expected non-zero exit code");
    if (!result.stderr.includes("plain semver MAJOR.MINOR.PATCH")) {
      throw new Error(
        `expected plain-semver error, got stderr: ${result.stderr}`,
      );
    }
  });
});

test("fails when the base ref is missing", () => {
  withTempRepo((cwd) => {
    git(cwd, ["commit", "--allow-empty", "-qm", "initial"]);

    const result = validatorRun({ cwd, args: ["--base", "origin/missing"], allowFail: true });
    if (result.code === 0) throw new Error("expected non-zero exit code");
    if (!result.stderr.includes("invalid or missing base ref")) {
      throw new Error(
        `expected invalid-base error, got stderr: ${result.stderr}`,
      );
    }
  });
});

test("parses BOM and CRLF frontmatter versions", () => {
  withTempRepo((cwd) => {
    git(cwd, ["commit", "--allow-empty", "-qm", "initial"]);
    mkdirSync(join(cwd, "skills", "demo"), { recursive: true });
    writeFileSync(
      skillPath(cwd),
      "\uFEFF---\r\nname: demo\r\ndescription: Demo skill.\r\nversion: 1.0.0\r\nrequired: false\r\ncategory: review\r\ntools:\r\n  - claude\r\n---\r\n\r\nNew behavior.\r\n",
    );
    git(cwd, ["add", "-A"]);

    const result = validatorRun({ cwd, args: ["--base", "HEAD"] });
    if (!result.stdout.includes("Version bump validation passed")) {
      throw new Error(`expected pass summary, got stdout: ${result.stdout}`);
    }
  });
});

console.log("\nResults");
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
