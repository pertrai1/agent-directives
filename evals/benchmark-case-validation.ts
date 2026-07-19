import { isDeepStrictEqual } from 'node:util';
import { validateBenchmarkGates } from './validate-benchmark-gates.js';
import { instructionSurfacePathErrors, isRecord, matches, recordArrayError, relativePathError } from './benchmark-validation-guards.js';
import { REQUIRED_COHORT_FIELDS } from './benchmark-types.js';
import type { BenchmarkCase, BenchmarkCorpus } from './benchmark-types.js';

const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const MINIMUM_ATTEMPTS = 3;
const HASH_FIELDS = new Set(['tool_configuration_hash', 'global_instruction_hash', 'inference_settings_hash']);
const pending = (value: unknown): boolean => typeof value === 'string' && value.startsWith('PENDING-');

export function cohortErrors(cohort: unknown, prefix: string): string[] {
  const errors = REQUIRED_COHORT_FIELDS.filter((field) => !isRecord(cohort) || typeof cohort[field] !== 'string' || !cohort[field].trim()).map((field) => `${prefix} is missing ${field}`);
  if (!isRecord(cohort)) return errors;
  for (const field of HASH_FIELDS) if (!pending(cohort[field]) && !matches(cohort[field], SHA256)) errors.push(`${prefix} ${field} must be a full SHA-256 hash`);
  if (!pending(cohort.harness_version) && !matches(cohort.harness_version, COMMIT)) errors.push(`${prefix} harness_version must be a full immutable commit hash`);
  return errors;
}

function refErrors(surface: unknown): string[] {
  if (!isRecord(surface)) return ['instruction surface must be an object'];
  const errors: string[] = [];
  if (!matches(surface.expected_sha256, SHA256)) errors.push('instruction surface must declare a full SHA-256 hash');
  if (surface.kind === 'git-commit' && !matches(surface.ref, COMMIT)) errors.push('git instruction surface refs must be full immutable commit hashes');
  if (surface.kind === 'package-artifact') {
    const error = relativePathError(surface.ref, 'package artifact ref');
    if (error) errors.push(error);
  }
  if (surface.kind !== 'git-commit' && surface.kind !== 'package-artifact') errors.push('instruction surface kind is unsupported');
  return errors;
}

export function validateInstructionSurfaceRef(surface: unknown): string[] {
  return [...instructionSurfacePathErrors(surface), ...refErrors(surface)];
}

function outcomeErrors(baseline: Record<string, unknown>, candidate: Record<string, unknown>): string[] {
  const errors = isDeepStrictEqual(baseline, candidate) ? [] : ['baseline and candidate outcome contracts must be identical; route/file diagnostics cannot be acceptance inputs'];
  for (const [label, path] of Object.entries({ prompt: baseline.prompt_file, fixture: baseline.fixture, acceptance_checklist: baseline.acceptance_checklist })) {
    const error = relativePathError(path, `baseline ${label}`);
    if (error) errors.push(error);
  }
  errors.push(...validateBenchmarkGates(baseline.project_gates));
  return errors;
}

function caseIdentityErrors(benchmark: BenchmarkCase): string[] {
  const errors: string[] = [];
  if (!matches(benchmark.case_id, /^[a-z0-9][a-z0-9-]*$/)) errors.push('benchmark case ID must be a stable kebab-case identity');
  if (typeof benchmark.category !== 'string' || !benchmark.category.trim()) errors.push('benchmark category must be a non-empty string');
  if (typeof benchmark.scenario !== 'string' || !benchmark.scenario.trim()) errors.push('benchmark scenario must be a non-empty string');
  return errors;
}

function variantErrors(variants: unknown): string[] {
  if (!isRecord(variants) || !isRecord(variants.baseline) || !isRecord(variants.candidate)) return ['benchmark baseline and candidate variants must be objects'];
  const { baseline, candidate } = variants;
  const errors: string[] = [];
  if (!isRecord(baseline.outcome) || !isRecord(candidate.outcome)) errors.push('benchmark baseline and candidate outcomes must be objects');
  else errors.push(...outcomeErrors(baseline.outcome, candidate.outcome));
  for (const [variant, definition] of [['baseline', baseline], ['candidate', candidate]] as const) errors.push(...validateInstructionSurfaceRef(definition.instruction_surface).map((error) => `${variant}: ${error}`));
  if (isDeepStrictEqual(baseline.instruction_surface, candidate.instruction_surface)) errors.push('baseline and candidate instruction surface declarations must be distinct');
  return errors;
}

export function validateBenchmarkCase(value: unknown): string[] {
  if (!isRecord(value)) return ['benchmark case must be an object'];
  const benchmark = value as BenchmarkCase;
  const errors = caseIdentityErrors(benchmark);
  errors.push(...cohortErrors(benchmark.cohort, 'benchmark cohort'));
  errors.push(...variantErrors(benchmark.variants));
  return errors;
}

function duplicateIdentityErrors({ benchmark, caseIds, categories }: { benchmark: BenchmarkCase; caseIds: Set<string>; categories: Set<string> }): string[] {
  const errors: string[] = [];
  if (typeof benchmark.case_id === 'string' && caseIds.has(benchmark.case_id)) errors.push(`duplicate benchmark case ID: ${benchmark.case_id}`);
  if (typeof benchmark.category === 'string' && categories.has(benchmark.category)) errors.push(`duplicate benchmark category: ${benchmark.category}`);
  if (typeof benchmark.case_id === 'string') caseIds.add(benchmark.case_id);
  if (typeof benchmark.category === 'string') categories.add(benchmark.category);
  return errors;
}

function corpusCaseErrors(cases: BenchmarkCase[]): string[] {
  const caseIds = new Set<string>();
  const categories = new Set<string>();
  const expectedCohort = cases[0]?.cohort;
  return cases.flatMap((benchmark, index) => {
    const label = typeof benchmark.case_id === 'string' ? benchmark.case_id : `case ${index + 1}`;
    const errors = duplicateIdentityErrors({ benchmark, caseIds, categories });
    if (!isDeepStrictEqual(expectedCohort, benchmark.cohort)) errors.push(`benchmark cohort differs from comparable corpus cohort: ${label}`);
    errors.push(...validateBenchmarkCase(benchmark).map((error) => `${label}: ${error}`));
    return errors;
  });
}

export function validateBenchmarkCorpus(value: unknown): string[] {
  if (!isRecord(value)) return ['benchmark corpus must be an object'];
  const corpus = value as BenchmarkCorpus;
  const errors: string[] = [];
  if (corpus.version !== 1) errors.push('benchmark corpus version must be 1');
  if (!Number.isInteger(corpus.minimum_attempts_per_variant) || corpus.minimum_attempts_per_variant < MINIMUM_ATTEMPTS) errors.push('benchmark corpus requires at least three attempts per category and variant');
  const casesError = recordArrayError({ value: corpus.cases, label: 'benchmark corpus cases' });
  if (casesError) return [...errors, casesError];
  errors.push(...corpusCaseErrors(corpus.cases));
  return errors;
}
