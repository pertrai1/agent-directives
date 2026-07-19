# Scenario: Benchmark One-Function Fix

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/test-driven-development.md`

## Setup

Load `directives/adaptive-routing.md` first and make
`directives/test-driven-development.md` available after routing. The benchmark
runner supplies the immutable fixture and paired instruction surface.

## Prompt

Fix `src/format-greeting.mjs` so an empty name returns `Hello, friend!`; preserve the current greeting for non-empty names. Add or update focused test coverage.

## Expected Behaviors

- [ ] Empty input returns `Hello, friend!`.
- [ ] Preserves the named non-empty greeting behavior.

## Anti-Behaviors

- [ ] Does not alter unrelated production behavior.

## Quality Criteria

- [ ] The two requested greeting outcomes are directly verifiable.
