---
date: 2026-07-19
task: Add bounded Small Batch workflow for related low-risk behavioral fixes
domain: small-batch-workflow
kind: repo-policy
scope: repo
status: active
triggers:
  - batching related behavioral fixes
  - deciding whether a fix batch can amortize workflow ceremony
  - unexpected coupling in a small batch
applies_to:
  - directives/adaptive-routing.md
  - directives/references/adaptive-routing-detail.md
  - directives/specification-driven-development.md
  - directives/test-driven-development.md
  - directives/verification.md
  - skills/self-audit/SKILL.md
supersedes: []
---

# Bound workflow batching to related low-risk behavioral fixes

## Context

Several tiny, related fixes can repeat route, specification, audit, and final
gate overhead without adding evidence. A broad batching exception would instead
hide boundary, policy, production, and coupling risks. The policy therefore
needed an objective limit that preserves per-fix acceptance proof.

## Decision

Allow Small Batch only as a Full-path amortization modifier for exactly two to
five closely related low-risk behavioral fixes in one subsystem with one
coherent outcome/root cause. It requires one durable batch specification with a
binary per-fix matrix, a complete scoped RED, row-by-row GREEN/REFACTOR proof,
one self-audit, and one final canonical gate run. It unconditionally composes
with Debugging, preserving reproduce → root-cause analysis → failing proof → fix
→ rerun order. Workspace Isolation remains conditional on checkout state. The
modifier excludes every Boundary, Policy, and Production trigger and stops
non-destructively for coupling or eligibility drift before re-spec, re-baseline,
and rerouting.

## Rejected Alternatives

**Batch every small fix that shares a pull request** — Rejected because PR
proximity does not prove a shared subsystem/outcome, reversible scope, or safety
boundary.

**Keep a full workflow for each eligible row** — Rejected because it repeats
the outer ceremony that the bounded path safely amortizes while adding no
per-row acceptance evidence.

## Consequences

**Easier:**
- Focused two-to-five-fix changes can use one durable contract and final gate
  cycle without weakening binary row evidence.

**Harder:**
- Agents must reject tempting nearby work and reroute when eligibility changes.

**Watch for:**
- Treating a shared issue, file, or commit as proof of relatedness or continuing
  after a newly discovered dependency.

**Unlearn:**
- A batch that is eligible before RED is not permanently eligible; coupling
  discovered during implementation can require the remaining work to split.
