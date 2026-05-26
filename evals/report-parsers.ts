import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Counts, EvalRun, RoutingEvent } from './report-types.js';

export const repoRoot = fileURLToPath(new URL('..', import.meta.url));
export const resultsDir = join(repoRoot, 'evals', 'results');
export const runsDir = join(resultsDir, 'runs');
export const defaultOutput = join(resultsDir, 'report.html');

const PERCENT_MULTIPLIER = 100;
const FRONTMATTER_OPEN_LENGTH = 4;
const FRONTMATTER_CLOSE_LENGTH = 5;

const zero = (): Counts => ({ passed: 0, failed: 0, unclear: 0, total: 0 });

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function pct(num: number, den: number): string {
  return den ? `${Math.round((num / den) * PERCENT_MULTIPLIER)}%` : 'n/a';
}
const array = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const bool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.trim().toLowerCase());
  return Boolean(value);
};
const first = (...values: unknown[]): unknown => values.find((value) => value !== undefined && value !== null && value !== '');
const toCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};
const counts = (value: any): Counts => {
  if (!value || typeof value !== 'object') return zero();
  const passed = toCount(value.passed ?? value.pass ?? 0);
  const failed = toCount(value.failed ?? value.fail ?? 0);
  const unclear = toCount(value.unclear ?? 0);
  const total = toCount(value.total);
  return { passed, failed, unclear, total: total || passed + failed + unclear };
};
const verdict = (value: unknown): string => {
  const raw = String(value ?? 'unknown').toLowerCase();
  if (['passed', 'pass', 'ok', 'success'].includes(raw)) return 'pass';
  if (['partial', 'warn', 'warning', 'mixed'].includes(raw)) return 'partial';
  if (['failed', 'fail', 'failure'].includes(raw)) return 'fail';
  if (raw === 'invalid') return 'invalid';
  return 'unknown';
};

export function currentCommit(): string {
  return spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
}

