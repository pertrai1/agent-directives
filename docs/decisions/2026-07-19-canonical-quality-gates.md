---
date: 2026-07-19
task: Canonicalize generic final quality-gate guidance
domain: canonical-quality-gates
kind: repo-policy
scope: repo
status: active
triggers:
  - changing final quality-gate guidance
  - changing directives/scripts/gates.sh
  - deciding where generic test lint type-check build or static-analysis guidance belongs
applies_to:
  - directives/verification.md
  - directives/scripts/gates.sh
  - directives/test-driven-development.md
  - directives/type-driven-development.md
  - evals/scenarios/canonical-quality-gate-handoff.md
supersedes: []
---

# Keep generic final gates in verification

## Context

Generic project-wide test, lint, type-check, and build instructions were
repeated in the TDD and type-first directives. Repetition increased prompt
weight and made it easy for the directives to drift, while the verification
directive already owned final evidence and its helper already bounded output.

## Decision

`directives/verification.md` and `directives/scripts/gates.sh` are the single
canonical source for generic final test, lint, type-check, build,
static-analysis, unavailable-gate reporting, and bounded-output behavior. The
helper discovers conventional static-analysis scripts in addition to the other
generic project-native gates.

TDD retains its RED/GREEN/REFACTOR checks, including tests and type checks
needed during those phases. Type-first development retains its focused
type-contract check. Both directives hand off concisely to verification after
their phase-specific proof rather than restating the final suite.

## Consequences

- Generic final-gate changes update verification and its helper first.
- Phase directives stay concise and own only evidence required during their
  respective phases.
- The canonical-gate handoff eval protects the boundary between phase proof and
  final project-wide verification.
