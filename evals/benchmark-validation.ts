import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { buildInterleavedSchedule } from './build-interleaved-schedule.js';
import { cohortErrors, validateBenchmarkCase, validateBenchmarkCorpus } from './benchmark-case-validation.js';
import { isRecord, recordArrayError } from './benchmark-validation-guards.js';
import { attemptEntryErrors, registrationEntryErrors, scheduleEntryErrors } from './benchmark-record-validation.js';
import type { BenchmarkCase, BenchmarkDataset, BenchmarkRunPlan, BenchmarkScheduleEntry } from './benchmark-types.js';

const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
export { validateBenchmarkCase, validateBenchmarkCorpus, validateInstructionSurfaceRef } from './benchmark-case-validation.js';

function identity(value: Pick<BenchmarkScheduleEntry, 'case_id' | 'category' | 'variant' | 'repetition'>): string {
  return `${value.case_id}/${value.category}/${value.variant}/${value.repetition}`;
}

function scheduledIdentities(order: BenchmarkScheduleEntry[], errors: string[]): Set<string> {
  const scheduled = new Set<string>();
  for (const [index, entry] of order.entries()) {
    if (entry.sequence !== index + 1) errors.push(`scheduled sequence mismatch: expected ${index + 1}, received ${entry.sequence}`);
    const key = identity(entry);
    if (scheduled.has(key)) errors.push(`duplicate scheduled identity: ${key}`);
    scheduled.add(key);
  }
  return scheduled;
}

function registryIds(dataset: Pick<BenchmarkDataset, 'registry' | 'order'>, errors: string[]): Map<string, BenchmarkDataset['registry'][number]> {
  const registry = new Map<string, BenchmarkDataset['registry'][number]>();
  let primarySequence = 0;
  for (const [index, entry] of dataset.registry.entries()) {
    if (registry.has(entry.attempt_id)) errors.push(`duplicate registry attempt: ${entry.attempt_id}`);
    if (entry.sequence !== index + 1) errors.push('registry sequence gap');
    if (!Number.isInteger(entry.schedule_sequence) || entry.schedule_sequence < 1 || entry.schedule_sequence > dataset.order.length) errors.push(`registry schedule sequence is invalid: ${entry.attempt_id}`);
    if (!entry.retry_of) {
      primarySequence += 1;
      if (primarySequence !== entry.schedule_sequence) errors.push(`primary registry order does not follow scheduled order: ${entry.attempt_id}`);
    }
    registry.set(entry.attempt_id, entry);
  }
  return registry;
}

function validateAttemptSchedule({ attempt, dataset, scheduled, registration, errors }: { attempt: BenchmarkDataset['attempts'][number]; dataset: BenchmarkDataset; scheduled: Set<string>; registration: BenchmarkDataset['registry'][number] | undefined; errors: string[] }): void {
  const key = identity(attempt);
  if (!scheduled.has(key)) errors.push(`attempt is not in recorded interleaving order: ${key}`);
  const scheduledEntry = dataset.order[attempt.schedule_sequence - 1];
  if (!scheduledEntry || scheduledEntry.sequence !== attempt.schedule_sequence || identity(scheduledEntry) !== key) errors.push(`attempt schedule sequence does not match recorded order: ${attempt.attempt_id}`);
  if (registration && registration.schedule_sequence !== attempt.schedule_sequence) errors.push(`registry schedule sequence does not match attempt: ${attempt.attempt_id}`);
}

function validateEvidenceHashes(attempt: BenchmarkDataset['attempts'][number], errors: string[]): void {
  const evidence = attempt.evidence;
  for (const [label, value] of Object.entries({ corpus: evidence.corpus_sha256, prompt: evidence.prompt_sha256, fixture: evidence.fixture_sha256, checklist: evidence.acceptance_checklist_sha256, gates: evidence.project_gates.sha256, surface: evidence.instruction_surface.sha256 })) {
    if (!SHA256.test(value)) errors.push(`attempt has invalid ${label} hash: ${attempt.attempt_id}`);
  }
}

function validateProtectedInputEvidence({ attempt, benchmark, errors }: { attempt: BenchmarkDataset['attempts'][number]; benchmark: BenchmarkCase; errors: string[] }): void {
  const protectedInputs = attempt.evidence.project_gates.protected_inputs;
  const expectedGates = benchmark.variants[attempt.variant].outcome.project_gates;
  if (!Array.isArray(protectedInputs) || protectedInputs.length !== expectedGates.length) {
    errors.push(`attempt protected gate evidence is missing or incomplete: ${attempt.attempt_id}`);
    return;
  }
  for (const [index, protectedInput] of protectedInputs.entries()) {
    if (!isRecord(protectedInput) || !isDeepStrictEqual(protectedInput.paths, expectedGates[index].protected_paths) || !SHA256.test(String(protectedInput.sha256 ?? ''))) errors.push(`attempt protected gate evidence is invalid: ${attempt.attempt_id}/${index + 1}`);
  }
}

