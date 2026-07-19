import { isRecord } from './benchmark-validation-guards.js';

const nonempty = (value: unknown): boolean => typeof value === 'string' && Boolean(value.trim());
const positiveInteger = (value: unknown): boolean => Number.isInteger(value) && Number(value) > 0;

function identityErrors(value: Record<string, unknown>, label: string): string[] {
  const errors: string[] = [];
  if (!nonempty(value.case_id)) errors.push(`${label} case_id must be a non-empty string`);
  if (!nonempty(value.category)) errors.push(`${label} category must be a non-empty string`);
  if (value.variant !== 'baseline' && value.variant !== 'candidate') errors.push(`${label} variant must be baseline or candidate`);
  if (!positiveInteger(value.repetition)) errors.push(`${label} repetition must be a positive integer`);
  return errors;
}

export function scheduleEntryErrors(value: unknown, index: number): string[] {
  if (!isRecord(value)) return [`schedule entry ${index + 1} must be an object`];
  const label = `schedule entry ${index + 1}`;
  const errors = identityErrors(value, label);
  if (!positiveInteger(value.sequence)) errors.push(`${label} sequence must be a positive integer`);
  return errors;
}

export function registrationEntryErrors({ value, index, orderLength }: { value: unknown; index: number; orderLength: number }): string[] {
  if (!isRecord(value)) return [`registry entry ${index + 1} must be an object`];
  const label = `registry entry ${index + 1}`;
  const errors: string[] = [];
  if (!nonempty(value.attempt_id)) errors.push(`${label} attempt_id must be a non-empty string`);
  if (!nonempty(value.registered_at)) errors.push(`${label} registered_at must be a non-empty string`);
  if (value.status !== 'started') errors.push(`${label} status must be started`);
  if (!positiveInteger(value.sequence)) errors.push(`${label} sequence must be a positive integer`);
  if (!positiveInteger(value.schedule_sequence) || Number(value.schedule_sequence) > orderLength) errors.push(`${label} schedule_sequence is outside the run plan`);
  if (value.retry_of !== undefined && !nonempty(value.retry_of)) errors.push(`${label} retry_of must be a non-empty string when present`);
  return errors;
}

export function attemptEntryErrors({ value, index, orderLength }: { value: unknown; index: number; orderLength: number }): string[] {
  if (!isRecord(value)) return [`attempt entry ${index + 1} must be an object`];
  const label = `attempt entry ${index + 1}`;
  const errors = identityErrors(value, label);
  if (!nonempty(value.attempt_id)) errors.push(`${label} attempt_id must be a non-empty string`);
  if (!positiveInteger(value.schedule_sequence) || Number(value.schedule_sequence) > orderLength) errors.push(`${label} schedule_sequence is outside the run plan`);
  if (!isRecord(value.cohort)) errors.push(`${label} cohort must be an object`);
  if (!isRecord(value.evidence)) errors.push(`${label} evidence must be an object`);
  return errors;
}
