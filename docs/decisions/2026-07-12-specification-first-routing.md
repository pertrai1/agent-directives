---
date: 2026-07-12
task: Make written specifications mandatory before implementation
domain: specification-first-routing
kind: repo-policy
scope: repo
status: active
triggers:
  - changing when specification-driven development is required
  - changing the handoff from task framing to specification
  - deciding whether small implementation work can skip a specification
applies_to:
  - directives/adaptive-routing.md
  - directives/task-framing.md
  - directives/specification-driven-development.md
supersedes: []
---

# Require specifications before implementation

## Context

Specification-driven development existed as a conditional directive for larger
features, but adaptive routing did not discover it and task framing offered an
interchangeable proposal path. That allowed small fixes and other implementation
work to begin without a durable contract, contrary to the repository's intended
spec-first workflow.

## Decision

Every implementation or behavior-changing task must create or identify a durable
written specification before RED/GREEN or implementation edits. Specification
depth scales with complexity: small tasks and fixes may use a brief proposal and
atomic acceptance or regression criteria, while medium and cross-cutting changes
use proposal, design, and detailed requirements. Task framing is the intake;
specification-driven development owns the single Propose/Design/Specify contract.

## Rejected Alternatives

**Require specifications only when build-and-see risks major rework** — Rejected
because conditional judgment made the directive easy to orphan or skip and did
not satisfy the explicit spec-first policy.

**Require a full proposal, design, and detailed spec for every repository edit**
— Rejected because non-behavioral typo, formatting, review-only, and
conversational work has no implementation contract to define. Those tasks remain
eligible for the Light Path.

**Keep task framing and specification-driven proposals interchangeable** —
Rejected because two proposal systems create duplicate work or allow agents to
skip specification-specific gates.

## Consequences

**Easier:**
- Reviewers can trace implementation back to a durable contract at every scale.
- The router deterministically selects specification-driven development.
- Small work remains proportional through brief specifications rather than an
  exemption from specification.

**Harder:**
- Even one-function fixes require a small durable regression contract.
- Agents must distinguish non-behavioral Light Path edits from behavior-changing
  implementation accurately.

**Watch for:**
- Brief specifications collapsing into undocumented chat assumptions.
- Agents treating `required: true` as a reason to load the directive for purely
  conversational or review-only tasks.
- Task framing recreating a second proposal template over time.

**Unlearn:**
- A full multi-document design was appropriate for this cross-cutting policy
  change, but specification depth should not be copied unchanged to small fixes.
