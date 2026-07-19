import assert from 'node:assert/strict';
import {
  aggregateTokenEvidence,
  deriveOutcomeAcceptance,
  reconcileAttemptRecords,
  workflowTokensForUsage,
} from './report-measurements.js';
import { measurementText } from './measurement-text.js';
import { measurementFields } from './measurement-fields.js';
import type { AttemptRecord, AttemptRegistration, EvalRun, ProviderUsage } from './report-types.js';

const usage = (input_tokens: number, output_tokens: number): ProviderUsage => ({
  input_tokens,
  output_tokens,
  provenance: 'provider-reported',
});
const INPUT = 10;
const OUTPUT = 20;
const TOTAL = 99;
const CACHE_READ = 30;
const CACHE_WRITE = 40;
const SUBAGENT_INPUT = 2;
const SUBAGENT_OUTPUT = 3;
const REVIEW_INPUT = 4;
const REVIEW_OUTPUT = 5;
const EVALUATOR_INPUT = 6;
const EVALUATOR_OUTPUT = 7;
const RETRY_INPUT = 7;
const RETRY_OUTPUT = 8;
const WORKFLOW_TOTAL = 59;
const EVALUATOR_TOTAL = 13;
const ATTEMPT_COUNT = 3;
const DUPLICATE_TOKEN_COUNT = 1;
const BENCHMARK_SEED = 781;
const COMMIT_HASH_LENGTH = 40;

