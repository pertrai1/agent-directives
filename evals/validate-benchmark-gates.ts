import type { BenchmarkGate } from './benchmark-types.js';

/** Only the deterministic fixture test gate is currently supported by the benchmark protocol. */
export function validateBenchmarkGates(gates: unknown): string[] {
  if (!Array.isArray(gates) || gates.length === 0) return ['benchmark project gates must be a non-empty array'];
  return gates.flatMap((gate, index) => {
    if (!isDirectNodeGate(gate)) return [`benchmark project gate ${index + 1} is unsupported; use a direct node test file with protected package.json and test inputs`];
    return [];
  });
}

function isDirectNodeGate(gate: unknown): gate is BenchmarkGate {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) return false;
  const current = gate as BenchmarkGate;
  const checks = [
    current.executable === 'node',
    Array.isArray(current.args),
    current.args?.length === 1,
    typeof current.args?.[0] === 'string' && /^test\/[a-z0-9-]+\.test\.mjs$/.test(current.args[0]),
    Array.isArray(current.protected_paths),
    current.protected_paths?.length === 2,
    current.protected_paths?.[0] === 'package.json',
    current.protected_paths?.[1] === 'test',
  ];
  return checks.every(Boolean);
}
