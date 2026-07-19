import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { captureProtectedInputs } from './capture-protected-inputs.js';
import { validateBenchmarkGates } from './validate-benchmark-gates.js';
import type { BenchmarkGate, GateEvidence, ProtectedInputEvidence } from './benchmark-types.js';

type GateProtectionResult = { status: 'pass' | 'fail'; expected_sha256?: string; actual_sha256?: string };
export type BenchmarkGateResult = { gate: BenchmarkGate; protection: GateProtectionResult; exit_status: number; stdout: string; stderr: string };
const DEFAULT_GATE_TIMEOUT_MS = 30_000;
const DEFAULT_GATE_MAX_BUFFER = 1_048_576;
type GateRunRequest = { workspace: string; evidence: GateEvidence; options?: { timeout_ms?: number; max_buffer?: number } };

function failed({ gate, protection, stderr }: { gate: BenchmarkGate; protection: GateProtectionResult; stderr: string }): BenchmarkGateResult {
  return { gate, protection, exit_status: 1, stdout: '', stderr };
}

function protectionEvidence({ workspace, gate, expected }: { workspace: string; gate: BenchmarkGate; expected: ProtectedInputEvidence | undefined }): { result: GateProtectionResult; error?: string } {
  if (!expected || !isDeepStrictEqual(expected.paths, gate.protected_paths) || !/^[a-f0-9]{64}$/i.test(expected.sha256)) return { result: { status: 'fail' }, error: 'protected benchmark input evidence is missing or malformed' };
  try {
    const actual = captureProtectedInputs(workspace, [gate])[0];
    const result: GateProtectionResult = { status: actual.sha256 === expected.sha256 ? 'pass' : 'fail', expected_sha256: expected.sha256, actual_sha256: actual.sha256 };
    return result.status === 'pass' ? { result } : { result, error: 'protected benchmark inputs changed before gate execution' };
  } catch (error) {
    return { result: { status: 'fail', expected_sha256: expected.sha256 }, error: error instanceof Error ? error.message : String(error) };
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function spawnedResult({ gate, protection, result }: { gate: BenchmarkGate; protection: GateProtectionResult; result: ReturnType<typeof spawnSync> }): BenchmarkGateResult {
  return { gate, protection, exit_status: result.status ?? 1, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? result.error?.message ?? '') };
}

function runGate({ workspace, gate, expected, options }: { workspace: string; gate: BenchmarkGate; expected: ProtectedInputEvidence | undefined; options: NonNullable<GateRunRequest['options']> }): BenchmarkGateResult {
  const protection = protectionEvidence({ workspace, gate, expected });
  if (protection.error) return failed({ gate, protection: protection.result, stderr: protection.error });
  try {
    const result = spawnSync(process.execPath, gate.args, { cwd: workspace, encoding: 'utf8', shell: false, timeout: options.timeout_ms ?? DEFAULT_GATE_TIMEOUT_MS, maxBuffer: options.max_buffer ?? DEFAULT_GATE_MAX_BUFFER });
    return spawnedResult({ gate, protection: protection.result, result });
  } catch (error) {
    return failed({ gate, protection: protection.result, stderr: errorText(error) });
  }
}

/** Runs the exact corpus-declared commands and returns the evidence used for acceptance. */
export function runBenchmarkGates({ workspace, evidence, options = {} }: GateRunRequest): { status: 'pass' | 'fail'; results: BenchmarkGateResult[] } {
  const errors = validateBenchmarkGates(evidence.values);
  if (errors.length) throw new Error(`invalid benchmark gates: ${errors.join('; ')}`);
  const results = evidence.values.map((gate, index) => runGate({ workspace, gate, expected: evidence.protected_inputs[index], options }));
  return { status: results.every((result) => result.exit_status === 0) ? 'pass' : 'fail', results };
}
