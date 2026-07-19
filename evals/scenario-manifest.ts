import type { BenchmarkCase, BenchmarkScheduleEntry, BenchmarkVariant, GateEvidence } from './benchmark-types.js';
import type { BenchmarkIdentity } from './report-types.js';

export type LoadedFile = { path: string; sha256: string; bytes: number };
export type AttemptRegistration = { attempt_id: string; registered_at: string; status: 'started'; sequence?: number; schedule_sequence?: number };
export type Manifest = {
  attempt_id: string; registration: AttemptRegistration; attempt_status: 'started' | 'completed' | 'failed' | 'abandoned';
  scenario: string; date: string; commit: string; client: string; instruction_surface: string; workspace: string;
  assembled_prompt: string; prompt: string; loaded_files: LoadedFile[]; expected_loads: string[];
  claimed_route: string | null; claimed_loaded_files: string[]; completed_at?: string; exit_status?: number | null; error_message?: string;
  gates?: 'pass' | 'fail' | 'unknown'; gate_results?: Array<{ gate: { executable: string; args: string[]; protected_paths: string[] }; protection: { status: 'pass' | 'fail'; expected_sha256?: string; actual_sha256?: string }; exit_status: number; stdout: string; stderr: string }>;
  benchmark?: BenchmarkIdentity;
  cohort?: BenchmarkCase['cohort'];
  benchmark_protocol?: {
    case_id: string; category: string; variant: BenchmarkVariant; repetition: number; seed: number; corpus_sha256: string; registry_path: string; registry_sequence: number; order: BenchmarkScheduleEntry[];
    fixture: LoadedFile; prompt: LoadedFile; acceptance_checklist: LoadedFile;
    judge_handoff: { acceptance_checklist: string; sha256: string }; project_gates: GateEvidence;
    instruction_surface: { ref: string; sha256: string; files: string[] }; cohort: BenchmarkCase['cohort'];
  };
};
