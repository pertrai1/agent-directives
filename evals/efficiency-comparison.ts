import type { BenchmarkDataset, BenchmarkRunPlan } from './benchmark-types.js';
import type { AttemptRecord } from './report-types.js';
import { attestationErrors, recordCollectionErrors } from './efficiency-evidence-validation.js';
import { asNumber, compareFraction, divide, median, normalize, parseFraction, subtract, ZERO } from './efficiency-rational.js';
import type { Fraction } from './efficiency-rational.js';
import { aggregateTokenEvidence, reconcileAttemptRecords } from './report-measurements.js';
import { validateBenchmarkDatasetAgainstRunPlan } from './benchmark-validation.js';
import { isDeepStrictEqual } from 'node:util';

export type EfficiencyManifest = {
  dataset: BenchmarkDataset;
  plan: BenchmarkRunPlan;
  records: AttemptRecord[];
};

export type CategoryEfficiency = {
  category: string;
  attempts: number;
  accepted_changes: number;
  workflow_actual_tokens: number;
  tokens_per_accepted_change?: number;
  acceptance_rate: number;
  passed: boolean;
};

export type EfficiencyComparison = {
  status: 'pass' | 'policy-failure' | 'invalid-evidence';
  minimum_reduction: number;
  corpus_reduction?: number;
  baseline: CategoryEfficiency[];
  candidate: CategoryEfficiency[];
  aggregate?: { baseline_tpac: number; candidate_tpac: number; baseline_acceptance_rate: number; candidate_acceptance_rate: number };
  errors: string[];
};

export type EfficiencyComparisonOptions = { minimum_reduction?: number | string };

type ValidatedManifest = { categories: CategoryEfficiency[]; categoryFractions: Map<string, { tpac: Fraction; rate: Fraction }>; aggregate: { tpac: Fraction; rate: Fraction }; errors: string[] };

const DEFAULT_MINIMUM_REDUCTION = '0.20';
const MINIMUM_ATTEMPT_COUNT = 3;

function isManifest(value: unknown): value is EfficiencyManifest {
  return Boolean(value && typeof value === 'object' && 'dataset' in value && 'plan' in value && Array.isArray((value as EfficiencyManifest).records));
}

function emptyManifest(errors: string[]): ValidatedManifest {
  return { categories: [], categoryFractions: new Map(), aggregate: { tpac: ZERO, rate: ZERO }, errors };
}

function schemaErrors(manifest: EfficiencyManifest, label: string): string[] {
  const errors = validateBenchmarkDatasetAgainstRunPlan({ dataset: manifest.dataset, plan: manifest.plan }).map((error) => `${label}: ${error}`);
  if (errors.length) return errors;
  const malformed = [
    !manifest.dataset, typeof manifest.dataset !== 'object', !manifest.plan, typeof manifest.plan !== 'object',
    !manifest.dataset.cohort, typeof manifest.dataset.cohort !== 'object', !Array.isArray(manifest.dataset.attempts),
    !Array.isArray(manifest.dataset.cases), !Array.isArray(manifest.dataset.registry),
  ].some(Boolean);
  return malformed ? [`${label}: manifest dataset or plan is malformed`] : [];
}

function usageErrors(record: AttemptRecord, label: string): string[] {
  return record.calls.flatMap((call) => [call.usage?.input_tokens, call.usage?.output_tokens, call.usage?.cache_read_tokens, call.usage?.cache_write_tokens, call.usage?.provider_total_tokens]
    .flatMap((value) => value === undefined || (Number.isSafeInteger(value) && value >= 0) ? [] : [`${label}: call usage must contain non-negative safe integers: ${call.call_id}`]));
}

function recordErrors({ record, attempt, cohort, label }: { record: AttemptRecord; attempt: BenchmarkDataset['attempts'][number]; cohort: BenchmarkDataset['cohort']; label: string }): string[] {
  const identityMismatch = !record.benchmark || record.benchmark.category !== attempt.category || record.benchmark.variant !== attempt.variant || record.benchmark.repetition !== attempt.repetition;
  return [
    ...(identityMismatch ? [`${label}: attempt benchmark identity differs from registered schedule: ${record.attempt_id}`] : []),
    ...(!isDeepStrictEqual(record.cohort, cohort) ? [`${label}: attempt cohort differs from manifest cohort: ${record.attempt_id}`] : []),
    ...usageErrors(record, label),
  ];
}

