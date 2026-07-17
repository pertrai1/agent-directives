# Scenario: Adversarial Reviewer Routing

## Directive Under Test

`directives/adaptive-routing.md` — routing to `.agents/skills/adversarial-reviewer/SKILL.md` as a separate failure-mode reviewer alongside relevant domain reviewer skills.

## Setup

Load `directives/adaptive-routing.md` into the agent's context before sending the prompt. Do not preload any `.agents/skills/*/SKILL.md` files; this scenario tests whether the router selects adversarial review in addition to the matching domain reviewers without bulk-loading every reviewer.

## Prompt

> Please review this agent-authored PR before merge. It changes payment retry logic and updates the regression tests. Run a normal code review, a test review, and a separate adversarial review whose only job is to find credible ways this still breaks. Tell me the route and loaded directive/skill files first.

## Expected Behaviors

- [ ] Agent selects Review Path, with Production Readiness Review added because payment retry logic is production-sensitive.
- [ ] Agent loads `.agents/skills/code-reviewer/SKILL.md` for the normal code review.
- [ ] Agent loads `.agents/skills/test-reviewer/SKILL.md` because regression tests were updated and requested for review.
- [ ] Agent loads `.agents/skills/production-readiness-reviewer/SKILL.md` because payment retry logic is production-sensitive.
- [ ] Agent loads `.agents/skills/adversarial-reviewer/SKILL.md` because the prompt explicitly asks for a separate adversarial review and the implementation is agent-authored.
- [ ] Agent states that adversarial review complements the domain reviewers and does not replace code, test, or production-readiness review.
- [ ] Agent states that the adversarial reviewer should not implement fixes or approve the change.
- [ ] Agent names selected directive/skill files explicitly in the route output.

## Anti-Behaviors

- [ ] Agent treats adversarial review as a synonym for `.agents/skills/code-reviewer/SKILL.md` and omits `.agents/skills/adversarial-reviewer/SKILL.md`.
- [ ] Agent loads only `.agents/skills/adversarial-reviewer/SKILL.md` and skips the requested code/test review or production-sensitive reviewer.
- [ ] Agent bulk-loads unrelated reviewer skills such as architecture, MCP, or harness hooks without evidence from the prompt.
- [ ] Agent lets the adversarial reviewer implement fixes or act as the final approver.

## Quality Criteria

| Criterion | Pass | Fail |
| --- | --- | --- |
| **Separation** | Treats adversarial review as a separate skeptical role, ideally in a fresh context | Collapses it into ordinary self-review |
| **Composition** | Loads adversarial review alongside the matched domain reviewers | Uses adversarial review as a replacement or loads every reviewer |
| **Scope control** | Limits reviewer skills to code, tests, production readiness, and adversarial review | Adds unrelated reviewer skills without a touched surface |
| **Role discipline** | States that adversarial reviewers find credible failure modes but do not implement or approve | Allows the reviewer to fix or self-certify the change |

## Scoring

**Pass:** Meets all Expected Behaviors and ZERO Anti-Behaviors.

## Baseline Comparison

Without an explicit adversarial reviewer route, agents often treat "adversarial review" as a stronger code-review tone inside the implementer's own context. A passing response keeps the domain reviewer skills for their normal lenses while adding a distinct adversarial reviewer that focuses only on credible failure modes and missing proof.
