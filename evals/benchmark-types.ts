import type { AttemptRegistration } from './report-types.js';

export const REQUIRED_COHORT_FIELDS = [
  'provider',
  'model',
  'tokenizer',
  'client_version',
  'harness_version',
  'tool_configuration_hash',
  'cache_policy',
  'global_instruction_hash',
  'inference_settings_hash',
] as const;

export type BenchmarkVariant = 'baseline' | 'candidate';
export type InstructionSurfaceRef = {
  kind: 'git-commit' | 'package-artifact';
  ref: string;
  expected_sha256: string;
  paths: string[];
};
export type BenchmarkCohort = Record<(typeof REQUIRED_COHORT_FIELDS)[number], string>;
/** An allowlisted executable plus fixture-owned inputs that an attempt cannot rewrite. */
export type BenchmarkGate = { executable: string; args: string[]; protected_paths: string[] };
export type OutcomeContract = {
  prompt_file: string;
  fixture: string;
  acceptance_checklist: string;
  project_gates: BenchmarkGate[];
};
export type BenchmarkVariantDefinition = {
  outcome: OutcomeContract;
  instruction_surface: InstructionSurfaceRef;
  diagnostics?: {
    expected_route?: string;
    expected_loads?: string[];
  };
};
export type BenchmarkCase = {
  case_id: string;
  category: string;
  scenario: string;
  cohort: BenchmarkCohort;
  variants: Record<BenchmarkVariant, BenchmarkVariantDefinition>;
};
export type BenchmarkCorpus = {
  version: 1;
  minimum_attempts_per_variant: number;
  cases: BenchmarkCase[];
};
export type BenchmarkScheduleEntry = {
  /** Stable, one-based position in the seeded execution plan. */
  sequence: number;
  case_id: string;
  category: string;
  variant: BenchmarkVariant;
  repetition: number;
};
export type BenchmarkRegistration = AttemptRegistration & {
  sequence: number;
  /** The scheduled entry this started attempt executes (retries reuse it). */
  schedule_sequence: number;
  retry_of?: string;
};
export type BenchmarkAttempt = {
  attempt_id: string;
  case_id: string;
  category: string;
  variant: BenchmarkVariant;
  repetition: number;
  schedule_sequence: number;
  cohort: BenchmarkCohort;
  evidence: BenchmarkAttemptEvidence;
};
export type BenchmarkDataset = {
  corpus_sha256: string;
  minimum_attempts_per_variant: number;
  cohort: BenchmarkCohort;
  cases: BenchmarkCase[];
  seed: number;
  order: BenchmarkScheduleEntry[];
  registry: BenchmarkRegistration[];
  attempts: BenchmarkAttempt[];
};
/** Persisted independently of individual manifests, so omitted failed runs remain detectable. */
export type BenchmarkRunPlan = {
  version: 1;
  corpus_sha256: string;
  minimum_attempts_per_variant: number;
  cohort: BenchmarkCohort;
  cases: BenchmarkCase[];
  seed: number;
  order: BenchmarkScheduleEntry[];
  registry: BenchmarkRegistration[];
};
export type FileEvidence = { path: string; sha256: string; bytes: number };
export type ProtectedInputEvidence = { paths: string[]; sha256: string };
export type GateEvidence = { values: BenchmarkGate[]; sha256: string; protected_inputs: ProtectedInputEvidence[] };
export type BenchmarkAttemptEvidence = {
  corpus_sha256: string;
  harness_commit: string;
  prompt_sha256: string;
  fixture_sha256: string;
  acceptance_checklist_sha256: string;
  project_gates: GateEvidence;
  instruction_surface: { ref: string; sha256: string };
};
export type BenchmarkRunEvidence = {
  case_id: string;
  variant: BenchmarkVariant;
  corpus_sha256: string;
  harness_commit: string;
  prompt: FileEvidence;
  fixture: FileEvidence;
  acceptance_checklist: FileEvidence;
  /** This exact checklist is supplied to the independent judge. */
  judge_handoff: { acceptance_checklist: string; sha256: string };
  project_gates: GateEvidence;
  instruction_surface: { ref: string; sha256: string; files: string[] };
};
