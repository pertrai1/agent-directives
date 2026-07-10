# Scenario: Compositional Skill Routing

## Directive Under Test

`directives/adaptive-routing.md` composite task routing and skill discovery behavior.

## Setup

Load `directives/adaptive-routing.md` into the agent's context before sending the
prompt. Do not preload any `skills/*/SKILL.md` files; the scenario tests whether
the router decomposes a multi-intent request, selects only the required
specialist skills, and composes the final workflow path.

## Prompt

> CI is failing after a refactor that moved shared utility imports. Please
> investigate and fix the failure, update or add the regression test that should
> catch this import issue next time, and review whether the import boundary is
> safe before merge. Tell me the route and loaded directive/skill files first.

## Expected Behaviors

- [ ] Agent decomposes the request into atomic work items: reproduce/fix the CI
      failure, update regression test coverage, and review the shared-utility
      import boundary before merge.
- [ ] Agent composes Debugging Path plus Boundary Path rather than selecting only
      one path for the whole request.
- [ ] Agent loads `skills/systematic-debugging/SKILL.md` before investigating or
      fixing the failing CI/test.
- [ ] Agent loads `skills/test-reviewer/SKILL.md` because the prompt requires a
      regression test update or addition.
- [ ] Agent loads `skills/architecture-boundary-reviewer/SKILL.md` because moved
      shared utility imports require boundary review.
- [ ] Agent orders the route so reproduction precedes the fix, the regression
      test proves the fix, and boundary review happens before merge readiness.
- [ ] Agent names selected directive/skill files explicitly in the route output.

## Anti-Behaviors

- [ ] Agent treats the prompt as a single generic "fix issue" or "review code"
      task without decomposing it.
- [ ] Agent selects only Debugging Path and misses the boundary review portion.
- [ ] Agent selects only Review/Boundary Path and skips systematic debugging for
      the failing CI/test.
- [ ] Agent loads every reviewer skill or every skill by default instead of the
      matched specialist files.
- [ ] Agent loads near-matches such as `skills/code-reviewer/SKILL.md` or
      `skills/production-readiness-reviewer/SKILL.md` without explaining why the
      prompt requires them.

## Quality Criteria

| Criterion | Pass | Fail |
| --- | --- | --- |
| **Decomposition** | Breaks the prompt into concrete debugging, regression-test, and boundary-review work items | Uses vague buckets such as "fix issue" or "review code" |
| **Skill selection** | Selects the three canonical skills required by the matched intents and avoids unrelated reviewer skills | Omits a required skill or bulk-loads all candidates |
| **Route composition** | Merges Debugging and Boundary paths and orders dependent work before merge review | Picks one path only or performs review before reproducing/fixing |
| **Candidate discipline** | States why near-matches were not loaded when ambiguity matters | Treats all possible matches as required context |
