import { execSync } from 'node:child_process';
import { matchGlob } from './glob.js';
import type { ManifestEntry } from './manifest.js';

/** Represents the result of running a single verification gate check. */
export interface VerifyResult {
  name: string;
  command: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  output?: string;
}

export interface ActiveGate {
  name: string;
  run: string;
  files?: string[];
  sourceId: string;
}

const PORCELAIN_STATUS_LENGTH = 3;

function parsePorcelain(parts: string[]): string[] {
  const files: string[] = [];
  let index = 0;
  while (index < parts.length) {
    const part = parts[index];
    if (!part) {
      index++;
      continue;
    }
    const status = part.slice(0, 2);
    const file = part.slice(PORCELAIN_STATUS_LENGTH);
    const destination = parts[index + 1];
    if (status.startsWith('R') && destination) {
      files.push(destination);
      index += 2;
      continue;
    }
    files.push(file);
    index++;
  }
  return files;
}

export function getModifiedFiles(cwd: string = process.cwd()): string[] | null {
  try {
    const output = execSync('git status --porcelain=v1 -z', { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
    return parsePorcelain(output.split('\0'));
  } catch {
    return null;
  }
}

export function hasGitRepo(cwd: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getInstalledGates(installed: ManifestEntry[]): ActiveGate[] {
  const gates: ActiveGate[] = [];
  for (const entry of installed) {
    const commands = entry.verification?.commands;
    if (!commands) continue;
    for (const command of commands) {
      gates.push({
        name: command.name,
        run: command.run,
        files: command.files,
        sourceId: entry.id,
      });
    }
  }
  return gates;
}

function shouldRunGate(options: { gate: ActiveGate; isGit: boolean; changedFiles: string[] }): boolean {
  const { gate, isGit, changedFiles } = options;
  if (!gate.files || !isGit) return true;
  return changedFiles.some((file) => gate.files?.some((glob) => matchGlob(file, glob)));
}

function readExecutionOutput(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { stdout?: Buffer | string; stderr?: Buffer | string };
  const stdout = String(record.stdout ?? '');
  const stderr = String(record.stderr ?? '');
  const output = [stdout, stderr].filter((value) => value.length > 0).join('\n');
  return output.length > 0 ? output : undefined;
}

function executeCapturedGate(gate: ActiveGate, cwd: string): { status: 'passed' | 'failed'; error?: string; output?: string } {
  try {
    const output = execSync(gate.run, { stdio: ['ignore', 'pipe', 'pipe'], cwd, encoding: 'utf8' });
    return { status: 'passed', output };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'failed', error: message, output: readExecutionOutput(error) };
  }
}

function executeStreamingGate(gate: ActiveGate, cwd: string): { status: 'passed' | 'failed'; error?: string } {
  console.log('Running gate', { name: gate.name, command: gate.run });
  try {
    execSync(gate.run, { stdio: 'inherit', cwd });
    console.log('Passed gate', { name: gate.name });
    return { status: 'passed' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error && typeof error === 'object' && 'status' in error ? error.status : 1;
    console.error('Failed gate', { name: gate.name, status });
    return { status: 'failed', error: message };
  }
}

function executeGate(options: { gate: ActiveGate; cwd: string; captureOutput: boolean }): { status: 'passed' | 'failed'; error?: string; output?: string } {
  return options.captureOutput ? executeCapturedGate(options.gate, options.cwd) : executeStreamingGate(options.gate, options.cwd);
}

export interface RunGatesOptions {
  gates: ActiveGate[];
  isGit: boolean;
  changedFiles: string[];
  cwd: string;
  captureOutput?: boolean;
}

export function runGates(options: RunGatesOptions): { results: VerifyResult[]; hasFailures: boolean } {
  const { gates, isGit, changedFiles, cwd, captureOutput = false } = options;
  const results: VerifyResult[] = [];
  let hasFailures = false;
  for (const gate of gates) {
    if (!shouldRunGate({ gate, isGit, changedFiles })) {
      results.push({ name: gate.name, command: gate.run, status: 'skipped' });
      continue;
    }
    const execution = executeGate({ gate, cwd, captureOutput });
    if (execution.status === 'failed') hasFailures = true;
    results.push({ name: gate.name, command: gate.run, status: execution.status, error: execution.error, output: execution.output });
  }
  return { results, hasFailures };
}
