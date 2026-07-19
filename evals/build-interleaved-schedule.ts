import type { BenchmarkCorpus, BenchmarkScheduleEntry, BenchmarkVariant } from './benchmark-types.js';

const RANDOM_INCREMENT = 0x6d2b79f5;
const RANDOM_SHIFT_A = 15;
const RANDOM_SHIFT_B = 7;
const RANDOM_MULTIPLIER = 61;
const RANDOM_SHIFT_C = 14;
const UINT32_RANGE = 4_294_967_296;
const VARIANT_SHUFFLE_THRESHOLD = 0.5;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += RANDOM_INCREMENT;
    let value = state;
    value = Math.imul(value ^ (value >>> RANDOM_SHIFT_A), value | 1);
    value ^= value + Math.imul(value ^ (value >>> RANDOM_SHIFT_B), value | RANDOM_MULTIPLIER);
    return ((value ^ (value >>> RANDOM_SHIFT_C)) >>> 0) / UINT32_RANGE;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

/** Pure schedule construction shared by creation and persisted-evidence validation. */
export function buildInterleavedSchedule(corpus: BenchmarkCorpus, seed: number): BenchmarkScheduleEntry[] {
  const random = seededRandom(seed);
  const pairs = shuffle(corpus.cases.flatMap((benchmark) => Array.from({ length: corpus.minimum_attempts_per_variant }, (_, index) => ({ case_id: benchmark.case_id, category: benchmark.category, repetition: index + 1 }))), random);
  return pairs.flatMap((pair) => (random() < VARIANT_SHUFFLE_THRESHOLD ? ['baseline', 'candidate'] : ['candidate', 'baseline']).map((variant) => ({ ...pair, variant: variant as BenchmarkVariant }))).map((entry, index) => ({ ...entry, sequence: index + 1 }));
}
