import type {
  AttemptCall,
  AttemptRecord,
  AttemptRegistration,
  GateStatus,
  OutcomeAcceptance,
  ProviderUsage,
  TokenEvidence,
} from './report-types.js';
import { isDeepStrictEqual } from 'node:util';

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const usable = (usage?: ProviderUsage): boolean => Boolean(usage?.provenance.trim() && (isCount(usage.provider_total_tokens) || (isCount(usage.input_tokens) && isCount(usage.output_tokens))));

/** Uses a provider total as authoritative; cache fields remain diagnostics. */
export function workflowTokensForUsage(usage?: ProviderUsage): number | undefined {
  if (!usage) return undefined;
  if (isCount(usage.provider_total_tokens)) return usage.provider_total_tokens;
  if (isCount(usage.input_tokens) && isCount(usage.output_tokens)) return usage.input_tokens + usage.output_tokens;
  return undefined;
}

export function deriveOutcomeAcceptance(verdict: string | undefined, gates: GateStatus | undefined): OutcomeAcceptance {
  if (verdict === 'pass' && gates === 'pass') return 'accepted';
  if (!verdict || verdict === 'unknown' || !gates || gates === 'unknown') return 'unknown';
  return 'rejected';
}

type AttemptUsage = { complete: boolean; workflow: number; evaluator: number };
function usageForCalls(calls: AttemptCall[]): AttemptUsage {
  const attributable = calls.filter((call) => call.role !== 'evaluator');
  return {
    complete: attributable.length > 0 && attributable.every((call) => usable(call.usage)),
    workflow: attributable.reduce((sum, call) => sum + (workflowTokensForUsage(call.usage) ?? 0), 0),
    evaluator: calls.filter((call) => call.role === 'evaluator').reduce((sum, call) => sum + (workflowTokensForUsage(call.usage) ?? 0), 0),
  };
}

export function aggregateTokenEvidence(attempts: AttemptRecord[]): TokenEvidence {
  let accepted_changes = 0;
  let actual_usage_attempts = 0;
  let workflow_actual_tokens = 0;
  let evaluator_actual_tokens = 0;
  let actual_usage_coverage_complete = true;
  for (const attempt of attempts) {
    if (deriveOutcomeAcceptance(attempt.verdict, attempt.gates) === 'accepted') accepted_changes += 1;
    const usage = usageForCalls(attempt.calls);
    usage.complete &&= (attempt.measurement_errors?.length ?? 0) === 0;
    actual_usage_coverage_complete &&= usage.complete;
    actual_usage_attempts += Number(usage.complete);
    workflow_actual_tokens += usage.workflow;
    evaluator_actual_tokens += usage.evaluator;
  }
  const hard_gate_eligible = actual_usage_coverage_complete && accepted_changes > 0 && attempts.every((attempt) => deriveOutcomeAcceptance(attempt.verdict, attempt.gates) !== 'unknown');
  return {
    attempts: attempts.length,
    accepted_changes,
    actual_usage_attempts,
    actual_usage_coverage_complete,
    workflow_actual_tokens,
    evaluator_actual_tokens,
    tokens_per_accepted_change: hard_gate_eligible ? workflow_actual_tokens / accepted_changes : undefined,
    hard_gate_eligible,
  };
}

type Reconciliation = { valid: boolean; errors: string[]; attempts: AttemptRecord[] };
const same = (left: unknown, right: unknown): boolean => isDeepStrictEqual(left, right);

function registryErrors(registry: AttemptRegistration[]): { ids: Set<string>; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of registry) {
    if (ids.has(entry.attempt_id)) errors.push(`duplicate registry attempt ID: ${entry.attempt_id}`);
    ids.add(entry.attempt_id);
  }
  const sequences = registry.map((entry) => entry.sequence).filter((value): value is number => value !== undefined).sort((a, b) => a - b);
  const sequenceIsComplete = sequences.length === 0 || (sequences.length === registry.length && sequences.every((value, index) => value === index + 1));
  if (!sequenceIsComplete) errors.push('registry sequence gap');
  return { ids, errors };
}

function groupRecords({ records, ids, errors }: { records: AttemptRecord[]; ids: Set<string>; errors: string[] }): Map<string, AttemptRecord[]> {
  const grouped = new Map<string, AttemptRecord[]>();
  for (const record of records) {
    if (!ids.has(record.attempt_id)) errors.push(`unregistered attempt: ${record.attempt_id}`);
    grouped.set(record.attempt_id, [...(grouped.get(record.attempt_id) ?? []), record]);
  }
  return grouped;
}

