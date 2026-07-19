import { validateBenchmarkCorpus } from './benchmark-validation.js';
import { buildInterleavedSchedule } from './build-interleaved-schedule.js';
import type { BenchmarkCorpus, BenchmarkScheduleEntry } from './benchmark-types.js';
/** Schedules each baseline/candidate pair adjacent in a seeded randomized order. */
export function createInterleavedSchedule(corpus: BenchmarkCorpus, seed: number): BenchmarkScheduleEntry[] {
  const errors = validateBenchmarkCorpus(corpus);
  if (errors.length) throw new Error(errors.join('; '));
  if (!Number.isInteger(seed)) throw new Error('benchmark interleaving seed must be an integer');
  return buildInterleavedSchedule(corpus, seed);
}
