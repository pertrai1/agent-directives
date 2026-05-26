#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface Options {
  repoRoot: string;
  base: string;
}

interface DiffEntry {
  path: string;
  previousPath: string | null;
  status: "added" | "deleted" | "modified" | "renamed";
}

interface ValidationResult {
  checked: number;
  errors: string[];
  warnings: string[];
}

const FRONTMATTER_OPEN_LENGTH = 4;
const SEMVER_PART_COUNT = 3;

function runGit(repoRoot: string, opts: { args: string[]; allowFail?: boolean }): string {
  try {
    return execFileSync("git", opts.args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (opts.allowFail) return "";
    throw error;
  }
}

function parseVersion(text: string): string | null {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const end = normalized.indexOf("\n---\n", FRONTMATTER_OPEN_LENGTH);
  if (!normalized.startsWith("---\n") || end === -1) return null;
  const frontmatter = normalized.slice(FRONTMATTER_OPEN_LENGTH, end);
  return (
    frontmatter.match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1] ?? null
  );
}

function parsePlainSemver(value: string): number[] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareSemver(a: string, b: string): number | null {
  const left = parsePlainSemver(a);
  const right = parsePlainSemver(b);
  if (!left || !right) return null;
  for (let i = 0; i < SEMVER_PART_COUNT; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

function baseRefError(repoRoot: string, base: string): string | null {
  const resolved = runGit(repoRoot, {
    args: ["rev-parse", "--verify", `${base}^{commit}`],
    allowFail: true,
  }).trim();
  if (resolved) return null;
  return `${base}: invalid or missing base ref; fetch the PR base branch or pass --base <ref>`;
}

function mergeBaseRef(repoRoot: string, base: string): string {
  return runGit(repoRoot, { args: ["merge-base", base, "HEAD"] }).trim();
}

function changedInstructionFiles(repoRoot: string, base: string): DiffEntry[] {
  const mergeBase = mergeBaseRef(repoRoot, base);
  const output = runGit(repoRoot, {
    args: ["diff", "--name-status", "--find-renames", "--diff-filter=ADMR", mergeBase, "--", "directives/*.md", "skills/*/SKILL.md"],
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): DiffEntry => {
      const [statusCode, firstPath, secondPath] = line.split("\t");
      const status = statusCode[0];
      if (status === "R")
        return { path: secondPath, previousPath: firstPath, status: "renamed" };
      if (status === "A")
        return { path: firstPath, previousPath: null, status: "added" };
      if (status === "D")
        return { path: firstPath, previousPath: firstPath, status: "deleted" };
      return { path: firstPath, previousPath: firstPath, status: "modified" };
    });
}

function readCurrent(repoRoot: string, path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function readAtRef(repoRoot: string, opts: { ref: string; path: string }): string | null {
  const output = runGit(repoRoot, {
    args: ["show", `${opts.ref}:${opts.path}`],
    allowFail: true,
  });
  return output.length > 0 ? output : null;
}

interface VersionCheckContext {
  currentVersion: string;
  previousVersion?: string;
  errors: string[];
}

interface EntryContext {
  options: Options;
  errors: string[];
  warnings: string[];
}

function checkPlainSemver(entry: DiffEntry, ctx: { currentVersion: string; errors: string[] }): void {
  if (!parsePlainSemver(ctx.currentVersion)) {
    ctx.errors.push(
      `${entry.path}: version must be plain semver MAJOR.MINOR.PATCH (was ${ctx.currentVersion})`,
    );
  }
}

function checkRenameMajor(entry: DiffEntry, ctx: Required<VersionCheckContext>): void {
  const currentParts = parsePlainSemver(ctx.currentVersion);
  const previousParts = parsePlainSemver(ctx.previousVersion);
  if (currentParts && previousParts && currentParts[0] <= previousParts[0]) {
    ctx.errors.push(
      `${entry.path}: renamed from ${entry.previousPath}; path changes require a major version bump (${ctx.previousVersion} -> ${ctx.currentVersion})`,
    );
  }
}

function compareVersions(entry: DiffEntry, ctx: Required<VersionCheckContext>): void {
  const { currentVersion, previousVersion, errors } = ctx;
  const ordering = compareSemver(currentVersion, previousVersion);
  if (ordering === null) {
    errors.push(
      `${entry.path}: version must be plain semver MAJOR.MINOR.PATCH (was ${previousVersion} -> ${currentVersion})`,
    );
    return;
  }
  if (ordering <= 0) {
    const renameNote =
      entry.status === "renamed"
        ? ` after rename from ${entry.previousPath}`
        : "";
    errors.push(
      `${entry.path}: changed${renameNote} without a version bump (${previousVersion} -> ${currentVersion})`,
    );
    return;
  }
  if (entry.status === "renamed") {
    checkRenameMajor(entry, ctx);
  }
}

function validateEntry(entry: DiffEntry, ctx: EntryContext): void {
  const { options, errors, warnings } = ctx;
  if (entry.status === "deleted") {
    errors.push(
      `${entry.path}: instruction file deleted; deprecate with a major version bump before deletion`,
    );
    return;
  }

  const current = readCurrent(options.repoRoot, entry.path);
  const currentVersion = parseVersion(current);
  if (!currentVersion) {
    errors.push(`${entry.path}: missing plain semver frontmatter version`);
    return;
  }

  if (entry.status === "added" || !entry.previousPath) {
    checkPlainSemver(entry, { currentVersion, errors });
    return;
  }

  const previous = readAtRef(options.repoRoot, { ref: options.base, path: entry.previousPath });
  if (previous === null) {
    checkPlainSemver(entry, { currentVersion, errors });
    return;
  }

  const previousVersion = parseVersion(previous);
  if (!previousVersion) {
    warnings.push(
      `${entry.path}: previous version missing at ${options.base}; current version ${currentVersion} accepted`,
    );
    return;
  }

  compareVersions(entry, { currentVersion, previousVersion, errors });
}

export function validateVersionBumps(options: Options): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const gitDir = join(options.repoRoot, ".git");
  if (!existsSync(gitDir)) {
    return {
      checked: 0,
      errors: [`${options.repoRoot}: not a git repository`],
      warnings,
    };
  }

  const baseError = baseRefError(options.repoRoot, options.base);
  if (baseError) return { checked: 0, errors: [baseError], warnings };

  const files = changedInstructionFiles(options.repoRoot, options.base);
  for (const entry of files) validateEntry(entry, { options, errors, warnings });

  return { checked: files.length, errors, warnings };
}

function parseArgs(argv: string[]): Options {
  let base =
    process.env.VERSION_BUMP_BASE ||
    process.env.GITHUB_BASE_REF ||
    "origin/main";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") {
      const value = argv[i + 1];
      if (!value) throw new Error("--base requires a value");
      base = value;
      i += 1;
    } else {
      throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  return { repoRoot: process.cwd(), base };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = validateVersionBumps(options);

  if (result.warnings.length) {
    console.log("Warnings:");
    for (const warning of result.warnings) console.log(`  - ${warning}`);
  }

  if (result.errors.length) {
    console.error("Version bump validation failed:");
    for (const error of result.errors) console.error(`  - ${error}`);
    console.error(
      "\nBump the frontmatter version whenever an existing directive or skill changes. Use plain MAJOR.MINOR.PATCH format: patch for small wording/behavior tightening, minor for new coverage, and major for incompatible routing/schema/path changes. Deprecate removals with a major version bump before deletion.",
    );
    process.exit(1);
  }

  console.log(
    `Version bump validation passed: ${result.checked} changed directive/skill file(s) checked.`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
