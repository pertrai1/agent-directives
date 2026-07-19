import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareEfficiency } from './efficiency-comparison.js';
import { baselineSurfaceHash, cohort, manifest } from './efficiency-test-fixture.js';
import type { BenchmarkVariant } from './benchmark-types.js';
import type { EfficiencyManifest } from './efficiency-comparison.js';

const MINIMUM_ATTEMPTS = 3;
const SHA256_LENGTH = 64;
const BASELINE_TOKENS = 100;
const CANDIDATE_TOKENS = 80;
const POLICY_REDUCTION = 0.2;
const OVERRIDE_REDUCTION = 0.1;
const NINETY_PERCENT_REDUCTION = 0.9;
const NINETY_TOKENS = 90;
const FIFTY_TOKENS = 50;
const TWO_HUNDRED_TOKENS = 200;
const TEN_TOKENS = 10;
const NINE_TOKENS = 9;
const LARGE_BASELINE_TOKENS = 10_000;
const LARGE_CANDIDATE_TOKENS = 20_000;
const SUBAGENT_TOKENS = 2;
const REVIEWER_TOKENS = 3;
const EVALUATOR_TOKENS = 1_000;
const ACCOUNTED_TOKENS = 315;
const RETRY_TOKENS = 40;
const RETRY_ACCOUNTED_TOKENS = 340;
const FRACTIONAL_TOKENS = 1.5;
const HALF_CATEGORY_TOKENS = 5;
const COMBINED_CATEGORY_TOKENS = 55;
const ONE_SIXTH = 1 / 6;
const SCIENTIFIC_THRESHOLD = 1e-7;
const checksum = (character: string): string => character.repeat(SHA256_LENGTH);

const baseline = manifest();
const candidate = manifest();
const exactThreshold = compareEfficiency({ baseline, candidate });
assert.equal(exactThreshold.status, 'pass', 'the default threshold accepts an exact 20% corpus reduction');
assert.equal(exactThreshold.corpus_reduction, POLICY_REDUCTION, 'the corpus reduction uses exact unrounded category TPAC values');
assert.deepEqual(exactThreshold.aggregate, { baseline_tpac: BASELINE_TOKENS, candidate_tpac: CANDIDATE_TOKENS, baseline_acceptance_rate: 1, candidate_acceptance_rate: 1 }, 'aggregate values remain visible alongside category values');

const overrideCandidate = manifest({ tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: NINETY_TOKENS }, beta: { baseline: BASELINE_TOKENS, candidate: NINETY_TOKENS } } });
const insufficient = compareEfficiency({ baseline, candidate: overrideCandidate });
assert.equal(insufficient.status, 'policy-failure', 'insufficient corpus reduction is a policy failure');
assert.equal(compareEfficiency({ baseline, candidate: overrideCandidate, options: { minimum_reduction: OVERRIDE_REDUCTION } }).status, 'pass', 'a threshold override changes only the reduction threshold');

const precisionBaseline = manifest({ categories: ['alpha', 'beta'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: BASELINE_TOKENS }, beta: { baseline: TWO_HUNDRED_TOKENS, candidate: TWO_HUNDRED_TOKENS } } });
const precisionCandidate = manifest({ categories: ['alpha', 'beta'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: FIFTY_TOKENS }, beta: { baseline: TWO_HUNDRED_TOKENS, candidate: TWO_HUNDRED_TOKENS } } });
const precision = compareEfficiency({ baseline: precisionBaseline, candidate: precisionCandidate, options: { minimum_reduction: '1/6' } });
assert.equal(precision.status, 'pass', 'the arithmetic even-count median is compared without display rounding');
assert.equal(precision.corpus_reduction, ONE_SIXTH, 'the even median is the arithmetic mean of the two exact category TPAC values');

const ratioBaseline = manifest({ categories: ['alpha', 'beta'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: BASELINE_TOKENS }, beta: { baseline: TEN_TOKENS, candidate: TEN_TOKENS } } });
const ratioCandidate = manifest({ categories: ['alpha', 'beta'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: 1 }, beta: { baseline: TEN_TOKENS, candidate: NINE_TOKENS } } });
const ratio = compareEfficiency({ baseline: ratioBaseline, candidate: ratioCandidate, options: { minimum_reduction: NINETY_PERCENT_REDUCTION } });
assert.equal(ratio.status, 'pass', 'the median-of-category-TPAC equation is not replaced by median paired percentage reductions');
assert.equal(ratio.corpus_reduction, 1 - (HALF_CATEGORY_TOKENS / COMBINED_CATEGORY_TOKENS), 'the specified corpus equation stays exact for divergent ratio inputs');