const populated = (value: unknown): boolean => value !== undefined && value !== null;
const compatible = (left: unknown, right: unknown): boolean => !populated(left) || !populated(right) || same(left, right);

function groupConflicts(attempt_id: string, group: AttemptRecord[]): string[] {
  const errors: string[] = [];
  const fields: Array<{ name: string; value: (record: AttemptRecord) => unknown; present: (value: unknown) => boolean }> = [
    { name: 'scenario', value: (record) => record.scenario, present: populated },
    { name: 'benchmark', value: (record) => record.benchmark, present: populated },
    { name: 'cohort', value: (record) => record.cohort, present: populated },
    { name: 'registration', value: (record) => record.registration, present: populated },
    { name: 'verdict', value: (record) => record.verdict, present: (value) => value !== 'unknown' },
    { name: 'gates', value: (record) => record.gates, present: (value) => value !== 'unknown' },
    { name: 'final status', value: (record) => record.status, present: (value) => value !== undefined && value !== 'started' },
  ];
  for (const field of fields) {
    const values = group.map(field.value).filter(field.present);
    if (values.slice(1).some((value) => !same(values[0], value))) errors.push(`conflicting ${field.name} for attempt: ${attempt_id}`);
  }
  for (const record of group) if (record.registration.attempt_id !== attempt_id) errors.push(`registration ID mismatch for attempt: ${attempt_id}`);
  return errors;
}

function dedupeCalls(calls: AttemptCall[], callIds: Set<string>): { calls: AttemptCall[]; errors: string[] } {
  const errors: string[] = [];
  const unique = new Map<string, AttemptCall>();
  for (const call of calls) {
    const previous = unique.get(call.call_id);
    if (previous && !same(previous, call)) errors.push(`conflicting call ID: ${call.call_id}`);
    if (!previous) unique.set(call.call_id, call);
  }
  for (const call of unique.values()) {
    if (callIds.has(call.call_id)) errors.push(`duplicate call ID: ${call.call_id}`);
    callIds.add(call.call_id);
  }
  return { calls: [...unique.values()], errors };
}

function mergeGroup({ attempt_id, group, callIds, errors }: { attempt_id: string; group: AttemptRecord[]; callIds: Set<string>; errors: string[] }): AttemptRecord {
  const first = group[0];
  errors.push(...groupConflicts(attempt_id, group));
  const callResult = dedupeCalls(group.flatMap((record) => record.calls), callIds);
  errors.push(...callResult.errors);
  for (const record of group) errors.push(...(record.measurement_errors ?? []).map((error) => `attempt ${attempt_id}: ${error}`));
  const completed = group.find((record) => record.verdict !== 'unknown' && record.gates !== 'unknown')
    ?? group.find((record) => record.verdict !== 'unknown' || record.gates !== 'unknown' || record.calls.length > 0)
    ?? first;
  const enriched = <Key extends 'benchmark' | 'cohort' | 'status'>(key: Key) => group.find((record) => record[key] !== undefined)?.[key];
  const completedStatus = group.find((record) => record.status && record.status !== 'started')?.status;
  return {
    ...first,
    ...completed,
    benchmark: enriched('benchmark'),
    cohort: enriched('cohort'),
    status: completedStatus ?? enriched('status'),
    calls: callResult.calls,
    measurement_errors: group.flatMap((record) => record.measurement_errors ?? []),
  };
}

/** Validates the complete started-attempt registry before a hard comparison. */
export function reconcileAttemptRecords(registry: AttemptRegistration[], records: AttemptRecord[]): Reconciliation {
  const { ids, errors } = registryErrors(registry);
  const grouped = groupRecords({ records, ids, errors });
  const registryById = new Map(registry.map((entry) => [entry.attempt_id, entry]));
  for (const record of records) {
    const registered = registryById.get(record.attempt_id);
    if (record.registration.attempt_id !== record.attempt_id) errors.push(`registration ID mismatch for attempt: ${record.attempt_id}`);
    if (registered && !compatible(registered, record.registration)) errors.push(`conflicting registry registration for attempt: ${record.attempt_id}`);
  }
  for (const entry of registry) if (!grouped.has(entry.attempt_id)) errors.push(`registered attempt absent from dataset: ${entry.attempt_id}`);
  const callIds = new Set<string>();
  const merged = [...grouped.entries()].map(([attempt_id, group]) => mergeGroup({ attempt_id, group, callIds, errors }));
  return { valid: errors.length === 0, errors, attempts: merged };
}