function validateGateAndSurfaceEvidence({ attempt, benchmark, errors }: { attempt: BenchmarkDataset['attempts'][number]; benchmark: BenchmarkCase; errors: string[] }): void {
  const evidence = attempt.evidence;
  if (attempt.variant !== 'baseline' && attempt.variant !== 'candidate') {
    errors.push(`attempt has an invalid benchmark variant: ${attempt.attempt_id}`);
    return;
  }
  const expected = benchmark.variants[attempt.variant];
  if (!isDeepStrictEqual(evidence.project_gates.values, expected.outcome.project_gates)) errors.push(`attempt project gates differ from declared outcome: ${attempt.attempt_id}`);
  if (!Array.isArray(evidence.project_gates.values)) errors.push(`attempt project gates are malformed: ${attempt.attempt_id}`);
  else {
    const gatesHash = createHash('sha256').update(JSON.stringify(evidence.project_gates.values)).digest('hex');
    if (evidence.project_gates.sha256 !== gatesHash) errors.push(`attempt project gate hash is invalid: ${attempt.attempt_id}`);
  }
  validateProtectedInputEvidence({ attempt, benchmark, errors });
  if (evidence.instruction_surface.ref !== expected.instruction_surface.ref || evidence.instruction_surface.sha256 !== expected.instruction_surface.expected_sha256) errors.push(`attempt instruction surface differs from declared variant: ${attempt.attempt_id}`);
}

function validateAttemptEvidence({ attempt, benchmark, dataset, errors }: { attempt: BenchmarkDataset['attempts'][number]; benchmark: BenchmarkCase | undefined; dataset: BenchmarkDataset; errors: string[] }): void {
  const evidence = attempt.evidence;
  if (!isRecord(evidence) || !isRecord(evidence.project_gates) || !isRecord(evidence.instruction_surface)) {
    errors.push(`attempt is missing immutable benchmark evidence: ${attempt.attempt_id}`);
    return;
  }
  if (!benchmark) {
    errors.push(`attempt references an undeclared benchmark case: ${attempt.attempt_id}`);
    return;
  }
  validateEvidenceHashes(attempt, errors);
  if (evidence.corpus_sha256 !== dataset.corpus_sha256) errors.push(`attempt corpus hash differs from dataset: ${attempt.attempt_id}`);
  if (evidence.harness_commit !== dataset.cohort.harness_version || !COMMIT.test(evidence.harness_commit)) errors.push(`attempt harness commit differs from exact cohort harness: ${attempt.attempt_id}`);
  validateGateAndSurfaceEvidence({ attempt, benchmark, errors });
}

function validatePairedEvidence(attempts: BenchmarkDataset['attempts'], errors: string[]): void {
  const outcomeByCase = new Map<string, unknown>();
  for (const attempt of attempts) {
    if (!isRecord(attempt.evidence)) continue;
    const outcome = { prompt_sha256: attempt.evidence.prompt_sha256, fixture_sha256: attempt.evidence.fixture_sha256, acceptance_checklist_sha256: attempt.evidence.acceptance_checklist_sha256, project_gates: attempt.evidence.project_gates };
    const previous = outcomeByCase.get(attempt.case_id);
    if (previous && !isDeepStrictEqual(previous, outcome)) errors.push(`paired outcome evidence differs across attempts: ${attempt.case_id}`);
    else if (!previous) outcomeByCase.set(attempt.case_id, outcome);
  }
}

function validatePersistedCorpusAndOrder({ value, label, errors }: { value: Pick<BenchmarkRunPlan, 'cases' | 'cohort' | 'minimum_attempts_per_variant' | 'order' | 'seed'>; label: string; errors: string[] }): void {
  const corpus = { version: 1 as const, minimum_attempts_per_variant: value.minimum_attempts_per_variant, cases: value.cases };
  const corpusErrors = validateBenchmarkCorpus(corpus);
  if (corpusErrors.length) {
    errors.push(...corpusErrors.map((error) => `${label}: ${error}`));
    return;
  }
  if (!isDeepStrictEqual(value.cohort, value.cases[0]?.cohort)) errors.push(`${label} cohort differs from its persisted corpus cohort`);
  if (Number.isInteger(value.seed) && !isDeepStrictEqual(value.order, buildInterleavedSchedule(corpus, value.seed))) errors.push(`${label} order differs from the exact seeded interleaved schedule`);
}

