import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ManifestEntry } from './manifest.js';

export type Tool = 'claude' | 'copilot' | 'codex' | 'cursor';

export const KNOWN_TOOLS: readonly Tool[] = ['claude', 'copilot', 'codex', 'cursor'];

export function isTool(value: string): value is Tool {
  return (KNOWN_TOOLS as readonly string[]).includes(value);
}

export interface TargetConfig {
  resolvePath: (entry: ManifestEntry, cwd: string) => string;
}

function resolveFileCopyPath(entry: ManifestEntry, cwd: string): string {
  return join(cwd, '.agents', entry.path);
}

function resolveCursorPath(entry: ManifestEntry, cwd: string): string {
  if (entry.type === 'template') return resolveFileCopyPath(entry, cwd);
  return join(cwd, '.cursor', 'rules', `${entry.id}.mdc`);
}

export const TARGETS: Record<Tool, TargetConfig> = {
  claude: {
    resolvePath: resolveFileCopyPath,
  },
  copilot: {
    resolvePath: resolveFileCopyPath,
  },
  codex: {
    resolvePath: resolveFileCopyPath,
  },
  cursor: {
    resolvePath: resolveCursorPath,
  },
};

export function detectTool(cwd: string): Tool | null {
  if (existsSync(join(cwd, '.cursor'))) return 'cursor';
  if (existsSync(join(cwd, '.github', 'copilot-instructions.md'))) return 'copilot';
  if (existsSync(join(cwd, 'AGENTS.md'))) return 'codex';
  if (existsSync(join(cwd, 'CLAUDE.md')) || existsSync(join(cwd, '.claude'))) return 'claude';
  return null;
}