const attempt = (id: string, overrides: Partial<AttemptRecord> = {}): AttemptRecord => ({
  attempt_id: id,
  registration: { attempt_id: id, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
  scenario: 'token-usage',
  verdict: 'pass',
  gates: 'pass',
  calls: [{ call_id: `${id}:primary`, role: 'primary', usage: usage(INPUT, OUTPUT) }],
  ...overrides,
});
const reportRun = ({ scenario, verdict, ...record }: AttemptRecord): EvalRun => ({
  ...record,
  source: 'test', scenario, date: '', model: '', judge_model: '', client: '', provider: '', instruction_surface: '', commit: '', verdict,
  targets: [], expected: { passed: 0, failed: 0, unclear: 0, total: 0 }, anti: { passed: 0, failed: 0, unclear: 0, total: 0 },
  quality: { passed: 0, failed: 0, unclear: 0, total: 0 }, routing: [], failure_tags: [], judge_summary: '',
});

assert.equal(
  workflowTokensForUsage({ provider_total_tokens: TOTAL, input_tokens: INPUT, output_tokens: OUTPUT, cache_read_tokens: CACHE_READ, cache_write_tokens: CACHE_WRITE, provenance: 'provider-reported' }),
  TOTAL,
  'provider totals take precedence without adding cache components',
);
assert.equal(workflowTokensForUsage(usage(INPUT, OUTPUT)), CACHE_READ, 'input/output is the fallback');
assert.equal(workflowTokensForUsage({ input_tokens: INPUT, provenance: 'provider-reported' }), undefined, 'partial components are incomplete');
assert.equal(aggregateTokenEvidence([attempt('missing-provenance', { calls: [{ call_id: 'missing-provenance:primary', role: 'primary', usage: { input_tokens: INPUT, output_tokens: OUTPUT, provenance: '' } }] })]).hard_gate_eligible, false, 'missing provenance cannot satisfy hard usage evidence');

assert.equal(deriveOutcomeAcceptance('pass', 'pass'), 'accepted');
assert.equal(deriveOutcomeAcceptance('fail', 'pass'), 'rejected');
assert.equal(deriveOutcomeAcceptance('pass', 'unknown'), 'unknown');

const accepted = attempt('accepted', {
  calls: [
    { call_id: 'accepted:primary', role: 'primary', usage: usage(INPUT, OUTPUT) },
    { call_id: 'accepted:subagent', role: 'subagent', usage: usage(SUBAGENT_INPUT, SUBAGENT_OUTPUT) },
    { call_id: 'accepted:review', role: 'required-reviewer', usage: usage(REVIEW_INPUT, REVIEW_OUTPUT) },
    { call_id: 'accepted:judge', role: 'evaluator', usage: usage(EVALUATOR_INPUT, EVALUATOR_OUTPUT) },
  ],
});
const retried = attempt('retry', { verdict: 'fail', calls: [{ call_id: 'retry:primary', role: 'primary', usage: usage(RETRY_INPUT, RETRY_OUTPUT) }] });
const abandoned = attempt('abandoned', { verdict: 'unknown', gates: 'unknown', status: 'abandoned', calls: [] });
const evidence = aggregateTokenEvidence([accepted, retried, abandoned]);
assert.deepEqual(evidence, {
  attempts: ATTEMPT_COUNT,
  accepted_changes: 1,
  actual_usage_attempts: 2,
  actual_usage_coverage_complete: false,
  workflow_actual_tokens: WORKFLOW_TOTAL,
  evaluator_actual_tokens: EVALUATOR_TOTAL,
  tokens_per_accepted_change: undefined,
  hard_gate_eligible: false,
}, 'delegated/reviewer/retry cost is retained, evaluator cost is separate, and abandoned usage is incomplete');
assert.equal(
  measurementText([accepted, retried, abandoned].map(reportRun)),
  'Attempts: 3; accepted changes: 1; actual usage: 2/3 (incomplete); workflow tokens: 59; evaluator tokens: 13; tokens per accepted change: unknown; categories: uncategorized (attempts=3, accepted=1, tokens=59, TPAC=unknown)',
  'terminal and HTML consumers share the same aggregate text',
);

const registered: AttemptRegistration[] = [
  { attempt_id: 'one', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
  { attempt_id: 'two', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
];
assert.equal(reconcileAttemptRecords(registered, [attempt('one'), attempt('two')]).valid, true, 'complete registered attempts reconcile');
for (const records of [
  [attempt('one')],
  [attempt('one'), attempt('two'), attempt('three')],
  [attempt('one'), attempt('one')],
  [attempt('one', { calls: [{ call_id: 'one:duplicate', role: 'primary', usage: usage(DUPLICATE_TOKEN_COUNT, DUPLICATE_TOKEN_COUNT) }, { call_id: 'one:duplicate', role: 'subagent', usage: usage(DUPLICATE_TOKEN_COUNT, DUPLICATE_TOKEN_COUNT) }] }), attempt('two')],
]) {
  assert.equal(reconcileAttemptRecords(registered, records).valid, false, 'registry or ledger conflicts invalidate the whole dataset');
}

const merged = reconcileAttemptRecords(
  [{ attempt_id: 'merge', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' }],
  [attempt('merge', { calls: [] }), attempt('merge')],
);
assert.equal(merged.valid, true, 'a registered harness placeholder merges with a judged record');

const enrichmentRegistry = [{ attempt_id: 'enriched', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' as const }];
const manifestRecord = attempt('enriched', { verdict: 'unknown', gates: 'unknown' });
const judgedRecord = attempt('enriched', { benchmark: { category: 'light', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT } });
const enriched = reconcileAttemptRecords(enrichmentRegistry, [manifestRecord, judgedRecord]);
assert.equal(enriched.valid, true, 'missing benchmark/cohort evidence can be enriched');
assert.equal(enriched.attempts.length, DUPLICATE_TOKEN_COUNT, 'manifest and judged records count as one attempt');
assert.equal(enriched.attempts[0].calls.length, DUPLICATE_TOKEN_COUNT, 'identical call evidence deduplicates during merge');
const renderedEnrichment = measurementText([manifestRecord, judgedRecord].map(reportRun));
assert.equal(renderedEnrichment.includes('Attempts: 1'), true, 'manifest and judged records render as one attempt');
assert.equal(renderedEnrichment.includes('actual usage: 1/1 (complete)'), true, 'reconciled aggregate uses its attempt count for actual-usage coverage');
assert.equal(renderedEnrichment.includes('tokens per accepted change: 30'), true, 'merged manifest and judged cost contributes once to TPAC');
const reorderedBenchmark = attempt('enriched', { benchmark: { repetition: DUPLICATE_TOKEN_COUNT, variant: 'candidate', category: 'light' } });
assert.equal(reconcileAttemptRecords(enrichmentRegistry, [judgedRecord, reorderedBenchmark]).valid, true, 'reordered equivalent identity objects reconcile');
const cohortEnrichment = attempt('enriched', { cohort: { model: 'model', provider: 'provider' } });
const fullyEnriched = reconcileAttemptRecords(enrichmentRegistry, [manifestRecord, judgedRecord, cohortEnrichment]);
assert.equal(fullyEnriched.valid, true, 'three compatible records reconcile as one complete attempt');
assert.deepEqual(fullyEnriched.attempts[0].cohort, { model: 'model', provider: 'provider' }, 'compatible enrichment from a later record is retained');
const contradictoryEnrichments = reconcileAttemptRecords(enrichmentRegistry, [
  manifestRecord,
  judgedRecord,
  attempt('enriched', { verdict: 'fail', gates: 'fail', benchmark: { category: 'other', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT } }),
]);
assert.equal(contradictoryEnrichments.valid, false, 'placeholder-first records cannot hide contradictory later enrichments');
assert.equal(reconcileAttemptRecords(enrichmentRegistry, [judgedRecord, attempt('enriched', { benchmark: { category: 'other', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT } })]).valid, false, 'different populated benchmark evidence invalidates the dataset');
assert.equal(reconcileAttemptRecords(enrichmentRegistry, [judgedRecord, attempt('enriched', { calls: [{ call_id: 'enriched:primary', role: 'subagent', usage: usage(INPUT, OUTPUT) }] })]).valid, false, 'different evidence under one call ID invalidates the dataset');
assert.equal(reconcileAttemptRecords(enrichmentRegistry, [{ ...judgedRecord, registration: { ...judgedRecord.registration, attempt_id: 'wrong' } }]).valid, false, 'registration identity must match its attempt ID');

const protocolCohort = { provider: 'provider', model: 'model', tokenizer: 'tokenizer', harness_version: 'a'.repeat(COMMIT_HASH_LENGTH) };
const manifestFields = measurementFields({
  attempt_id: 'protocol',
  registration: { attempt_id: 'protocol', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
  benchmark: { case_id: 'light-edit', category: 'light', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT, seed: BENCHMARK_SEED, cohort: protocolCohort, instruction_surface: { ref: 'candidate', sha256: 'hash' } },
});
assert.deepEqual(manifestFields.benchmark, { category: 'light', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT }, 'expanded benchmark protocol normalizes to the three identity fields only');
assert.deepEqual(manifestFields.cohort, protocolCohort, 'legacy nested protocol cohort is retained as a compatibility fallback');
assert.equal(manifestFields.benchmark_protocol?.case_id, 'light-edit', 'expanded benchmark integrity evidence remains separate from normalized identity');
const protocolManifest = attempt('protocol', { benchmark: manifestFields.benchmark, cohort: manifestFields.cohort });
const protocolJudge = attempt('protocol', { benchmark: { category: 'light', variant: 'candidate', repetition: DUPLICATE_TOKEN_COUNT }, cohort: protocolCohort });
assert.equal(reconcileAttemptRecords([{ attempt_id: 'protocol', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' }], [protocolManifest, protocolJudge]).valid, true, 'a normalized harness manifest reconciles with the normal three-field judged benchmark record');

const acceptedText = measurementText([reportRun(attempt('accepted-text'))]);
assert.equal(acceptedText.includes('tokens per accepted change: 30'), true, 'complete measured evidence renders numeric TPAC');
const legacy: EvalRun = { source: 'legacy', scenario: 'legacy', date: '', model: '', judge_model: '', client: '', provider: '', instruction_surface: '', commit: '', verdict: 'pass', targets: [], expected: { passed: 0, failed: 0, unclear: 0, total: 0 }, anti: { passed: 0, failed: 0, unclear: 0, total: 0 }, quality: { passed: 0, failed: 0, unclear: 0, total: 0 }, routing: [], failure_tags: [], judge_summary: '' };
assert.equal(measurementText([reportRun(attempt('accepted-text')), legacy]).includes('tokens per accepted change: unknown'), true, 'legacy evidence cannot retain a subset TPAC as an aggregate result');

const malformedFields = measurementFields({
  attempt_id: 'malformed', registration: { attempt_id: 'malformed', registered_at: '2026-07-19T00:00:00.000Z', status: 'started' },
  verdict: 'pass', gates: 'pass', calls: [{ call_id: 'malformed:primary', role: 'primary', usage: usage(INPUT, OUTPUT) }, { call_id: '', role: 'not-a-role', usage: usage(INPUT, OUTPUT) }],
});
const malformedRun: EvalRun = { ...reportRun(attempt('malformed')), ...malformedFields };
assert.equal(measurementText([malformedRun]).includes('tokens per accepted change: unknown'), true, 'malformed ledger evidence cannot produce numeric hard TPAC');

console.log('Token measurement tests passed.');
