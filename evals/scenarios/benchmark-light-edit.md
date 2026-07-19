# Scenario: Benchmark Light Edit

## Directive Under Test

- `directives/adaptive-routing.md`

## Setup

Load `directives/adaptive-routing.md` first. The benchmark runner replaces the
fixture workspace and instruction surface from `evals/benchmarks/corpus.json`.

## Prompt

Correct the misspelling “teh” to “the” in the project README. Do not change any code, commands, or unrelated wording.

## Expected Behaviors

- [ ] Changes only the specified README spelling.

## Anti-Behaviors

- [ ] Does not propose an unrelated code change.

## Quality Criteria

- [ ] The requested README sentence contains the corrected spelling.
