#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Options {
  repoRoot: string;
  base: string;
}

interface DiffEntry {
  path: string;
  previousPath: string | null;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
}

interface ValidationResult {
  checked: number;
  errors: string[];
  warnings: string[];
}

function runGit(repoRoot: string, args: string, allowFail = false): string {
  try {
    return execSync(`git ${args}`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (allowFail) return '';
    throw err;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function parseVersion(text: string): string | null {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const end = normalized.indexOf('\n---\n', 4);
  if (!normalized.startsWith('---\n') || end === -1) return null;
  const frontmatter = normalized.slice(4, end);
  return frontmatter.match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1] ?? null;
}

function parsePlainSemver(value: string): number[] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareSemver(a: string, b: string): number | null {
  const left = parsePlainSemver(a);
  const right = parsePlainSemver(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

function baseRefError(repoRoot: string, base: string): string | null {
  const resolved = runGit(repoRoot, `rev-parse --verify ${shellQuote(`${base}^{commit}`)}`, true).trim();
  if (resolved) return null;
  return `${base}: invalid or missing base ref; fetch the PR base branch or pass --base <ref>`;
}

function mergeBaseRef(repoRoot: string, base: string): string {
  return runGit(repoRoot, `merge-base ${shellQuote(base)} HEAD`).trim();
}

function changedInstructionFiles(repoRoot: string, base: string): DiffEntry[] {
  const mergeBase = mergeBaseRef(repoRoot, base);
  const output = runGit(
    repoRoot,
    `diff --name-status --find-renames --diff-filter=ADMR ${shellQuote(mergeBase)} -- 'directives/*.md' 'skills/*/SKILL.md'`,
  );

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): DiffEntry => {
      const [statusCode, firstPath, secondPath] = line.split('\t');
      const status = statusCode[0];
      if (status === 'R') return { path: secondPath, previousPath: firstPath, status: 'renamed' };
      if (status === 'A') return { path: firstPath, previousPath: null, status: 'added' };
      if (status === 'D') return { path: firstPath, previousPath: firstPath, status: 'deleted' };
      return { path: firstPath, previousPath: firstPath, status: 'modified' };
    });
}

function readCurrent(repoRoot: string, path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function readAtRef(repoRoot: string, ref: string, path: string): string | null {
  const output = runGit(repoRoot, `show ${shellQuote(`${ref}:${path}`)}`, true);
  return output || null;
}

export function validateVersionBumps(options: Options): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const gitDir = join(options.repoRoot, '.git');
  if (!existsSync(gitDir)) {
    return { checked: 0, errors: [`${options.repoRoot}: not a git repository`], warnings };
  }

  const baseError = baseRefError(options.repoRoot, options.base);
  if (baseError) return { checked: 0, errors: [baseError], warnings };

  const files = changedInstructionFiles(options.repoRoot, options.base);
  let checked = 0;

  for (const entry of files) {
    checked += 1;

    if (entry.status === 'deleted') {
      errors.push(`${entry.path}: instruction file deleted; deprecate with a major version bump before deletion`);
      continue;
    }

    const current = readCurrent(options.repoRoot, entry.path);
    const currentVersion = parseVersion(current);
    if (!currentVersion) {
      errors.push(`${entry.path}: missing plain semver frontmatter version`);
      continue;
    }

    if (entry.status === 'added' || !entry.previousPath) {
      if (!parsePlainSemver(currentVersion)) {
        errors.push(`${entry.path}: version must be plain semver MAJOR.MINOR.PATCH (was ${currentVersion})`);
      }
      continue;
    }

    const previous = readAtRef(options.repoRoot, options.base, entry.previousPath);
    if (previous === null) {
      if (!parsePlainSemver(currentVersion)) {
        errors.push(`${entry.path}: version must be plain semver MAJOR.MINOR.PATCH (was ${currentVersion})`);
      }
      continue;
    }

    const previousVersion = parseVersion(previous);
    if (!previousVersion) {
      warnings.push(`${entry.path}: previous version missing at ${options.base}; current version ${currentVersion} accepted`);
      continue;
    }

    const ordering = compareSemver(currentVersion, previousVersion);
    if (ordering === null) {
      errors.push(`${entry.path}: version must be plain semver MAJOR.MINOR.PATCH (was ${previousVersion} -> ${currentVersion})`);
    } else if (ordering <= 0) {
      const renameNote = entry.status === 'renamed' ? ` after rename from ${entry.previousPath}` : '';
      errors.push(`${entry.path}: changed${renameNote} without a version bump (${previousVersion} -> ${currentVersion})`);
    } else if (entry.status === 'renamed') {
      const currentParts = parsePlainSemver(currentVersion);
      const previousParts = parsePlainSemver(previousVersion);
      if (currentParts && previousParts && currentParts[0] <= previousParts[0]) {
        errors.push(`${entry.path}: renamed from ${entry.previousPath}; path changes require a major version bump (${previousVersion} -> ${currentVersion})`);
      }
    }
  }

  return { checked, errors, warnings };
}

function parseArgs(argv: string[]): Options {
  let base = process.env.VERSION_BUMP_BASE || process.env.GITHUB_BASE_REF || 'origin/main';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') {
      const value = argv[i + 1];
      if (!value) throw new Error('--base requires a value');
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
    console.log('Warnings:');
    for (const warning of result.warnings) console.log(`  - ${warning}`);
  }

  if (result.errors.length) {
    console.error('Version bump validation failed:');
    for (const error of result.errors) console.error(`  - ${error}`);
    console.error('\nBump the frontmatter version whenever an existing directive or skill changes. Use plain MAJOR.MINOR.PATCH format: patch for small wording/behavior tightening, minor for new coverage, and major for incompatible routing/schema/path changes. Deprecate removals with a major version bump before deletion.');
    process.exit(1);
  }

  console.log(`Version bump validation passed: ${result.checked} changed directive/skill file(s) checked.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
