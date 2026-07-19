# Scenario: Benchmark Cross-Cutting Policy

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/task-framing.md`
- `directives/specification-driven-development.md`

## Setup

Load `directives/adaptive-routing.md` first and make
`directives/task-framing.md` and `directives/specification-driven-development.md`
available after routing. The benchmark runner supplies the immutable fixture and
paired instruction surface.

## Prompt

Update the project policy and its reviewer checklist so both require recording exact validation commands before completion. Keep the two documents consistent and preserve their existing scope.

## Expected Behaviors

- [ ] The project policy requires exact validation-command evidence.
- [ ] The reviewer checklist carries the same requirement.

## Anti-Behaviors

- [ ] Does not create an unrelated workflow path.

## Quality Criteria

- [ ] The two documents use consistent wording.