function validateAttemptRetry({ attempt, registration, registry, primarySequences, errors }: { attempt: BenchmarkDataset['attempts'][number]; registration: BenchmarkDataset['registry'][number] | undefined; registry: Map<string, BenchmarkDataset['registry'][number]>; primarySequences: Set<number>; errors: string[] }): void {
  if (registration?.retry_of) {
    const original = registry.get(registration.retry_of);
    if (!original || original.sequence >= registration.sequence || original.schedule_sequence !== registration.schedule_sequence) errors.push(`retry does not reference an earlier attempt for the same scheduled entry: ${attempt.attempt_id}`);
  } else if (primarySequences.has(attempt.schedule_sequence)) {
    errors.push(`duplicate primary attempt for scheduled sequence: ${attempt.schedule_sequence}`);
  } else primarySequences.add(attempt.schedule_sequence);
}

function attemptIds({ dataset, scheduled, registry, errors }: { dataset: BenchmarkDataset; scheduled: Set<string>; registry: Map<string, BenchmarkDataset['registry'][number]>; errors: string[] }): { attempts: Set<string>; primarySequences: Set<number> } {
  const attempts = new Set<string>();
  const primarySequences = new Set<number>();
  for (const attempt of dataset.attempts) {
    if (attempts.has(attempt.attempt_id)) errors.push(`duplicate attempt ID: ${attempt.attempt_id}`);
    const registration = registry.get(attempt.attempt_id);
    if (!registration) errors.push(`attempt is absent from started-attempt registry: ${attempt.attempt_id}`);
    attempts.add(attempt.attempt_id);
    validateAttemptSchedule({ attempt, dataset, scheduled, registration, errors });
    validateAttemptRetry({ attempt, registration, registry, primarySequences, errors });
    if (!isDeepStrictEqual(attempt.cohort, dataset.cohort)) errors.push(`attempt cohort differs from dataset cohort: ${attempt.attempt_id}`);
    validateAttemptEvidence({ attempt, benchmark: dataset.cases.find((entry) => entry.case_id === attempt.case_id && entry.category === attempt.category), dataset, errors });
  }
  return { attempts, primarySequences };
}

function datasetScalarErrors(dataset: BenchmarkDataset): string[] {
  const errors = cohortErrors(dataset.cohort, 'dataset cohort');
  if (!SHA256.test(dataset.corpus_sha256)) errors.push('dataset must record the corpus SHA-256');
  if (!Number.isInteger(dataset.seed)) errors.push('dataset interleaving seed must be an integer');
  if (!Number.isInteger(dataset.minimum_attempts_per_variant)) errors.push('dataset minimum attempts per variant must be an integer');
  return errors;
}

function completenessErrors({ registry, attempts, order, primarySequences }: { registry: Map<string, BenchmarkDataset['registry'][number]>; attempts: Set<string>; order: BenchmarkDataset['order']; primarySequences: Set<number> }): string[] {
  return [
    ...[...registry.keys()].filter((id) => !attempts.has(id)).map((id) => `registered attempt is absent from dataset: ${id}`),
    ...order.filter((entry) => !primarySequences.has(entry.sequence)).map((entry) => `scheduled sequence is absent from dataset: ${entry.sequence}`),
  ];
}

export function validateBenchmarkDataset(dataset: unknown): string[] {
  if (!isRecord(dataset)) return ['benchmark dataset must be an object'];
  const current = dataset as BenchmarkDataset;
  const errors = datasetScalarErrors(current);
  const collectionErrors = [['cases', current.cases], ['order', current.order], ['registry', current.registry], ['attempts', current.attempts]].map(([label, value]) => recordArrayError({ value, label: `dataset ${label}` })).filter((error): error is string => Boolean(error));
  if (collectionErrors.length) return [...errors, ...collectionErrors];
  const caseErrors = current.cases.flatMap((benchmark) => validateBenchmarkCase(benchmark).map((error) => `${benchmark.case_id}: ${error}`));
  if (caseErrors.length) return [...errors, ...caseErrors];
  const entryErrors = [
    ...current.order.flatMap(scheduleEntryErrors),
    ...current.registry.flatMap((entry, index) => registrationEntryErrors({ value: entry, index, orderLength: current.order.length })),
    ...current.attempts.flatMap((entry, index) => attemptEntryErrors({ value: entry, index, orderLength: current.order.length })),
  ];
  if (entryErrors.length) return [...errors, ...entryErrors];
  validatePersistedCorpusAndOrder({ value: current, label: 'dataset', errors });
  const scheduled = scheduledIdentities(current.order, errors);
  const registry = registryIds(current, errors);
  const { attempts, primarySequences } = attemptIds({ dataset: current, scheduled, registry, errors });
  errors.push(...completenessErrors({ registry, attempts, order: current.order, primarySequences }));
  validatePairedEvidence(current.attempts, errors);
  return errors;
}

