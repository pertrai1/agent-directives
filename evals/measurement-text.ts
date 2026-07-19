import { aggregateTokenEvidence, reconcileAttemptRecords } from './report-measurements.js';
import type { AttemptRecord, AttemptRegistration, EvalRun } from './report-types.js';
import { isDeepStrictEqual } from 'node:util';

function reportRecords(runs: EvalRun[]): AttemptRecord[] {
  return runs.filter((run): run is EvalRun & Required<Pick<EvalRun, 'attempt_id' | 'registration'>> => Boolean(run.attempt_id && run.registration)).map((run) => ({
    attempt_id: run.attempt_id, registration: run.registration, status: run.status, scenario: run.scenario,
    verdict: run.verdict, gates: run.gates ?? 'unknown', calls: run.calls ?? [], benchmark: run.benchmark, cohort: run.cohort,
    estimated_instruction_tokens: run.estimated_instruction_tokens, measurement_errors: run.measurement_errors,
  }));
}

function registry(records: AttemptRecord[]): { entries: AttemptRegistration[]; errors: string[] } {
  const entries = new Map<string, AttemptRegistration>();
  const errors: string[] = [];
  for (const record of records) {
    const existing = entries.get(record.registration.attempt_id);
    if (existing && !isDeepStrictEqual(existing, record.registration)) errors.push(`conflicting registration for attempt: ${record.attempt_id}`);
    if (!existing) entries.set(record.registration.attempt_id, record.registration);
  }
  return { entries: [...entries.values()], errors };
}

function categoryText(attempts: AttemptRecord[]): string {
  const categories = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const category = attempt.benchmark?.category ?? 'uncategorized';
    categories.set(category, [...(categories.get(category) ?? []), attempt]);
  }
  if (categories.size === 0) return 'categories: none';
  return `categories: ${[...categories.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([category, categoryAttempts]) => {
    const metrics = aggregateTokenEvidence(categoryAttempts);
    return `${category} (attempts=${metrics.attempts}, accepted=${metrics.accepted_changes}, tokens=${metrics.workflow_actual_tokens}, TPAC=${metrics.tokens_per_accepted_change ?? 'unknown'})`;
  }).join('; ')}`;
}

export function measurementText(runs: EvalRun[]): string {
  const records = reportRecords(runs);
  const registryResult = registry(records);
  const reconciliation = reconcileAttemptRecords(registryResult.entries, records);
  const valid = registryResult.errors.length === 0 && reconciliation.valid;
  const metrics = aggregateTokenEvidence(reconciliation.attempts);
  const hasLegacyOrUnreconciled = records.length !== runs.length || !valid;
  const tpac = !hasLegacyOrUnreconciled && metrics.tokens_per_accepted_change !== undefined ? String(metrics.tokens_per_accepted_change) : 'unknown';
  const coverageComplete = metrics.actual_usage_coverage_complete && !hasLegacyOrUnreconciled;
  const errors = [...registryResult.errors, ...reconciliation.errors];
  const invalidity = errors.length ? `; dataset: invalid (${errors.join(', ')})` : '';
  const denominator = valid ? reconciliation.attempts.length : runs.length;
  return `Attempts: ${denominator}; accepted changes: ${metrics.accepted_changes}; actual usage: ${metrics.actual_usage_attempts}/${denominator} (${coverageComplete ? 'complete' : 'incomplete'}); workflow tokens: ${metrics.workflow_actual_tokens}; evaluator tokens: ${metrics.evaluator_actual_tokens}; tokens per accepted change: ${tpac}; ${categoryText(reconciliation.attempts)}${invalidity}`;
}
