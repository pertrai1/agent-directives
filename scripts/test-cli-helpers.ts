import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("..", import.meta.url));
export const cliPath = join(repoRoot, "src", "cli.ts");

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

export function runCli(
  args: string,
  opts: { cwd: string; allowFail?: boolean },
): RunResult {
  try {
    const stdout = execSync(`tsx ${cliPath} ${args}`, {
      cwd: opts.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", code: 0 };
  } catch (error) {
    const e = error as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
    };
    if (!opts.allowFail) {
      const stderr = e.stderr ? e.stderr.toString() : String(error);
      const wrappedError = new Error(
        `CLI failed (${e.status ?? "unknown"}): ${stderr}`,
      ) as Error & { cause?: unknown };
      wrappedError.cause = error;
      throw wrappedError;
    }
    return {
      stdout: e.stdout ? e.stdout.toString() : "",
      stderr: e.stderr ? e.stderr.toString() : "",
      code: e.status ?? 1,
    };
  }
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

export function test(name: string, fn: () => void): void {
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

export function withTempProject(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), "skills-cli-test-"));
  try {
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

export function assertContains(haystack: string, opts: { needle: string; context: string }): void {
  if (!haystack.includes(opts.needle)) {
    throw new Error(`${opts.context}: expected output to contain '${opts.needle}'`);
  }
}

export function assertNotContains(haystack: string, opts: { needle: string; context: string }): void {
  if (haystack.includes(opts.needle)) {
    throw new Error(`${opts.context}: expected output NOT to contain '${opts.needle}'`);
  }
}

export function assertFileExists(path: string): void {
  if (!existsSync(path)) throw new Error(`expected file to exist: ${path}`);
}

export function assertFileMissing(path: string): void {
  if (existsSync(path)) throw new Error(`expected file NOT to exist: ${path}`);
}

export function reportResults(): void {
  console.log("\nResults");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}