function recordEvidenceErrors({ manifest, records, label }: { manifest: EfficiencyManifest; records: AttemptRecord[]; label: string }): string[] {
  const attemptsById = new Map(manifest.dataset.attempts.map((attempt) => [attempt.attempt_id, attempt]));
  return records.flatMap((record) => {
    const attempt = attemptsById.get(record.attempt_id);
    return attempt ? recordErrors({ record, attempt, cohort: manifest.dataset.cohort, label }) : [];
  });
}

type CategoryCheck = { category?: CategoryEfficiency; fractions?: { tpac: Fraction; rate: Fraction }; errors: string[] };

function categoryErrors({ scheduled, matching, evidence, category, variant, label }: { scheduled: number; matching: number; evidence: ReturnType<typeof aggregateTokenEvidence>; category: string; variant: 'baseline' | 'candidate'; label: string }): string[] {
  return [
    ...(scheduled !== matching ? [`${label}: records do not cover every ${category}/${variant} scheduled attempt`] : []),
    ...(matching < MINIMUM_ATTEMPT_COUNT ? [`${label}: ${category}/${variant} has fewer than three attempts`] : []),
    ...(!evidence.actual_usage_coverage_complete ? [`${label}: ${category}/${variant} has missing actual usage`] : []),
    ...(evidence.accepted_changes === 0 ? [`${label}: ${category}/${variant} has zero accepted changes`] : []),
    ...(!evidence.hard_gate_eligible ? [`${label}: ${category}/${variant} has incomplete acceptance evidence`] : []),
  ];
}

function checkCategory({ benchmark, manifest, records, variant, label }: { benchmark: BenchmarkDataset['cases'][number]; manifest: EfficiencyManifest; records: AttemptRecord[]; variant: 'baseline' | 'candidate'; label: string }): CategoryCheck {
  const scheduled = manifest.dataset.attempts.filter((attempt) => attempt.category === benchmark.category && attempt.variant === variant);
  const matching = records.filter((record) => record.benchmark?.category === benchmark.category && record.benchmark.variant === variant);
  const evidence = aggregateTokenEvidence(matching);
  const errors = categoryErrors({ scheduled: scheduled.length, matching: matching.length, evidence, category: benchmark.category, variant, label });
  if (!Number.isSafeInteger(evidence.workflow_actual_tokens)) return { errors: [...errors, `${label}: ${benchmark.category}/${variant} workflow token total exceeds safe integer precision`] };
  const rate = matching.length > 0 ? normalize({ numerator: BigInt(evidence.accepted_changes), denominator: BigInt(matching.length) }) : ZERO;
  const category: CategoryEfficiency = {
    category: benchmark.category,
    attempts: matching.length,
    accepted_changes: evidence.accepted_changes,
    workflow_actual_tokens: evidence.workflow_actual_tokens,
    acceptance_rate: asNumber(rate),
    passed: evidence.accepted_changes > 0,
  };
  if (!evidence.actual_usage_coverage_complete || evidence.accepted_changes === 0 || matching.length === 0) return { errors, category };
  const tpac = normalize({ numerator: BigInt(evidence.workflow_actual_tokens), denominator: BigInt(evidence.accepted_changes) });
  return { errors, category: { ...category, tokens_per_accepted_change: asNumber(tpac) }, fractions: { tpac, rate } };
}

