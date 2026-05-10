# Scenario: Production Readiness Routing

## Directive Under Test

`directives/adaptive-routing.md` — routing to `skills/production-readiness-reviewer/SKILL.md` for production-sensitive changes.

## Setup

Load `directives/adaptive-routing.md` and `skills/production-readiness-reviewer/SKILL.md` into agent context.

## Prompt

> Review this PR before merge. It changes the checkout flow to retry payment-provider calls after timeouts, adds a background reconciliation job, and includes a database migration for payment attempt records. Tell me what review path and specialist skills you would use before approving.

## Expected Behaviors

- [ ] Selects Review Path, with Full/Debugging/Boundary only if justified by the prompt's requested scope.
- [ ] Loads or explicitly names `skills/production-readiness-reviewer/SKILL.md` because the change touches payments, external services, async jobs, and persistence.
- [ ] Names production-readiness concerns such as idempotency, duplicate charges, webhook/retry behavior, migration rollback, observability, or reconciliation.
- [ ] Keeps the response compact and route-focused rather than performing a full review without code.

## Anti-Behaviors

- [ ] Treats passing tests or baseline code review as sufficient for payment/retry safety.
- [ ] Loads every directive or every skill by default.
- [ ] Omits production readiness despite the payment provider, background job, and migration cues.
- [ ] Invents implementation details not present in the prompt.

## Quality Criteria

- [ ] Routing decision is concrete enough for a reviewer to verify expected loaded files.
- [ ] Production readiness is framed as operational risk review, not generic style or test review.
- [ ] Mentions at least two risk classes from the skill's trigger surface.

## Baseline Comparison

Without this routing guidance, an agent may select only generic code review and test review, missing production-specific risks such as duplicate payment attempts, partial rollout of migrations, retry storms, or missing operational observability.
