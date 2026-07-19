import { executionPlaceholderErrors } from './benchmark-runner.js';
import type { BenchmarkDataset } from './benchmark-types.js';

const ATTEMPT_STATUSES = new Set(['started', 'completed', 'failed', 'abandoned']);
const CALL_ROLES = new Set(['primary', 'subagent', 'required-reviewer', 'evaluator']);
const GATE_STATUSES = new Set(['pass', 'fail', 'unknown']);
const VERDICTS = new Set(['pass', 'fail', 'unknown']);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function failedRules(rules: Array<{ valid: boolean; message: string }>): string[] {
  return rules.filter((rule) => !rule.valid).map((rule) => rule.message);
}

function registrationShapeErrors(value: unknown): string[] {
  if (!isObject(value)) return ['registration must be an object'];
  return failedRules([
    { valid: typeof value.attempt_id === 'string' && Boolean(value.attempt_id), message: 'registration attempt_id must be a non-empty string' },
    { valid: typeof value.registered_at === 'string' && Boolean(value.registered_at), message: 'registration registered_at must be a non-empty string' },
    { valid: value.status === 'started', message: 'registration status must be started' },
    { valid: value.sequence === undefined || Number.isInteger(value.sequence), message: 'registration sequence must be an integer' },
    { valid: value.schedule_sequence === undefined || Number.isInteger(value.schedule_sequence), message: 'registration schedule_sequence must be an integer' },
    { valid: value.retry_of === undefined || (typeof value.retry_of === 'string' && Boolean(value.retry_of)), message: 'registration retry_of must be a non-empty string' },
  ]);
}

function usageShapeErrors(value: unknown): string[] {
  if (value === undefined) return [];
  if (!isObject(value)) return ['call usage must be an object'];
  return typeof value.provenance === 'string' ? [] : ['call usage provenance must be a string'];
}

function callShapeErrors(value: unknown): string[] {
  if (!isObject(value)) return ['call ledger entry must be an object'];
  return [
    ...failedRules([
      { valid: typeof value.call_id === 'string' && Boolean(value.call_id), message: 'call_id must be a non-empty string' },
      { valid: typeof value.role === 'string' && CALL_ROLES.has(value.role), message: 'call role is invalid' },
    ]),
    ...usageShapeErrors(value.usage),
  ];
}

function recordShapeErrors(value: unknown): string[] {
  if (!isObject(value)) return ['attempt record must be an object'];
  const errors = failedRules([
    { valid: typeof value.attempt_id === 'string' && Boolean(value.attempt_id), message: 'attempt_id must be a non-empty string' },
    { valid: value.status === undefined || (typeof value.status === 'string' && ATTEMPT_STATUSES.has(value.status)), message: 'attempt status is invalid' },
    { valid: typeof value.scenario === 'string', message: 'attempt scenario must be a string' },
    { valid: typeof value.verdict === 'string' && VERDICTS.has(value.verdict), message: 'attempt verdict is invalid' },
    { valid: typeof value.gates === 'string' && GATE_STATUSES.has(value.gates), message: 'attempt gate status is invalid' },
    { valid: Array.isArray(value.calls), message: 'attempt calls must be an array' },
    { valid: value.measurement_errors === undefined || (Array.isArray(value.measurement_errors) && value.measurement_errors.every((error) => typeof error === 'string')), message: 'measurement_errors must be a string array' },
  ]);
  errors.push(...registrationShapeErrors(value.registration));
  if (Array.isArray(value.calls)) errors.push(...value.calls.flatMap(callShapeErrors));
  return errors;
}

export function recordCollectionErrors(records: unknown[], label: string): string[] {
  return records.flatMap((record, index) => recordShapeErrors(record).map((error) => `${label}: record ${index + 1}: ${error}`));
}

export function attestationErrors(dataset: BenchmarkDataset, label: string): string[] {
  const corpus = { version: 1 as const, minimum_attempts_per_variant: dataset.minimum_attempts_per_variant, cases: dataset.cases };
  const errors = executionPlaceholderErrors(corpus).map((error) => `${label}: ${error}`);
  for (const benchmark of dataset.cases) {
    const baseline = benchmark.variants.baseline.instruction_surface.expected_sha256;
    const candidate = benchmark.variants.candidate.instruction_surface.expected_sha256;
    if (baseline === candidate) errors.push(`${label}: ${benchmark.case_id} baseline and candidate installed instruction surfaces are identical`);
  }
  return errors;
}
