## Why

The router currently leaves specification-driven development and error memory undiscoverable in normal workflow selection, while overlapping framing guidance and scattered state paths make orchestration ambiguous. The workflow must make a durable written specification a prerequisite for all implementation work, with specification depth scaled to task size rather than specification presence treated as optional.

## What Changes

- Make specification-driven development a first-class, always-required prerequisite for implementation and behavior-changing work.
- Route `directives/specification-driven-development.md` and relevant `docs/ERRORS.md` entries deterministically from adaptive routing.
- Make task framing the entry point and specification-driven development the single proposal/design/specification sequence before implementation.
- Add an early routing table so trivial tasks can select the Light Path without reading every detailed path section.
- Add a single state-discovery instruction to context handoffs.
- Add a concrete delegation-cost heuristic to subagent-driven development.
- Add focused eval coverage for spec-first routing, error-memory discovery, framing handoff, fast-path selection, state discovery, and delegation sizing.

## Capabilities

### New Capabilities

- `spec-first-orchestration`: Defines deterministic routing and gates that require a durable specification before implementation while preserving proportional depth for small tasks.

### Modified Capabilities

None.

## Impact

- Changes workflow policy in `directives/adaptive-routing.md`, `directives/task-framing.md`, `directives/specification-driven-development.md`, and `directives/context-handoff.md`.
- Changes delegation guidance in `skills/subagent-driven-development/SKILL.md`.
- Requires version bumps, manifest regeneration, and targeted eval scenarios for changed agent behavior.
- Preserves Claude's existing staged orchestration/verification edits and does not add runtime code, dependencies, hooks, or CI changes.
