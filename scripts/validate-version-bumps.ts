#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Options {
  repoRoot: string;
  base: string;
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
  const end = text.indexOf('\n---\n', 4);
  if (!text.startsWith('---\n') || end === -1) return null;
  const frontmatter = text.slice(4, end);
  return frontmatter.match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1] ?? null;
}

function compareSemver(a: string, b: string): number | null {
  const parse = (value: string): number[] | null => {
    const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
    return match ? match.slice(1).map(Number) : null;
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

function changedInstructionFiles(repoRoot: string, base: string): string[] {
  const output = runGit(
    repoRoot,
    `diff --name-only --diff-filter=AMR ${shellQuote(base)} -- directives/*.md skills/*/SKILL.md`,
    true,
  );
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
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

  const files = changedInstructionFiles(options.repoRoot, options.base);
  let checked = 0;

  for (const path of files) {
    const current = readCurrent(options.repoRoot, path);
    const currentVersion = parseVersion(current);
    if (!currentVersion) {
      errors.push(`${path}: missing semver frontmatter version`);
      continue;
    }

    const previous = readAtRef(options.repoRoot, options.base, path);
    if (previous === null) {
      checked += 1;
      continue;
    }

    checked += 1;
    const previousVersion = parseVersion(previous);
    if (!previousVersion) {
      warnings.push(`${path}: previous version missing at ${options.base}; current version ${currentVersion} accepted`);
      continue;
    }

    const ordering = compareSemver(currentVersion, previousVersion);
    if (ordering === null) {
      errors.push(`${path}: version must be plain semver MAJOR.MINOR.PATCH (was ${previousVersion} -> ${currentVersion})`);
    } else if (ordering <= 0) {
      errors.push(`${path}: changed without a version bump (${previousVersion} -> ${currentVersion})`);
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
    console.error('\nBump the frontmatter version whenever an existing directive or skill changes. Use a patch bump for small wording/behavior tightening, minor for new coverage, and major for incompatible routing/schema changes.');
    process.exit(1);
  }

  console.log(`Version bump validation passed: ${result.checked} changed directive/skill file(s) checked.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