function validatePlanRegistry(plan: BenchmarkRunPlan, errors: string[]): void {
  const scheduled = scheduledIdentities(plan.order, errors);
  const registry = registryIds(plan, errors);
  for (const registration of registry.values()) {
    const entry = plan.order[registration.schedule_sequence - 1];
    if (!entry || !scheduled.has(identity(entry))) errors.push(`registry schedule sequence is absent from run plan: ${registration.attempt_id}`);
    if (registration.retry_of) {
      const original = registry.get(registration.retry_of);
      if (!original || original.sequence >= registration.sequence || original.schedule_sequence !== registration.schedule_sequence) errors.push(`registry retry is invalid: ${registration.attempt_id}`);
    }
  }
}

/** Validates the persisted execution plan before any result manifest can be trusted. */
export function validateBenchmarkRunPlan(plan: unknown): string[] {
  if (!isRecord(plan)) return ['benchmark run-plan must be an object'];
  const current = plan as BenchmarkRunPlan;
  const errors = cohortErrors(current.cohort, 'benchmark run-plan cohort');
  if (current.version !== 1) errors.push('benchmark run-plan version must be 1');
  if (!SHA256.test(current.corpus_sha256)) errors.push('benchmark run-plan must record the corpus SHA-256');
  if (!Number.isInteger(current.seed)) errors.push('benchmark run-plan seed must be an integer');
  if (!Number.isInteger(current.minimum_attempts_per_variant)) errors.push('benchmark run-plan minimum attempts per variant must be an integer');
  const collectionErrors = [recordArrayError({ value: current.cases, label: 'benchmark run-plan cases' }), recordArrayError({ value: current.order, label: 'benchmark run-plan order' }), recordArrayError({ value: current.registry, label: 'benchmark run-plan registry', nonempty: false })].filter((error): error is string => Boolean(error));
  if (collectionErrors.length) return [...errors, ...collectionErrors];
  const caseErrors = current.cases.flatMap((benchmark) => validateBenchmarkCase(benchmark).map((error) => `${benchmark.case_id}: ${error}`));
  if (caseErrors.length) return [...errors, ...caseErrors];
  const entryErrors = [
    ...current.order.flatMap(scheduleEntryErrors),
    ...current.registry.flatMap((entry, index) => registrationEntryErrors({ value: entry, index, orderLength: current.order.length })),
  ];
  if (entryErrors.length) return [...errors, ...entryErrors];
  validatePersistedCorpusAndOrder({ value: current, label: 'benchmark run-plan', errors });
  validatePlanRegistry(current, errors);
  return errors;
}

/** Lets reporting require the external started-attempt registry instead of rebuilding it from surviving manifests. */
export function validateBenchmarkDatasetAgainstRunPlan(value: unknown): string[] {
  if (!isRecord(value)) return ['benchmark dataset/run-plan comparison must be an object'];
  const dataset = value.dataset;
  const plan = value.plan;
  const errors = [...validateBenchmarkRunPlan(plan), ...validateBenchmarkDataset(dataset)];
  if (!isRecord(dataset) || !isRecord(plan)) return errors;
  const comparisons = [
    [dataset.corpus_sha256 === plan.corpus_sha256, 'dataset corpus hash differs from persisted benchmark run plan'],
    [dataset.minimum_attempts_per_variant === plan.minimum_attempts_per_variant, 'dataset minimum attempts policy differs from persisted benchmark run plan'],
    [isDeepStrictEqual(dataset.cohort, plan.cohort), 'dataset cohort differs from persisted benchmark run plan'],
    [dataset.seed === plan.seed, 'dataset seed differs from persisted benchmark run plan'],
    [isDeepStrictEqual(dataset.order, plan.order), 'dataset order differs from persisted benchmark run plan'],
    [isDeepStrictEqual(dataset.registry, plan.registry), 'dataset registry differs from persisted benchmark run plan'],
    [isDeepStrictEqual(dataset.cases, plan.cases), 'dataset case definitions differ from persisted benchmark run plan'],
  ] as const;
  errors.push(...comparisons.filter(([matches]) => !matches).map(([, message]) => message));
  return errors;
}
