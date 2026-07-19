import { randomUUID } from 'node:crypto';
import { appendFileSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createInterleavedSchedule } from './create-interleaved-schedule.js';
import { validateBenchmarkCorpus, validateBenchmarkRunPlan } from './benchmark-validation.js';
import type { BenchmarkCorpus, BenchmarkRegistration, BenchmarkRunPlan, BenchmarkScheduleEntry, BenchmarkVariant } from './benchmark-types.js';

const ledgerPath = (planPath: string): string => `${planPath}.registrations.jsonl`;

function immutablePlan({ corpus, corpus_sha256, seed }: { corpus: BenchmarkCorpus; corpus_sha256: string; seed: number }): BenchmarkRunPlan {
  const errors = validateBenchmarkCorpus(corpus);
  if (errors.length) throw new Error(`invalid benchmark corpus: ${errors.join('; ')}`);
  return { version: 1, corpus_sha256, minimum_attempts_per_variant: corpus.minimum_attempts_per_variant, cohort: corpus.cases[0]!.cohort, cases: corpus.cases, seed, order: createInterleavedSchedule(corpus, seed), registry: [] };
}

function ensureImmutablePlan(path: string, expected: BenchmarkRunPlan): BenchmarkRunPlan {
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, `${JSON.stringify(expected, null, 2)}\n`, { flag: 'wx' });
    return expected;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const plan = JSON.parse(readFileSync(path, 'utf8')) as BenchmarkRunPlan;
  if (!isDeepStrictEqual(plan, expected)) throw new Error('persisted immutable benchmark plan conflicts with the declared corpus/cohort/seed schedule');
  return plan;
}

function readLedger(path: string): BenchmarkRegistration[] {
  let text: string;
  try {
    text = readFileSync(ledgerPath(path), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  if (text && !text.endsWith('\n')) throw new Error('benchmark registration ledger is truncated');
  return text.split('\n').filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line) as BenchmarkRegistration;
    } catch {
      throw new Error(`benchmark registration ledger contains invalid JSON at sequence ${index + 1}`);
    }
  });
}

/** Reads the immutable plan plus its independent append-only registration ledger. */
export function readBenchmarkRunPlan(path: string): BenchmarkRunPlan {
  const plan = JSON.parse(readFileSync(path, 'utf8')) as BenchmarkRunPlan;
  const combined = { ...plan, registry: readLedger(path) };
  const errors = validateBenchmarkRunPlan(combined);
  if (errors.length) throw new Error(`invalid persisted benchmark registry: ${errors.join('; ')}`);
  return combined;
}

function appendDurably(path: string, registration: BenchmarkRegistration): void {
  const descriptor = openSync(ledgerPath(path), 'a');
  try {
    appendFileSync(descriptor, `${JSON.stringify(registration)}\n`);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

/** Creates the immutable plan once, then durably appends one started-attempt ledger entry under an exclusive CLI lock. */
export function registerBenchmarkAttempt({ registry_path, corpus, corpus_sha256, seed, case_id, variant, repetition, retry_of }: { registry_path: string; corpus: BenchmarkCorpus; corpus_sha256: string; seed: number; case_id: string; variant: BenchmarkVariant; repetition: number; retry_of?: string }): { plan: BenchmarkRunPlan; registration: BenchmarkRegistration; entry: BenchmarkScheduleEntry } {
  mkdirSync(dirname(registry_path), { recursive: true });
  const lockPath = `${registry_path}.lock`;
  let lock: number;
  try {
    lock = openSync(lockPath, 'wx');
  } catch {
    throw new Error('benchmark registry is locked by another writer; retry after it completes');
  }
  try {
    const expected = immutablePlan({ corpus, corpus_sha256, seed });
    ensureImmutablePlan(registry_path, expected);
    const plan = readBenchmarkRunPlan(registry_path);
    const entry = plan.order.find((candidate) => candidate.case_id === case_id && candidate.variant === variant && candidate.repetition === repetition);
    if (!entry) throw new Error('benchmark attempt is absent from the persisted seeded schedule');
    const existing = plan.registry.find((registration) => registration.schedule_sequence === entry.sequence && !registration.retry_of);
    if (!retry_of && existing) throw new Error(`scheduled benchmark attempt already started: ${entry.sequence}`);
    if (retry_of && !plan.registry.some((registration) => registration.attempt_id === retry_of && registration.schedule_sequence === entry.sequence)) throw new Error('benchmark retry must reference a started attempt for the same scheduled entry');
    const registration: BenchmarkRegistration = { attempt_id: randomUUID(), registered_at: new Date().toISOString(), status: 'started', sequence: plan.registry.length + 1, schedule_sequence: entry.sequence, ...(retry_of ? { retry_of } : {}) };
    const updated = { ...plan, registry: [...plan.registry, registration] };
    const errors = validateBenchmarkRunPlan(updated);
    if (errors.length) throw new Error(`cannot append benchmark registration: ${errors.join('; ')}`);
    appendDurably(registry_path, registration);
    return { plan: updated, registration, entry };
  } finally {
    closeSync(lock!);
    unlinkSync(lockPath);
  }
}
