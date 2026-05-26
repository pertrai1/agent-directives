export type Counts = { passed: number; failed: number; unclear: number; total: number };
export type RoutingEvent = { target: string; expected_load: boolean; actual_load: boolean };
export type RoutingTrace = {
  expected_files?: string[];
  provided_files?: string[];
  claimed_files?: string[];
  missing_expected?: string[];
  unexpected_claims?: string[];
};
export type EvalRun = {
  source: string;
  scenario: string;
  date: string;
  model: string;
  judge_model: string;
  client: string;
  provider: string;
  instruction_surface: string;
  commit: string;
  verdict: string;
  targets: string[];
  expected: Counts;
  anti: Counts;
  quality: Counts;
  routing: RoutingEvent[];
  routing_trace?: RoutingTrace;
  failure_tags: string[];
  judge_summary: string;
};
