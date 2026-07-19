# Scenario: Benchmark Related Low-Risk Batch

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/specification-driven-development.md`

## Setup

Load `directives/adaptive-routing.md` first and make
`directives/specification-driven-development.md` available after routing. The
benchmark runner supplies the immutable fixture and paired instruction surface.

## Prompt

Fix the three related display-label functions so an empty value renders the documented fallback in each file. Keep the changes within this subsystem and add focused tests for every outcome.

## Expected Behaviors

- [ ] Empty primary, secondary, and tertiary values render their documented fallbacks.
- [ ] Non-empty labels remain unchanged.

## Anti-Behaviors

- [ ] Does not change files outside the display-label subsystem.

## Quality Criteria

- [ ] The three requested fallback outcomes are directly verifiable.