const aggregateRegression = compareEfficiency({
  baseline: manifest({ categories: ['alpha', 'beta', 'gamma'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: BASELINE_TOKENS }, beta: { baseline: BASELINE_TOKENS, candidate: BASELINE_TOKENS }, gamma: { baseline: LARGE_BASELINE_TOKENS, candidate: LARGE_BASELINE_TOKENS } } }),
  candidate: manifest({ categories: ['alpha', 'beta', 'gamma'], tokens: { alpha: { baseline: BASELINE_TOKENS, candidate: FIFTY_TOKENS }, beta: { baseline: BASELINE_TOKENS, candidate: FIFTY_TOKENS }, gamma: { baseline: LARGE_BASELINE_TOKENS, candidate: LARGE_CANDIDATE_TOKENS } } }),
  options: { minimum_reduction: POLICY_REDUCTION },
});
assert.equal(aggregateRegression.status, 'policy-failure', 'a median reduction cannot hide aggregate TPAC growth');
assert.equal(aggregateRegression.errors.some((error) => error.includes('aggregate TPAC')), true, 'aggregate-cost regression is reported explicitly');

const rateRegression = compareEfficiency({ baseline, candidate: manifest({ rates: { alpha: { baseline: [true, true, true], candidate: [true, true, false] } } }) });
assert.equal(rateRegression.status, 'policy-failure', 'a compensating category gain cannot hide a per-category acceptance-rate regression');
assert.equal(rateRegression.errors.some((error) => error.includes('alpha acceptance rate')), true, 'the regressed category is identified');
assert.equal(compareEfficiency({ baseline, candidate: manifest({ rates: { alpha: { baseline: [true, true, true], candidate: [true, true, false] } } }), options: { minimum_reduction: 0 } }).status, 'policy-failure', 'lowering the token threshold cannot bypass reliability regression');

const failedCategory = compareEfficiency({ baseline, candidate: manifest({ rates: { alpha: { baseline: [true, true, true], candidate: [false, false, false] } } }) });
assert.equal(failedCategory.status, 'invalid-evidence', 'a category with zero accepted changes is invalid evidence rather than a passing comparison');
assert.equal(failedCategory.errors.some((error) => error.includes('zero accepted')), true, 'pass-to-fail category evidence is visible');
assert.deepEqual(failedCategory.candidate.find((category) => category.category === 'alpha'), { category: 'alpha', attempts: MINIMUM_ATTEMPTS, accepted_changes: 0, workflow_actual_tokens: CANDIDATE_TOKENS * MINIMUM_ATTEMPTS, acceptance_rate: 0, passed: false }, 'failed categories remain explicit without inventing a zero or infinite TPAC');