function frontmatter(text: string): [Record<string, string>, string] {
  if (!text.startsWith('---\n')) return [{}, text];
  const end = text.indexOf('\n---\n', FRONTMATTER_OPEN_LENGTH);
  if (end === -1) return [{}, text];
  const meta: Record<string, string> = {};
  for (const line of text.slice(FRONTMATTER_OPEN_LENGTH, end).split('\n')) {
    const match = line.match(/^([^:\s][^:]*):\s*(.*)$/);
    if (match) meta[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return [meta, text.slice(end + FRONTMATTER_CLOSE_LENGTH)];
}

function extractSectionCounts(body: string, name: string): Counts {
  const match = body.match(new RegExp(`### ${name}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`, 'i'));
  if (!match) return zero();
  const result = zero();
  for (const status of match[1].matchAll(/\[(PASS|FAIL|UNCLEAR)\]/gi)) {
    result.total += 1;
    const normalized = status[1].toLowerCase();
    if (normalized === 'pass') result.passed += 1;
    else if (normalized === 'fail') result.failed += 1;
    else result.unclear += 1;
  }
  return result;
}

function scenarioTargets(scenario: string): string[] {
  const path = join(repoRoot, 'evals', 'scenarios', `${scenario}.md`);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const section = text.match(/^## Directive Under Test\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
  return [...section.matchAll(/`([^`]+(?:\.md|SKILL\.md))`/g)].map((m) => m[1]);
}

function metaFields(meta: Record<string, string>): Partial<EvalRun> {
  return {
    date: meta.date ?? '',
    model: meta.agent_model || meta.model || '',
    judge_model: meta.judge_model ?? '',
    client: meta.client ?? '',
    provider: meta.provider ?? '',
    instruction_surface: meta.instruction_surface ?? '',
    commit: meta.directive_sha || meta.commit || '',
    verdict: verdict(meta.verdict),
  };
}

function extractJudgeSummary(body: string): string {
  return body.match(/(?:\*\*)?Signal:(?:\*\*)?\s*(.+)/i)?.[1]?.trim() ?? '';
}

function parseMarkdown(path: string): EvalRun {
  const [meta, body] = frontmatter(readFileSync(path, 'utf8'));
  const scenario = String(first(meta.scenario, basename(path, '.md')));
  return {
    source: path,
    scenario,
    ...metaFields(meta),
    targets: scenarioTargets(scenario),
    expected: extractSectionCounts(body, 'Expected Behaviors'),
    anti: extractSectionCounts(body, 'Anti-Behaviors'),
    quality: extractSectionCounts(body, 'Quality Criteria'),
    routing: [],
    failure_tags: [],
    judge_summary: extractJudgeSummary(body),
  } as EvalRun;
}

function jsonStringFields(data: any): Partial<EvalRun> {
  return {
    scenario: String(data.scenario ?? ''),
    date: String(first(data.date, data.timestamp) ?? ''),
    model: String(first(data.model, data.agent_model) ?? ''),
    judge_model: String(data.judge_model ?? ''),
    client: String(data.client ?? ''),
    provider: String(data.provider ?? ''),
    instruction_surface: String(data.instruction_surface ?? ''),
    commit: String(first(data.commit, data.directive_sha) ?? ''),
    judge_summary: String(first(data.judge_summary, data.summary) ?? ''),
  };
}

function parseRouteEvent(event: any): RoutingEvent {
  return {
    target: String(event.target ?? ''),
    expected_load: bool(event.expected_load),
    actual_load: bool(event.actual_load),
  };
}

function parseJson(path: string): EvalRun {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const checklist = data.checklists ?? data.scores ?? {};
  const routeEvents = Array.isArray(data.routing) ? data.routing : [];
  return {
    source: path,
    ...jsonStringFields(data),
    scenario: String(data.scenario ?? basename(path, '.json')),
    verdict: verdict(data.verdict),
    targets: array(data.targets),
    expected: counts(first(data.expected, checklist.expected, checklist['Expected Behaviors'])),
    anti: counts(first(data.anti, checklist.anti, checklist['Anti-Behaviors'])),
    quality: counts(first(data.quality, checklist.quality, checklist['Quality Criteria'])),
    routing: routeEvents.map(parseRouteEvent),
    routing_trace: data.routing_trace,
    failure_tags: array(data.failure_tags),
  } as EvalRun;
}

function parseManifest(path: string): EvalRun {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const provided = Array.isArray(data.loaded_files) ? data.loaded_files.map((file: any) => String(file.path)) : [];
  const expected = array(data.expected_loads);
  const claimed = array(data.claimed_loaded_files);
  return {
    source: path,
    scenario: String(first(data.scenario, basename(dirname(path))) ?? ''),
    date: String(data.date ?? ''),
    model: String(data.model ?? ''),
    judge_model: '',
    client: String(data.client ?? ''),
    provider: String(data.provider ?? ''),
    instruction_surface: String(data.instruction_surface ?? ''),
    commit: String(data.commit ?? ''),
    verdict: 'unknown',
    targets: expected,
    expected: zero(),
    anti: zero(),
    quality: zero(),
    routing: expected.map((target) => ({ target, expected_load: true, actual_load: provided.includes(target) })),
    routing_trace: {
      expected_files: expected,
      provided_files: provided,
      claimed_files: claimed,
      missing_expected: expected.filter((target) => !provided.includes(target)),
      unexpected_claims: claimed.filter((target) => !expected.includes(target))
    },
    failure_tags: [],
    judge_summary: 'Harness manifest only; no judge verdict recorded.'
  };
}

function invalidRun(path: string, error: unknown): EvalRun {
  return {
    source: path,
    scenario: basename(path).replace(/\.(json|md)$/, ''),
    date: '',
    model: '',
    judge_model: '',
    client: '',
    provider: '',
    instruction_surface: '',
    commit: '',
    verdict: 'invalid',
    targets: [],
    expected: zero(),
    anti: zero(),
    quality: zero(),
    routing: [],
    failure_tags: ['invalid-result'],
    judge_summary: error instanceof Error ? error.message : String(error)
  };
}

function safeParse(path: string, parser: (path: string) => EvalRun): EvalRun {
  try {
    return parser(path);
  } catch (error) {
    return invalidRun(path, error);
  }
}

function loadFromResultsDir(): EvalRun[] {
  if (!existsSync(resultsDir)) return [];
  const runs: EvalRun[] = [];
  for (const file of readdirSync(resultsDir)) {
    if (file === 'README.md' || file === 'report.html') continue;
    const path = join(resultsDir, file);
    if (file.endsWith('.md')) runs.push(safeParse(path, parseMarkdown));
    else if (file.endsWith('.json')) runs.push(safeParse(path, parseJson));
  }
  return runs;
}

function loadFromRunsDir(): EvalRun[] {
  if (!existsSync(runsDir)) return [];
  const runs: EvalRun[] = [];
  for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
    const path = join(runsDir, entry.name);
    if (entry.isDirectory() && existsSync(join(path, 'manifest.json'))) {
      runs.push(safeParse(join(path, 'manifest.json'), parseManifest));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      runs.push(safeParse(path, parseJson));
    }
  }
  return runs;
}

export function collectRuns(): EvalRun[] {
  return [...loadFromResultsDir(), ...loadFromRunsDir()].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
}
