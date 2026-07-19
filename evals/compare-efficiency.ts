import { readFileSync } from 'node:fs';
import { compareEfficiency } from './efficiency-comparison.js';
import type { EfficiencyManifest } from './efficiency-comparison.js';

const args = process.argv.slice(2);
const REQUIRED_ARGUMENT_COUNT = 4;
const exitCodes = { pass: 0, 'policy-failure': 1, 'invalid-evidence': 2 } as const;

function usage(): never {
  console.error('usage: npm run eval:efficiency -- --baseline <dataset.json> --candidate <dataset.json> [--minimum-reduction <decimal>]');
  process.exit(2);
}

function value(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function read(path: string): EfficiencyManifest | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as EfficiencyManifest;
  } catch (error) {
    console.error(`invalid-evidence: cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

const baselinePath = value('--baseline');
const candidatePath = value('--candidate');
const threshold = value('--minimum-reduction');
if (!baselinePath || !candidatePath || args.length !== REQUIRED_ARGUMENT_COUNT + Number(threshold !== undefined) * 2) usage();
const baseline = read(baselinePath);
const candidate = read(candidatePath);
if (!baseline || !candidate) process.exit(2);
const result = compareEfficiency({ baseline, candidate, ...(threshold === undefined ? {} : { options: { minimum_reduction: threshold } }) });

console.log(`status=${result.status}`);
console.log(`minimum_reduction=${result.minimum_reduction}`);
if (result.corpus_reduction !== undefined) console.log(`corpus_reduction=${result.corpus_reduction}`);
if (result.aggregate) console.log(`aggregate baseline_tpac=${result.aggregate.baseline_tpac} candidate_tpac=${result.aggregate.candidate_tpac} baseline_acceptance_rate=${result.aggregate.baseline_acceptance_rate} candidate_acceptance_rate=${result.aggregate.candidate_acceptance_rate}`);
for (const category of result.baseline) {
  const candidateCategory = result.candidate.find((entry) => entry.category === category.category);
  if (candidateCategory) console.log(`category=${category.category} baseline_tpac=${category.tokens_per_accepted_change ?? 'invalid'} candidate_tpac=${candidateCategory.tokens_per_accepted_change ?? 'invalid'} baseline_acceptance_rate=${category.acceptance_rate} candidate_acceptance_rate=${candidateCategory.acceptance_rate} baseline_passed=${category.passed} candidate_passed=${candidateCategory.passed}`);
}
for (const error of result.errors) console.log(`error=${error}`);
process.exit(exitCodes[result.status]);