function categoryEvidence({ manifest, records, variant, label }: { manifest: EfficiencyManifest; records: AttemptRecord[]; variant: 'baseline' | 'candidate'; label: string }): Omit<ValidatedManifest, 'errors'> & { errors: string[] } {
  const errors: string[] = [];
  const categories: CategoryEfficiency[] = [];
  const categoryFractions = new Map<string, { tpac: Fraction; rate: Fraction }>();
  let aggregateTokens = 0;
  let aggregateAccepted = 0;
  let aggregateAttempts = 0;
  for (const benchmark of manifest.dataset.cases) {
    const checked = checkCategory({ benchmark, manifest, records, variant, label });
    errors.push(...checked.errors);
    if (!checked.category) continue;
    const { category } = checked;
    if (aggregateTokens > Number.MAX_SAFE_INTEGER - category.workflow_actual_tokens) {
      errors.push(`${label}: aggregate workflow token total exceeds safe integer precision`);
      continue;
    }
    categories.push(category);
    if (checked.fractions) categoryFractions.set(category.category, checked.fractions);
    aggregateTokens += category.workflow_actual_tokens;
    aggregateAccepted += category.accepted_changes;
    aggregateAttempts += category.attempts;
  }
  const aggregate = aggregateAccepted > 0 && aggregateAttempts > 0
    ? { tpac: normalize({ numerator: BigInt(aggregateTokens), denominator: BigInt(aggregateAccepted) }), rate: normalize({ numerator: BigInt(aggregateAccepted), denominator: BigInt(aggregateAttempts) }) }
    : { tpac: ZERO, rate: ZERO };
  return { categories: categories.sort((left, right) => left.category.localeCompare(right.category)), categoryFractions, aggregate, errors };
}

function errorsForManifest({ manifest, variant, label }: { manifest: unknown; variant: 'baseline' | 'candidate'; label: string }): ValidatedManifest {
  if (!isManifest(manifest)) return emptyManifest([`${label}: manifest must contain dataset, plan, and records`]);
  const errors = schemaErrors(manifest, label);
  if (errors.length) return emptyManifest(errors);
  const recordErrors = recordCollectionErrors(manifest.records, label);
  if (recordErrors.length) return emptyManifest(recordErrors);
  errors.push(...attestationErrors(manifest.dataset, label));
  const reconciliation = reconcileAttemptRecords(manifest.dataset.registry, manifest.records);
  errors.push(...reconciliation.errors.map((error) => `${label}: ${error}`));
  errors.push(...recordEvidenceErrors({ manifest, records: reconciliation.attempts, label }));
  const evidence = categoryEvidence({ manifest, records: reconciliation.attempts, variant, label });
  return { ...evidence, errors: [...errors, ...evidence.errors] };
}

function validatedManifest(input: { manifest: unknown; variant: 'baseline' | 'candidate'; label: string }): ValidatedManifest {
  try {
    return errorsForManifest(input);
  } catch {
    return emptyManifest([`${input.label}: manifest structure is malformed`]);
  }
}

function compatibleManifests(baseline: EfficiencyManifest, candidate: EfficiencyManifest): string[] {
  const errors: string[] = [];
  if (!isDeepStrictEqual(baseline.dataset.cohort, candidate.dataset.cohort)) errors.push('baseline and candidate cohorts are incompatible');
  if (baseline.dataset.corpus_sha256 !== candidate.dataset.corpus_sha256) errors.push('baseline and candidate corpus hashes differ');
  if (!isDeepStrictEqual(baseline.dataset.cases, candidate.dataset.cases)) errors.push('baseline and candidate case/outcome/surface definitions differ');
  if (baseline.dataset.seed !== candidate.dataset.seed || !isDeepStrictEqual(baseline.dataset.order, candidate.dataset.order)) errors.push('baseline and candidate seeded schedules differ');
  return errors;
}

function compatibilityErrors({ baseline, candidate, baselineManifest, candidateManifest }: { baseline: ValidatedManifest; candidate: ValidatedManifest; baselineManifest: unknown; candidateManifest: unknown }): string[] {
  if (baseline.errors.length || candidate.errors.length) return [];
  if (!isManifest(baselineManifest) || !isManifest(candidateManifest)) return [];
  return compatibleManifests(baselineManifest, candidateManifest);
}

function comparisonResult({ status, threshold, reduction, baseline, candidate, errors }: { status: EfficiencyComparison['status']; threshold: Fraction; reduction?: Fraction; baseline: ValidatedManifest; candidate: ValidatedManifest; errors: string[] }): EfficiencyComparison {
  return {
    status,
    minimum_reduction: asNumber(threshold),
    ...(reduction ? { corpus_reduction: asNumber(reduction) } : {}),
    baseline: baseline.categories,
    candidate: candidate.categories,
    aggregate: { baseline_tpac: asNumber(baseline.aggregate.tpac), candidate_tpac: asNumber(candidate.aggregate.tpac), baseline_acceptance_rate: asNumber(baseline.aggregate.rate), candidate_acceptance_rate: asNumber(candidate.aggregate.rate) },
    errors,
  };
}

