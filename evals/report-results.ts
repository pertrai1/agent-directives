#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  collectRuns,
  currentCommit,
  defaultOutput,
  esc,
  pct,
} from './report-parsers.js';
import type { EvalRun, RoutingEvent, RoutingTrace } from './report-types.js';
import { measurementText } from './measurement-text.js';

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
  const tagEntries = [...tags.entries()].sort((a, b) => b[1] - a[1]);
  const tagRows = tagEntries.length === 0
    ? '<tr><td colspan="2">No failure tags recorded.</td></tr>'
    : tagEntries.map(([tag, count]) => `<tr><td>${esc(tag)}</td><td>${count}</td></tr>`).join('\n');
  const runRows = runs.map((run) => renderRunRow(run, head)).join('\n');
  const measurement = measurementText(runs);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Agent Directives Eval Health</title><style>
body{font-family:system-ui,sans-serif;max-width:1200px;margin:2rem auto;padding:0 1rem;line-height:1.4}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ddd;padding:.45rem;text-align:left;vertical-align:top}th{background:#f5f5f5}.stale{background:#fff7e6}.metric{display:inline-block;margin-right:1rem;padding:.5rem .75rem;background:#f5f5f5;border-radius:.4rem}code{background:#f5f5f5;padding:.1rem .25rem}</style></head><body>
<h1>Agent Directives Eval Health</h1>
<p>Generated at ${esc(new Date().toISOString())}. Percentages are covered-scenario telemetry, not global directive accuracy. Current commit: <code>${esc(head)}</code>.</p>
<p><span class="metric">Runs: ${runs.length}</span><span class="metric">Pass: ${verdictCounts.get('pass') ?? 0}</span><span class="metric">Partial: ${verdictCounts.get('partial') ?? 0}</span><span class="metric">Fail: ${verdictCounts.get('fail') ?? 0}</span><span class="metric">Stale commit: ${stale}</span><span class="metric">Routing recall: ${routeActual}/${routeExpected} ${pct(routeActual, routeExpected)}</span><span class="metric">Routing precision: ${routeActual}/${routeClaimed} ${pct(routeActual, routeClaimed)}</span></p>
<h2>Token Evidence</h2><p>${esc(measurement)}</p>
<h2>Target Health</h2><table><thead><tr><th>Target</th><th>Pass / Runs</th><th>Pass rate</th></tr></thead><tbody>${targetRows}</tbody></table>
<h2>Failure Tags</h2><table><thead><tr><th>Tag</th><th>Count</th></tr></thead><tbody>${tagRows}</tbody></table>
<h2>Runs</h2><table><thead><tr><th>Scenario</th><th>Verdict</th><th>Client / model</th><th>Instruction surface</th><th>Commit</th><th>Routing trace</th><th>Summary</th></tr></thead><tbody>${runRows}</tbody></table>
</body></html>`;
}

let output = defaultOutput;
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
if (outputIndex >= 0) output = args[outputIndex + 1] ?? defaultOutput;
mkdirSync(dirname(output), { recursive: true });
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
const measurement = measurementText(runs);
console.log(`Wrote ${output} with ${runs.length} runs.`);
console.log(`Verdicts: pass=${verdictSummary.pass ?? 0}, partial=${verdictSummary.partial ?? 0}, fail=${verdictSummary.fail ?? 0}, invalid=${verdictSummary.invalid ?? 0}, unknown=${verdictSummary.unknown ?? 0}`);
console.log(`Routing recall: ${actualExpectedLoads}/${expectedLoads} ${pct(actualExpectedLoads, expectedLoads)}; precision: ${actualExpectedLoads}/${actualLoads} ${pct(actualExpectedLoads, actualLoads)}`);
console.log(measurement);
