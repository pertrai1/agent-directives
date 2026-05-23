# Scenario: Code Reviewer - Structural Regression

## Directive Under Test

`skills/code-reviewer/SKILL.md` — Structural Regression heuristic and maintainability approval bar.

## Setup

Load `skills/code-reviewer/SKILL.md` into the agent's context.

This scenario tests whether the reviewer flags maintainability regressions even when the diff appears behaviorally correct.

## Hidden Context

The change passes tests, but it implements a small feature by scattering feature-specific conditionals through a shared billing flow and duplicating an existing helper instead of using the canonical pricing policy.

## Workspace State

*(No mock files needed, code is in the prompt.)*

## Prompt

> Please review this PR diff. The tests pass and the behavior is correct.
>
> ```diff
> diff --git a/src/billing/checkout.ts b/src/billing/checkout.ts
> @@
>  export function buildCheckoutTotal(cart, user) {
> +  if (user.flags?.includes("holidayOverride")) {
> +    return cart.items.reduce((sum, item) => sum + item.price * 0.8, 0);
> +  }
>    return applyPricingPolicy(cart, user);
>  }
>
> diff --git a/src/billing/refunds.ts b/src/billing/refunds.ts
> @@
>  export function refundAmount(order, user) {
> +  if (user.flags?.includes("holidayOverride")) {
> +    return order.items.reduce((sum, item) => sum + item.price * 0.8, 0);
> +  }
>    return applyPricingPolicy(order, user);
>  }
> ```

## Expected Behaviors

- [ ] Agent does not approve solely because tests pass and behavior appears correct.
- [ ] Agent flags the duplicated holiday pricing logic across `checkout.ts` and `refunds.ts` as a structural regression.
- [ ] Agent identifies that feature-specific branching is being scattered through shared billing flows.
- [ ] Agent recommends moving the behavior into the canonical `applyPricingPolicy` owner or an equivalent explicit pricing-policy boundary.
- [ ] Agent frames the finding as material maintainability/merge risk, not a cosmetic nit.

## Anti-Behaviors

- [ ] Agent approves the PR because tests pass.
- [ ] Agent only suggests renaming or formatting the new branches.
- [ ] Agent treats duplicated feature branches in shared billing code as acceptable because the diff is small.
- [ ] Agent recommends adding a third copy of the same conditional elsewhere.

## Quality Criteria

- [ ] Review uses the Structural Regression heuristic or equivalent reasoning.
- [ ] Suggested fix reduces or centralizes complexity instead of merely moving duplicated conditionals around.
- [ ] Response remains concise and focused on material findings.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers zero Anti-Behaviors.

## Baseline Comparison

Without the structural-regression guidance, an agent may over-trust passing tests and miss that the implementation spreads a special-case pricing rule through shared flows. With the guidance, the reviewer should request a cleaner ownership boundary before approval.
