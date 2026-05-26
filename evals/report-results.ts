#!/usr/bin/env tsx
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const resultsDir = join(repoRoot, 'evals', 'results');
const runsDir = join(resultsDir, 'runs');
const defaultOutput = join(resultsDir, 'report.html');

type Counts = { passed: number; failed: number; unclear: number; total: number };
type RoutingEvent = { target: string; expected_load: boolean; actual_load: boolean };
type RoutingTrace = {
  expected_files?: string[];
  provided_files?: string[];
  claimed_files?: string[];
  missing_expected?: string[];
  unexpected_claims?: string[];
};
type EvalRun = {
  source: string;
  scenario: string;
  date: string;
  model: string;
  judge_model: string;
  client: string;
  provider: string;
  instruction_surface: string;
  commit: string;
  verdict: string;
  targets: string[];
  expected: Counts;
  anti: Counts;
  quality: Counts;
  routing: RoutingEvent[];
  routing_trace?: RoutingTrace;
  failure_tags: string[];
  judge_summary: string;
};

const zero = (): Counts => ({ passed: 0, failed: 0, unclear: 0, total: 0 });
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const pct = (num: number, den: number) => den ? `${Math.round((num / den) * 100)}%` : 'n/a';
const array = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const bool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.trim().toLowerCase());
  return Boolean(value);
};
const first = (...values: unknown[]): unknown => values.find((value) => value !== undefined && value !== null && value !== '');
const counts = (value: any): Counts => {
  if (!value || typeof value !== 'object') return zero();
  const passed = Number(value.passed ?? value.pass ?? 0);
  const failed = Number(value.failed ?? value.fail ?? 0);
  const unclear = Number(value.unclear ?? 0);
  const total = Number(value.total ?? passed + failed + unclear);
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

function currentCommit(): string {
  return spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
}

function frontmatter(text: string): [Record<string, string>, string] {
  if (!text.startsWith('---\n')) return [{}, text];
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return [{}, text];
  const meta: Record<string, string> = {};
  for (const line of text.slice(4, end).split('\n')) {
    const match = line.match(/^([^:\s][^:]*):\s*(.*)$/);
    if (match) meta[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return [meta, text.slice(end + 5)];
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
    date: meta.date || '',
    model: meta.agent_model || meta.model || '',
    judge_model: meta.judge_model || '',
    client: meta.client || '',
    provider: meta.provider || '',
    instruction_surface: meta.instruction_surface || '',
    commit: meta.directive_sha || meta.commit || '',
    verdict: verdict(meta.verdict),
  };
}

function extractJudgeSummary(body: string): string {
  return body.match(/(?:\*\*)?Signal:(?:\*\*)?\s*(.+)/i)?.[1]?.trim() ?? '';
}

function parseMarkdown(path: string): EvalRun {
  const [meta, body] = frontmatter(readFileSync(path, 'utf8'));
  const scenario = meta.scenario || basename(path, '.md');
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
    scenario: String(data.scenario ?? basename(path, '.json')),
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

function collectRuns(): EvalRun[] {
  return [...loadFromResultsDir(), ...loadFromRunsDir()].sort(
    (a, b) => (b.date || '').localeCompare(a.date || ''),
  );
}

function isStale(commit: string, head: string): boolean {
  return Boolean(commit) && Boolean(head) && commit !== head;
}

function aggregateTargets(run: EvalRun, targetCounts: Map<string, { total: number; pass: number }>): void {
  for (const target of run.targets.length ? run.targets : ['uncategorized']) {
    const current = targetCounts.get(target) ?? { total: 0, pass: 0 };
    current.total += 1;
    if (run.verdict === 'pass') current.pass += 1;
    targetCounts.set(target, current);
  }
}

function aggregateRouting(routing: RoutingEvent[], totals: { expected: number; actual: number; claimed: number }): void {
  for (const route of routing) {
    if (route.actual_load) totals.claimed += 1;
    if (route.expected_load) totals.expected += 1;
    if (route.expected_load && route.actual_load) totals.actual += 1;
  }
}

function renderTrace(trace?: RoutingTrace): string {
  if (!trace) return '';
  const e = trace.expected_files?.length ?? 0;
  const p = trace.provided_files?.length ?? 0;
  const c = trace.claimed_files?.length ?? 0;
  return `expected ${e}; provided ${p}; claimed ${c}`;
}

function renderRunRow(run: EvalRun, head: string): string {
  const staleMark = isStale(run.commit, head) ? 'stale' : '';
  const trace = renderTrace(run.routing_trace);
  const client = run.client || run.model || 'unknown';
  return `<tr class="${staleMark}"><td>${esc(run.scenario)}</td><td>${esc(run.verdict)}</td><td>${esc(client)}</td><td>${esc(run.instruction_surface)}</td><td>${esc(run.commit)}</td><td>${esc(trace)}</td><td>${esc(run.judge_summary)}</td></tr>`;
}

function render(runs: EvalRun[]): string {
  const head = currentCommit();
  const verdictCounts = new Map<string, number>();
  const targetCounts = new Map<string, { total: number; pass: number }>();
  const tags = new Map<string, number>();
  const routeTotals = { expected: 0, actual: 0, claimed: 0 };
  let stale = 0;
  for (const run of runs) {
    verdictCounts.set(run.verdict, (verdictCounts.get(run.verdict) ?? 0) + 1);
    if (isStale(run.commit, head)) stale += 1;
    for (const tag of run.failure_tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    aggregateTargets(run, targetCounts);
    aggregateRouting(run.routing, routeTotals);
  }
  const { expected: routeExpected, actual: routeActual, claimed: routeClaimed } = routeTotals;
  const targetRows = [...targetCounts.entries()].sort().map(([target, count]) => `<tr><td>${esc(target)}</td><td>${count.pass}/${count.total}</td><td>${pct(count.pass, count.total)}</td></tr>`).join('\n');
  const tagRows = [...tags.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => `<tr><td>${esc(tag)}</td><td>${count}</td></tr>`).join('\n') || '<tr><td colspan="2">No failure tags recorded.</td></tr>';
  const runRows = runs.map((run) => renderRunRow(run, head)).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Agent Directives Eval Health</title><style>
body{font-family:system-ui,sans-serif;max-width:1200px;margin:2rem auto;padding:0 1rem;line-height:1.4}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ddd;padding:.45rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.stale{background:#fff7e6}.metric{display:inline-block;margin-right:1rem;padding:.5rem .75rem;background:#f5f5f5;border-radius:.4rem}code{background:#f5f5f5;padding:.1rem .25rem}</style></head><body>
<h1>Agent Directives Eval Health</h1>
<p>Generated at ${esc(new Date().toISOString())}. Percentages are covered-scenario telemetry, not global directive accuracy. Current commit: <code>${esc(head)}</code>.</p>
<p><span class="metric">Runs: ${runs.length}</span><span class="metric">Pass: ${verdictCounts.get('pass') ?? 0}</span><span class="metric">Partial: ${verdictCounts.get('partial') ?? 0}</span><span class="metric">Fail: ${verdictCounts.get('fail') ?? 0}</span><span class="metric">Stale commit: ${stale}</span><span class="metric">Routing recall: ${routeActual}/${routeExpected} ${pct(routeActual, routeExpected)}</span><span class="metric">Routing precision: ${routeActual}/${routeClaimed} ${pct(routeActual, routeClaimed)}</span></p>
<h2>Target Health</h2><table><thead><tr><th>Target</th><th>Pass / Runs</th><th>Pass rate</th></tr></thead><tbody>${targetRows}</tbody></table>
<h2>Failure Tags</h2><table><thead><tr><th>Tag</th><th>Count</th></tr></thead><tbody>${tagRows}</tbody></table>
<h2>Runs</h2><table><thead><tr><th>Scenario</th><th>Verdict</th><th>Client / model</th><th>Instruction surface</th><th>Commit</th><th>Routing trace</th><th>Summary</th></tr></thead><tbody>${runRows}</tbody></table>
</body></html>`;
}

let output = defaultOutput;
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
if (outputIndex >= 0) output = args[outputIndex + 1] ?? defaultOutput;
mkdirSync(resultsDir, { recursive: true });
const runs = collectRuns();
writeFileSync(output, render(runs));
const verdictSummary = runs.reduce<Record<string, number>>((acc, run) => {
  acc[run.verdict] = (acc[run.verdict] ?? 0) + 1;
  return acc;
}, {});
const routing = runs.flatMap((run) => run.routing);
const expectedLoads = routing.filter((event) => event.expected_load).length;
const actualExpectedLoads = routing.filter((event) => event.expected_load && event.actual_load).length;
const actualLoads = routing.filter((event) => event.actual_load).length;
console.log(`Wrote ${output} with ${runs.length} runs.`);
console.log(`Verdicts: pass=${verdictSummary.pass ?? 0}, partial=${verdictSummary.partial ?? 0}, fail=${verdictSummary.fail ?? 0}, invalid=${verdictSummary.invalid ?? 0}, unknown=${verdictSummary.unknown ?? 0}`);
console.log(`Routing recall: ${actualExpectedLoads}/${expectedLoads} ${pct(actualExpectedLoads, expectedLoads)}; precision: ${actualExpectedLoads}/${actualLoads} ${pct(actualExpectedLoads, actualLoads)}`);
