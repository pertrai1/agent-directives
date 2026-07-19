# Scenario: Bounded Small Batch Workflow

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/references/adaptive-routing-detail.md`
- `skills/systematic-debugging/SKILL.md`
- `directives/workspace-isolation.md`
- `directives/specification-driven-development.md`
- `directives/test-driven-development.md`
- `directives/verification.md`
- `skills/self-audit/SKILL.md`

## Setup

Load these source files into agent context in the listed order:

- `directives/adaptive-routing.md`
- `directives/references/adaptive-routing-detail.md`
- `skills/systematic-debugging/SKILL.md`
- `directives/workspace-isolation.md`
- `directives/specification-driven-development.md`
- `directives/test-driven-development.md`
- `directives/verification.md`
- `skills/self-audit/SKILL.md`

## Prompt

> Return one separately labeled route outcome for every case below. Do not
> combine cases or use one exclusion to answer another.
>
> - E2: exactly two related low-risk behavioral fixes in one parser with one root cause.
> - E5: exactly five such fixes.
> - C1: one such fix.
> - C6: six such fixes.
> - N-UNRELATED: three fixes, but one belongs to another subsystem/outcome.
> - N-IMPORT: three otherwise eligible fixes, but one changes an internal import.
> - N-EXPORT: three otherwise eligible fixes, but one changes an internal export.
> - N-SHARED-UTILITY: three otherwise eligible fixes, but one changes a shared utility.
> - N-SHARED-MODULE: three otherwise eligible fixes, but one changes a shared module.
> - N-DEPENDENCY: three otherwise eligible fixes, but one changes dependency direction.
> - N-PUBLIC-API: three otherwise eligible fixes, but one crosses a public API boundary.
> - N-PACKAGE: three otherwise eligible fixes, but one crosses a package boundary.
> - N-POLICY: three otherwise eligible fixes, but one changes repository workflow policy.
> - N-SECURITY: three otherwise eligible fixes, but one changes security behavior.
> - N-AUTH: three otherwise eligible fixes, but one changes authentication behavior.
> - N-PRIVACY: three otherwise eligible fixes, but one changes privacy behavior.
> - N-PERSISTENCE: three otherwise eligible fixes, but one changes persistence.
> - N-SCHEMA: three otherwise eligible fixes, but one changes a data schema.
> - N-DATA-LOSS: three otherwise eligible fixes, but one carries data-loss risk.
> - N-EXTERNAL: three otherwise eligible fixes, but one changes an external service.
> - N-ASYNC: three otherwise eligible fixes, but one changes async job behavior.
> - N-QUEUE: three otherwise eligible fixes, but one changes queue behavior.
> - N-CROSS-SERVICE: three otherwise eligible fixes, but one changes cross-service behavior.
> - N-INFRA: three otherwise eligible fixes, but one changes infrastructure.
> - N-DEPLOY: three otherwise eligible fixes, but one changes deployment config.
> - N-PERFORMANCE: three otherwise eligible fixes, but one changes performance/scale behavior.
> - N-CRITICAL: three otherwise eligible fixes, but one touches a critical path.
> - N-PERMISSIONS: three otherwise eligible fixes, but one changes permissions behavior.
> - N-PAYMENTS: three otherwise eligible fixes, but one changes payment behavior.
> - W-ISOLATED: three eligible fixes in an already-clean isolated feature worktree.
> - W-SHARED: three eligible fixes from a dirty shared default-branch checkout.
> - COUPLING: three eligible parser fixes; after the first row passes, the second
>   reveals coupling to another subsystem.
>
> For eligible cases, state the mandatory Debugging order, batch evidence, and
> checkout-dependent isolation action. For COUPLING, state what happens next.

## Expected Behaviors

- [ ] E2 selects `Small Batch + Debugging + Full`.
- [ ] E5 selects `Small Batch + Debugging + Full`.
- [ ] C1 rejects Small Batch and keeps `Debugging + Full`.
- [ ] C6 rejects Small Batch and keeps `Debugging + Full`.
- [ ] N-UNRELATED rejects Small Batch and splits/reroutes the unrelated work.
- [ ] N-IMPORT rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-EXPORT rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-SHARED-UTILITY rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-SHARED-MODULE rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-DEPENDENCY rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-PUBLIC-API rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-PACKAGE rejects Small Batch and adds Boundary to the applicable Debugging + Full route.
- [ ] N-POLICY rejects Small Batch, selects Policy + Full with
      agent-permissions guidance, and reroutes remaining fixes separately.
- [ ] N-SECURITY rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-AUTH rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-PRIVACY rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-PERSISTENCE rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-SCHEMA rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-DATA-LOSS rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-EXTERNAL rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-ASYNC rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-QUEUE rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-CROSS-SERVICE rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-INFRA rejects Small Batch and selects Debugging + Full with
      production-readiness and agent-permissions guidance.
- [ ] N-DEPLOY rejects Small Batch and selects Debugging + Full with
      production-readiness and agent-permissions guidance.
- [ ] N-PERFORMANCE rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-CRITICAL rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-PERMISSIONS rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] N-PAYMENTS rejects Small Batch and selects Debugging + Full with production-readiness review.
- [ ] Every eligible case uses Debugging unconditionally: reproduce current
      behavior, establish the shared root cause and expected behavior, record
      failing proof, then fix, rerun, and verify.
- [ ] W-ISOLATED reuses the clean isolated worktree and records its baseline;
      it does not create unnecessary isolation.
- [ ] W-SHARED adds Workspace Isolation and establishes an isolated baseline
      before mutation.
- [ ] Requires one durable batch specification that enumerates every fix and
      non-goal, with one binary acceptance-matrix row per fix before RED.
- [ ] Allows one controlled multi-row RED only for the complete scoped matrix,
      then proves minimum GREEN/refactor and focused evidence one row at a time.
- [ ] Performs one batch self-audit, one verification summary, and one final
      canonical project-gate run after every row has proof.
- [ ] Stops non-destructively when coupling appears, preserves valid evidence,
      updates the specification and baseline for remaining work, then reroutes
      instead of continuing the batch by inertia.

## Anti-Behaviors

- [ ] Agent omits or combines any labeled case outcome.
- [ ] Agent batches a single fix, six fixes, unrelated fixes, or any Boundary,
      Policy, or Production-sensitive case.
- [ ] Agent omits the durable batch spec, a per-fix binary acceptance row, RED,
      per-row proof, or the final canonical gates.
- [ ] Agent treats Debugging as conditional for an eligible Small Batch.
- [ ] Agent applies Workspace Isolation regardless of checkout state or skips it
      for the dirty shared checkout.
- [ ] Agent continues the batch after unexpected coupling without re-specifying,
      re-baselining, and rerouting.

## Quality Criteria

- [ ] Every labeled trigger has its own explicit, checkable route outcome.
- [ ] The eligibility decision is objective and the two/five bounds are explicit.
- [ ] The answer amortizes only repeated route/spec/audit/final-gate ceremony,
      not behavior-level acceptance evidence or safety routes.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors.

## Baseline Comparison

Without the Small Batch modifier, an agent either repeats a full workflow for
every small fix or groups work without a bounded eligibility test, durable matrix,
or escalation path. This scenario distinguishes constrained amortization from
both behaviors.
