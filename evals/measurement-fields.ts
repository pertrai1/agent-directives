import type { AttemptCall, AttemptRegistration, BenchmarkIdentity, EvalRun, GateStatus, ProviderUsage } from './report-types.js';

const verdict = (value: unknown): string => {
  const raw = String(value ?? 'unknown').toLowerCase();
  if (['passed', 'pass', 'ok', 'success'].includes(raw)) return 'pass';
  if (['failed', 'fail', 'failure'].includes(raw)) return 'fail';
  return 'unknown';
};
const gateStatus = (value: unknown): GateStatus => {
  const normalized = verdict(value);
  return normalized === 'pass' || normalized === 'fail' ? normalized : 'unknown';
};
const tokenCount = (value: unknown): number | undefined => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};
function providerUsage(value: any): ProviderUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const usage: ProviderUsage = {
    input_tokens: tokenCount(value.input_tokens), output_tokens: tokenCount(value.output_tokens),
    cache_read_tokens: tokenCount(value.cache_read_tokens), cache_write_tokens: tokenCount(value.cache_write_tokens),
    provider_total_tokens: tokenCount(value.provider_total_tokens ?? value.total_tokens), provenance: String(value.provenance ?? ''),
  };
  return usage.provenance ? usage : undefined;
}
function attemptCalls(value: any): { calls?: AttemptCall[]; errors: string[] } {
  if (!Array.isArray(value)) return { errors: [] };
  const calls: AttemptCall[] = value.map((call): AttemptCall => ({ call_id: String(call.call_id ?? ''), role: call.role, usage: providerUsage(call.usage) }));
  const valid = calls.filter((call) => Boolean(call.call_id) && ['primary', 'subagent', 'required-reviewer', 'evaluator'].includes(call.role));
  return { calls: valid, errors: valid.length === calls.length ? [] : ['malformed call ledger entry'] };
}
function registration(value: any, attempt_id: unknown): AttemptRegistration | undefined {
  const id = String(value?.attempt_id ?? attempt_id ?? '');
  if (!id || value?.status !== 'started' || !value?.registered_at) return undefined;
  return { attempt_id: id, registered_at: String(value.registered_at), status: 'started', ...(Number.isInteger(value.sequence) ? { sequence: value.sequence } : {}) };
}

function benchmarkIdentity(value: any): BenchmarkIdentity | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const identity: BenchmarkIdentity = {
    ...(typeof value.category === 'string' ? { category: value.category } : {}),
    ...(typeof value.variant === 'string' ? { variant: value.variant } : {}),
    ...(Number.isInteger(value.repetition) ? { repetition: value.repetition } : {}),
  };
  return Object.keys(identity).length ? identity : undefined;
}

function benchmarkProtocol(data: any): Record<string, unknown> | undefined {
  if (data.benchmark_protocol && typeof data.benchmark_protocol === 'object') return data.benchmark_protocol;
  if (data.benchmark && typeof data.benchmark === 'object' && ('case_id' in data.benchmark || 'instruction_surface' in data.benchmark)) return data.benchmark;
  return undefined;
}

function comparableCohort(data: any, protocol: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (data.cohort && typeof data.cohort === 'object') return data.cohort;
  if (protocol?.cohort && typeof protocol.cohort === 'object') return protocol.cohort as Record<string, unknown>;
  return undefined;
}

function attemptStatus(value: unknown): EvalRun['status'] {
  return ['started', 'completed', 'failed', 'abandoned'].includes(String(value)) ? value as EvalRun['status'] : undefined;
}

export function measurementFields(data: any): Partial<EvalRun> {
  const attempt_id = data.attempt_id ? String(data.attempt_id) : undefined;
  const status = data.attempt_status ?? data.status;
  const callResult = attemptCalls(data.calls ?? data.call_ledger);
  const protocol = benchmarkProtocol(data);
  return { attempt_id, registration: registration(data.registration, attempt_id), status: attemptStatus(status),
    gates: gateStatus(data.gates ?? data.quality_gate_status), calls: callResult.calls, measurement_errors: callResult.errors,
    benchmark: benchmarkIdentity(data.benchmark), benchmark_protocol: protocol,
    cohort: comparableCohort(data, protocol),
    estimated_instruction_tokens: tokenCount(data.estimated_instruction_tokens) };
}
