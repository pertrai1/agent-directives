import { createHash } from 'node:crypto';
import { createInterleavedSchedule } from './create-interleaved-schedule.js';
import type { BenchmarkCase, BenchmarkCohort, BenchmarkCorpus, BenchmarkDataset, BenchmarkGate, BenchmarkRunPlan, BenchmarkVariant } from './benchmark-types.js';
import type { EfficiencyManifest } from './efficiency-comparison.js';
import type { AttemptRecord } from './report-types.js';

const MINIMUM_ATTEMPTS = 3;
const SHA256_LENGTH = 64;
const SCHEDULE_SEED = 781;
const BASELINE_TOKENS = 100;
const CANDIDATE_TOKENS = 80;
const gate: BenchmarkGate = { executable: 'node', args: ['test/fixture.test.mjs'], protected_paths: ['package.json', 'test'] };
const checksum = (character: string): string => character.repeat(SHA256_LENGTH);
const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const commitHash = (value: string): string => createHash('sha1').update(value).digest('hex');
export const baselineSurfaceHash = hash('baseline instruction surface');
const candidateSurfaceHash = hash('candidate instruction surface');
export const cohort: BenchmarkCohort = {
  provider: 'provider', model: 'model', tokenizer: 'tokenizer', client_version: 'client', harness_version: commitHash('harness'),
  tool_configuration_hash: hash('tools'), cache_policy: 'disabled', global_instruction_hash: hash('global instructions'), inference_settings_hash: hash('inference settings'),
};

type Rates = Record<string, Record<BenchmarkVariant, boolean[]>>;
type Tokens = Record<string, Record<BenchmarkVariant, number>>;
type RecordBuilder = (input: { attempt: BenchmarkDataset['attempts'][number]; token: number; accepted: boolean }) => AttemptRecord;

function benchmark(category: string): BenchmarkCase {
  const outcome = { prompt_file: `prompts/${category}.md`, fixture: category, acceptance_checklist: `checks/${category}.md`, project_gates: [gate] };
  return {
    case_id: category,
    category,
    scenario: category,
    cohort,
    variants: {
      baseline: { outcome, instruction_surface: { kind: 'package-artifact', ref: 'baseline', expected_sha256: baselineSurfaceHash, paths: ['AGENTS.md'] } },
      candidate: { outcome: { ...outcome }, instruction_surface: { kind: 'package-artifact', ref: 'candidate', expected_sha256: candidateSurfaceHash, paths: ['AGENTS.md'] } },
    },
  };
}

export function manifest({ categories = ['alpha', 'beta'], tokens = {}, rates = {}, records }: { categories?: string[]; tokens?: Partial<Tokens>; rates?: Partial<Rates>; records?: RecordBuilder } = {}): EfficiencyManifest {
  const corpus: BenchmarkCorpus = { version: 1, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cases: categories.map(benchmark) };
  const corpus_sha256 = hash(corpus);
  const order = createInterleavedSchedule(corpus, SCHEDULE_SEED);
  const registry = order.map((entry, index) => ({ attempt_id: `attempt-${index + 1}`, registered_at: '2026-07-19T00:00:00.000Z', status: 'started' as const, sequence: index + 1, schedule_sequence: entry.sequence }));
  const dataset: BenchmarkDataset = {
    corpus_sha256,
    minimum_attempts_per_variant: MINIMUM_ATTEMPTS,
    cohort,
    cases: corpus.cases,
    seed: SCHEDULE_SEED,
    order,
    registry,
    attempts: order.map((entry, index) => ({
      attempt_id: registry[index].attempt_id,
      ...entry,
      schedule_sequence: entry.sequence,
      cohort,
      evidence: {
        corpus_sha256,
        harness_commit: cohort.harness_version,
        prompt_sha256: checksum('1'),
        fixture_sha256: checksum('2'),
        acceptance_checklist_sha256: checksum('3'),
        project_gates: { values: [gate], sha256: hash([gate]), protected_inputs: [{ paths: gate.protected_paths, sha256: checksum('4') }] },
        instruction_surface: { ref: entry.variant === 'baseline' ? 'baseline' : 'candidate', sha256: entry.variant === 'baseline' ? baselineSurfaceHash : candidateSurfaceHash },
      },
    })),
  };
  const plan: BenchmarkRunPlan = { version: 1, corpus_sha256, minimum_attempts_per_variant: MINIMUM_ATTEMPTS, cohort, cases: corpus.cases, seed: SCHEDULE_SEED, order, registry: [...registry] };
  const normalized = dataset.attempts.map((attempt) => {
    const token = tokens[attempt.category]?.[attempt.variant] ?? (attempt.variant === 'baseline' ? BASELINE_TOKENS : CANDIDATE_TOKENS);
    const accepted = rates[attempt.category]?.[attempt.variant]?.[attempt.repetition - 1] ?? true;
    return records?.({ attempt, token, accepted }) ?? {
      attempt_id: attempt.attempt_id,
      registration: registry.find((entry) => entry.attempt_id === attempt.attempt_id)!,
      status: 'completed',
      scenario: attempt.category,
      verdict: accepted ? 'pass' : 'fail',
      gates: 'pass',
      benchmark: { category: attempt.category, variant: attempt.variant, repetition: attempt.repetition },
      cohort,
      calls: [{ call_id: `${attempt.attempt_id}:primary`, role: 'primary', usage: { provider_total_tokens: token, provenance: 'provider-reported' } }],
    } satisfies AttemptRecord;
  });
  return { dataset, plan, records: normalized };
}