const usageAccounting = manifest({ records: ({ attempt, token, accepted }) => ({
  attempt_id: attempt.attempt_id,
  registration: { attempt_id: attempt.attempt_id, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
  status: 'completed', scenario: attempt.category, verdict: accepted ? 'pass' : 'fail', gates: 'pass',
  benchmark: { category: attempt.category, variant: attempt.variant, repetition: attempt.repetition }, cohort,
  calls: [
    { call_id: `${attempt.attempt_id}:primary`, role: 'primary', usage: { provider_total_tokens: token, provenance: 'provider-reported' } },
    { call_id: `${attempt.attempt_id}:subagent`, role: 'subagent', usage: { provider_total_tokens: SUBAGENT_TOKENS, provenance: 'provider-reported' } },
    { call_id: `${attempt.attempt_id}:reviewer`, role: 'required-reviewer', usage: { provider_total_tokens: REVIEWER_TOKENS, provenance: 'provider-reported' } },
    { call_id: `${attempt.attempt_id}:judge`, role: 'evaluator', usage: { provider_total_tokens: EVALUATOR_TOKENS, provenance: 'provider-reported' } },
  ],
}) });
const accounting = compareEfficiency({ baseline: usageAccounting, candidate: usageAccounting });
assert.equal(accounting.baseline.find((category) => category.category === 'alpha')?.workflow_actual_tokens, ACCOUNTED_TOKENS, 'workflow totals include primary, delegated, and required-reviewer calls but exclude evaluator calls');

const missingUsage = manifest();
missingUsage.records.find((record) => record.benchmark?.variant === 'baseline')!.calls = [];
assert.equal(compareEfficiency({ baseline: missingUsage, candidate }).status, 'invalid-evidence', 'missing actual usage invalidates the full comparison');
const omittedRecord = manifest();
omittedRecord.records.pop();
assert.equal(compareEfficiency({ baseline: omittedRecord, candidate }).status, 'invalid-evidence', 'a missing registry record invalidates the full comparison');
const shortSample = manifest();
shortSample.records = shortSample.records.filter((record) => !(record.benchmark?.category === 'alpha' && record.benchmark.repetition === MINIMUM_ATTEMPTS));
assert.equal(compareEfficiency({ baseline: shortSample, candidate }).status, 'invalid-evidence', 'fewer than three actual-usage attempts is invalid');
assert.equal(compareEfficiency({ baseline, candidate: manifest({ categories: ['alpha', 'gamma'] }) }).status, 'invalid-evidence', 'category mismatches are invalid evidence');
assert.equal(compareEfficiency({ baseline, candidate: manifest({ records: ({ attempt, token, accepted }) => ({
  attempt_id: attempt.attempt_id, registration: { attempt_id: attempt.attempt_id, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' }, status: 'completed', scenario: attempt.category, verdict: accepted ? 'pass' : 'fail', gates: 'pass', benchmark: { category: attempt.category, variant: attempt.variant, repetition: attempt.repetition }, cohort: { ...cohort, model: 'other' }, calls: [{ call_id: `${attempt.attempt_id}:primary`, role: 'primary', usage: { provider_total_tokens: token, provenance: 'provider-reported' } }],
}) }) }).status, 'invalid-evidence', 'incompatible full cohorts are invalid evidence');

function retry({ manifest, category, variant, token, accepted }: { manifest: EfficiencyManifest; category: string; variant: BenchmarkVariant; token: number; accepted: boolean }): void {
  const original = manifest.dataset.attempts.find((attempt) => attempt.category === category && attempt.variant === variant)!;
  const registration = { attempt_id: `retry-${manifest.dataset.registry.length + 1}`, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' as const, sequence: manifest.dataset.registry.length + 1, schedule_sequence: original.schedule_sequence, retry_of: original.attempt_id };
  manifest.dataset.registry.push(registration);
  manifest.plan.registry.push(registration);
  manifest.dataset.attempts.push({ ...original, attempt_id: registration.attempt_id });
  manifest.records.push({ attempt_id: registration.attempt_id, registration, status: 'failed', scenario: category, verdict: accepted ? 'pass' : 'fail', gates: 'pass', benchmark: { category, variant, repetition: original.repetition }, cohort, calls: [{ call_id: `${registration.attempt_id}:primary`, role: 'primary', usage: { provider_total_tokens: token, provenance: 'provider-reported' } }] });
}

const retryCost = manifest();
retry({ manifest: retryCost, category: 'alpha', variant: 'baseline', token: RETRY_TOKENS, accepted: false });
const retryCostResult = compareEfficiency({ baseline: retryCost, candidate });
assert.equal(retryCostResult.baseline.find((category) => category.category === 'alpha')?.workflow_actual_tokens, RETRY_ACCOUNTED_TOKENS, 'failed retries remain in the workflow-token numerator');

const duplicateLedger = manifest();
const duplicate = duplicateLedger.records.find((record) => record.benchmark?.variant === 'baseline')!;
duplicateLedger.records.push({ ...duplicate, calls: [{ call_id: duplicate.calls[0].call_id, role: 'subagent', usage: { provider_total_tokens: 1, provenance: 'provider-reported' } }] });
assert.equal(compareEfficiency({ baseline: duplicateLedger, candidate }).status, 'invalid-evidence', 'conflicting duplicate call-ledger evidence invalidates the comparison');

const reassignedRecord = manifest();
reassignedRecord.records.find((record) => record.benchmark?.category === 'alpha' && record.benchmark.variant === 'baseline')!.benchmark = { category: 'beta', variant: 'baseline', repetition: 1 };
assert.equal(compareEfficiency({ baseline: reassignedRecord, candidate }).status, 'invalid-evidence', 'a record reassigned to another valid category is rejected against its registered attempt');

const aggregateRateBaseline = manifest({ rates: { beta: { baseline: [true, true, false], candidate: [true, true, false] } } });
retry({ manifest: aggregateRateBaseline, category: 'beta', variant: 'baseline', token: BASELINE_TOKENS, accepted: false });
const aggregateRateCandidate = manifest({ rates: { beta: { baseline: [true, true, false], candidate: [true, true, false] } } });
retry({ manifest: aggregateRateCandidate, category: 'beta', variant: 'candidate', token: CANDIDATE_TOKENS, accepted: true });
retry({ manifest: aggregateRateCandidate, category: 'beta', variant: 'candidate', token: CANDIDATE_TOKENS, accepted: false });
retry({ manifest: aggregateRateCandidate, category: 'beta', variant: 'candidate', token: CANDIDATE_TOKENS, accepted: false });
const aggregateRateRegression = compareEfficiency({ baseline: aggregateRateBaseline, candidate: aggregateRateCandidate });
assert.equal(aggregateRateRegression.status, 'policy-failure', 'unequal retry weighting exposes aggregate acceptance-rate regression even when category rates are unchanged');
assert.equal(aggregateRateRegression.errors.includes('aggregate acceptance rate regressed'), true, 'aggregate acceptance-rate regression is reported independently');

const surfaceMismatch = manifest();
const changedSurface = surfaceMismatch.dataset.cases[0].variants.candidate.instruction_surface;
changedSurface.ref = 'other-candidate';
changedSurface.expected_sha256 = checksum('9');
surfaceMismatch.plan.cases = surfaceMismatch.dataset.cases;
for (const attempt of surfaceMismatch.dataset.attempts.filter((attempt) => attempt.category === 'alpha' && attempt.variant === 'candidate')) attempt.evidence.instruction_surface = { ref: changedSurface.ref, sha256: changedSurface.expected_sha256 };
assert.equal(compareEfficiency({ baseline, candidate: surfaceMismatch }).status, 'invalid-evidence', 'cross-manifest instruction-surface and case-contract mismatches are invalid evidence');

const placeholderSurface = manifest();
for (const benchmarkCase of placeholderSurface.dataset.cases) benchmarkCase.variants.candidate.instruction_surface.expected_sha256 = checksum('f');
for (const attempt of placeholderSurface.dataset.attempts.filter((attempt) => attempt.variant === 'candidate')) attempt.evidence.instruction_surface.sha256 = checksum('f');
const placeholderSurfaceResult = compareEfficiency({ baseline: placeholderSurface, candidate: placeholderSurface });
assert.equal(placeholderSurfaceResult.status, 'invalid-evidence', 'placeholder surface hashes cannot satisfy hard comparison evidence');
assert.equal(placeholderSurfaceResult.errors.some((error) => error.includes('placeholder instruction-surface hash')), true, 'placeholder surface evidence is identified explicitly');

const identicalSurfaces = manifest();
for (const benchmarkCase of identicalSurfaces.dataset.cases) benchmarkCase.variants.candidate.instruction_surface.expected_sha256 = baselineSurfaceHash;
for (const attempt of identicalSurfaces.dataset.attempts.filter((attempt) => attempt.variant === 'candidate')) attempt.evidence.instruction_surface.sha256 = baselineSurfaceHash;
const identicalSurfaceResult = compareEfficiency({ baseline: identicalSurfaces, candidate: identicalSurfaces });
assert.equal(identicalSurfaceResult.status, 'invalid-evidence', 'different refs cannot disguise identical installed instruction surfaces');
assert.equal(identicalSurfaceResult.errors.some((error) => error.includes('installed instruction surfaces are identical')), true, 'identical surface evidence is identified explicitly');

assert.doesNotThrow(() => compareEfficiency({ baseline: null as never, candidate: null as never }), 'malformed manifests return invalid evidence instead of throwing');
assert.equal(compareEfficiency({ baseline: null as never, candidate: null as never }).status, 'invalid-evidence', 'malformed manifests are invalid evidence');
const malformedEnvelope = { dataset: null, plan: null, records: [] };
assert.doesNotThrow(() => compareEfficiency({ baseline: malformedEnvelope, candidate: malformedEnvelope }), 'top-level manifest keys do not bypass nested shape validation');
assert.equal(compareEfficiency({ baseline: malformedEnvelope, candidate: malformedEnvelope }).status, 'invalid-evidence', 'malformed nested dataset and plan values are invalid evidence');
const malformedLedger = { ...baseline, records: [{ ...baseline.records[0], calls: null as never }, ...baseline.records.slice(1)] };
assert.doesNotThrow(() => compareEfficiency({ baseline: malformedLedger, candidate }), 'malformed call ledgers do not escape the invalid-evidence boundary');
assert.equal(compareEfficiency({ baseline: malformedLedger, candidate }).status, 'invalid-evidence', 'malformed call ledgers are invalid evidence');
for (const malformedRecord of [
  null,
  {},
  { ...baseline.records[0], registration: null },
  { ...baseline.records[0], calls: [null] },
  { ...baseline.records[0], calls: [{ ...baseline.records[0].calls[0], usage: { provenance: null } }] },
  { ...baseline.records[0], calls: [{ ...baseline.records[0].calls[0], role: 'bogus' }] },
  { ...baseline.records[0], calls: [{ ...baseline.records[0].calls[0], call_id: '' }] },
  { ...baseline.records[0], verdict: 'garbage' },
  { ...baseline.records[0], gates: 'garbage' },
]) {
  const malformedRecords = { ...baseline, records: [malformedRecord, ...baseline.records.slice(1)] };
  assert.doesNotThrow(() => compareEfficiency({ baseline: malformedRecords, candidate }), 'malformed record entries remain inside the invalid-evidence boundary');
  assert.equal(compareEfficiency({ baseline: malformedRecords, candidate }).status, 'invalid-evidence', 'malformed record entries are invalid evidence');
}
const zeroBaseline = manifest({ tokens: { alpha: { baseline: 0, candidate: 0 }, beta: { baseline: 0, candidate: 0 } } });
assert.equal(compareEfficiency({ baseline: zeroBaseline, candidate: zeroBaseline }).status, 'invalid-evidence', 'zero baseline median TPAC is invalid rather than an arithmetic exception');
const unsafeUsage = manifest();
unsafeUsage.records.find((record) => record.benchmark?.variant === 'baseline')!.calls[0].usage!.provider_total_tokens = FRACTIONAL_TOKENS;
assert.equal(compareEfficiency({ baseline: unsafeUsage, candidate }).status, 'invalid-evidence', 'fractional provider usage is invalid evidence');
assert.equal(compareEfficiency({ baseline, candidate, options: { minimum_reduction: '2' } }).status, 'invalid-evidence', 'thresholds outside zero through one are invalid evidence');
assert.doesNotThrow(() => compareEfficiency({ baseline, candidate, options: { minimum_reduction: '1/00' } }), 'zero-padded zero denominators do not escape the invalid-evidence boundary');
assert.equal(compareEfficiency({ baseline, candidate, options: { minimum_reduction: '1/00' } }).status, 'invalid-evidence', 'zero denominators are invalid evidence');
assert.equal(compareEfficiency({ baseline, candidate, options: { minimum_reduction: SCIENTIFIC_THRESHOLD } }).status, 'pass', 'numeric scientific notation thresholds retain exact policy semantics');

const cliRoot = mkdtempSync(join(tmpdir(), 'efficiency-cli-'));
const baselinePath = join(cliRoot, 'baseline.json');
const candidatePath = join(cliRoot, 'candidate.json');
const policyPath = join(cliRoot, 'policy.json');
writeFileSync(baselinePath, JSON.stringify(baseline));
writeFileSync(candidatePath, JSON.stringify(candidate));
writeFileSync(policyPath, JSON.stringify(overrideCandidate));
const cli = (candidateFile: string) => spawnSync('npm', ['run', 'eval:efficiency', '--', '--baseline', baselinePath, '--candidate', candidateFile], { cwd: process.cwd(), encoding: 'utf8' });
const cliPass = cli(candidatePath);
assert.equal(cliPass.status, 0, 'the CLI exits zero for a passing comparison');
assert.match(cliPass.stdout, /^status=pass/m, 'the CLI prints a compact status line');
assert.equal(cliPass.stdout.indexOf('category=alpha') < cliPass.stdout.indexOf('category=beta'), true, 'the CLI emits categories in stable lexical order');
const cliPolicy = cli(policyPath);
assert.equal(cliPolicy.status, 1, 'the CLI exits one for policy failure');
const cliInvalid = spawnSync('npm', ['run', 'eval:efficiency', '--', '--baseline', join(cliRoot, 'missing.json'), '--candidate', candidatePath], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(cliInvalid.status, 2, 'the CLI exits two for invalid input evidence');

console.log('Efficiency comparison tests passed.');
