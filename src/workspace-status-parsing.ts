import { isAbsolute, normalize, relative, resolve, sep } from 'node:path';

const PORCELAIN_FIXED_FIELDS = 8;
const STATUS_CODE_END = 4;
const STATUS_PREFIX_LENGTH = 2;
const UNTRACKED_PREFIX_LENGTH = 2;

export function normalizePathForReport(cwd: string, pathValue: string): string {
  const absolute = isAbsolute(pathValue) ? pathValue : resolve(cwd, pathValue);
  const rel = relative(cwd, absolute);
  return !rel || rel === '.' ? '.' : normalize(rel).split(sep).join('/');
}

function markUntracked(options: { cwd: string; record: string; untracked: Set<string> }): number {
  options.untracked.add(normalizePathForReport(options.cwd, options.record.slice(UNTRACKED_PREFIX_LENGTH)));
  return 0;
}

function markTracked(options: { cwd: string; record: string; staged: Set<string>; unstaged: Set<string> }): number {
  const pathValue = options.record.split(' ').slice(PORCELAIN_FIXED_FIELDS).join(' ');
  const status = options.record.slice(STATUS_PREFIX_LENGTH, STATUS_CODE_END);
  if (status[0] !== '.') options.staged.add(normalizePathForReport(options.cwd, pathValue));
  if (status[1] !== '.') options.unstaged.add(normalizePathForReport(options.cwd, pathValue));
  return 0;
}

function markRename(options: { cwd: string; record: string; index: number; records: string[]; staged: Set<string>; unstaged: Set<string> }): number {
  markTracked(options);
  const source = options.records[options.index + 1];
  if (source && source[0] !== '1' && source[0] !== '2' && source[0] !== '?' && source[0] !== '#') {
    options.staged.add(normalizePathForReport(options.cwd, source));
    return 1;
  }
  return 0;
}

function parseRecord(options: { cwd: string; record: string; index: number; records: string[]; staged: Set<string>; unstaged: Set<string>; untracked: Set<string> }): number {
  const kind = options.record[0];
  if (kind === '?') return markUntracked(options);
  if (kind === '1') return markTracked(options);
  if (kind === '2') return markRename(options);
  return 0;
}

export function parsePorcelainStatus(cwd: string, output: string): { staged: string[]; unstaged: string[]; untracked: string[] } {
  const staged = new Set<string>();
  const unstaged = new Set<string>();
  const untracked = new Set<string>();
  const records = output.split('\0').filter(Boolean);
  for (let index = 0; index < records.length; index += 1) {
    index += parseRecord({ cwd, record: records[index], index, records, staged, unstaged, untracked });
  }
  return {
    staged: [...staged].sort((a, b) => a.localeCompare(b)),
    unstaged: [...unstaged].sort((a, b) => a.localeCompare(b)),
    untracked: [...untracked].sort((a, b) => a.localeCompare(b)),
  };
}

export const WORKSPACE_STATUS_PARSING = true;