function thresholdErrors(threshold: Fraction | undefined): string[] {
  if (!threshold) return ['minimum reduction must be a decimal or fraction from 0 through 1'];
  const belowZero = compareFraction(threshold, ZERO) < 0;
  const aboveOne = compareFraction(threshold, { numerator: 1n, denominator: 1n }) > 0;
  return belowZero || aboveOne ? ['minimum reduction must be a decimal or fraction from 0 through 1'] : [];
}

function categorySetError(baseline: ValidatedManifest, candidate: ValidatedManifest): string | undefined {
  const baselineCategories = new Set(baseline.categoryFractions.keys());
  const candidateCategories = new Set(candidate.categoryFractions.keys());
  const differs = baselineCategories.size !== candidateCategories.size || [...baselineCategories].some((category) => !candidateCategories.has(category));
  return differs ? 'baseline and candidate categories differ' : undefined;
}

function policyErrors({ baseline, candidate, threshold, reduction }: { baseline: ValidatedManifest; candidate: ValidatedManifest; threshold: Fraction; reduction: Fraction }): string[] {
  const errors = compareFraction(reduction, threshold) < 0 ? [`corpus reduction is below the required threshold: ${asNumber(reduction)}`] : [];
  if (compareFraction(candidate.aggregate.tpac, baseline.aggregate.tpac) > 0) errors.push('aggregate TPAC increased');
  for (const category of [...baseline.categoryFractions.keys()].sort()) {
    const baselineCategory = baseline.categoryFractions.get(category)!;
    const candidateCategory = candidate.categoryFractions.get(category)!;
    if (compareFraction(candidateCategory.rate, baselineCategory.rate) < 0) errors.push(`${category} acceptance rate regressed`);
  }
  if (compareFraction(candidate.aggregate.rate, baseline.aggregate.rate) < 0) errors.push('aggregate acceptance rate regressed');
  return errors;
}

/** Compares two complete paired-benchmark manifests with exact unrounded policy arithmetic. */
export function compareEfficiency({ baseline: baselineManifest, candidate: candidateManifest, options = {} }: { baseline: unknown; candidate: unknown; options?: EfficiencyComparisonOptions }): EfficiencyComparison {
  const threshold = parseFraction(options.minimum_reduction ?? DEFAULT_MINIMUM_REDUCTION);
  const baseline = validatedManifest({ manifest: baselineManifest, variant: 'baseline', label: 'baseline' });
  const candidate = validatedManifest({ manifest: candidateManifest, variant: 'candidate', label: 'candidate' });
  const compatibility = compatibilityErrors({ baseline, candidate, baselineManifest, candidateManifest });
  const integrityErrors = [...baseline.errors, ...candidate.errors, ...compatibility];
  integrityErrors.push(...thresholdErrors(threshold));
  if (integrityErrors.length || !threshold) return comparisonResult({ status: 'invalid-evidence', threshold: threshold ?? { numerator: 0n, denominator: 1n }, baseline, candidate, errors: integrityErrors });
  const categoriesError = categorySetError(baseline, candidate);
  if (categoriesError) return comparisonResult({ status: 'invalid-evidence', threshold, baseline, candidate, errors: [categoriesError] });
  const baselineMedian = median([...baseline.categoryFractions.values()].map((value) => value.tpac));
  if (baselineMedian.numerator === 0n) return comparisonResult({ status: 'invalid-evidence', threshold, baseline, candidate, errors: ['baseline median TPAC is zero'] });
  const reduction = subtract({ numerator: 1n, denominator: 1n }, divide(median([...candidate.categoryFractions.values()].map((value) => value.tpac)), baselineMedian));
  const errors = policyErrors({ baseline, candidate, threshold, reduction });
  return comparisonResult({ status: errors.length ? 'policy-failure' : 'pass', threshold, reduction, baseline, candidate, errors });
}
