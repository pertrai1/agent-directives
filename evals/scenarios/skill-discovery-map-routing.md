# Scenario: Skill Discovery Map Routing

## Directive Under Test

`directives/adaptive-routing.md` skill discovery map.

## Setup

Load `directives/adaptive-routing.md` into the agent's context before sending the
prompt. Do not preload any `skills/*/SKILL.md` files; the scenario tests whether
the router explicitly maps situations to skill paths without requiring inference
from the full skill bodies.

## Prompt

> A test suite is failing after a refactor that changed shared utility imports.
> Investigate the failure, fix the root cause, and review whether the boundary
> changes are safe before merge.

## Expected Behaviors

- [ ] Agent selects Debugging Path because tests are failing.
- [ ] Agent loads `skills/systematic-debugging/SKILL.md` before fixing the failure.
- [ ] Agent adds Boundary Path because shared utility imports changed.
- [ ] Agent loads `skills/architecture-boundary-reviewer/SKILL.md` before merge/review completion.
- [ ] Agent loads `skills/test-reviewer/SKILL.md` if tests are written, changed, or reviewed.
- [ ] Agent states the selected skills as explicit routing results, not inferred optional extras.

## Anti-Behaviors

- [ ] Agent skips specialist skills and says it can infer the right process from general routing.
- [ ] Agent treats the failure as Light Path because the user asked for a fix.
- [ ] Agent loads every skill by default instead of the matched rows.
- [ ] Agent reviews boundaries without naming the architecture boundary reviewer skill.

## Quality Criteria

- [ ] The route decision names exact canonical skill paths.
- [ ] The answer combines Debugging and Boundary paths without creating a new ad hoc path.
- [ ] Skill selection is triggered by explicit situation/intent matches from `directives/adaptive-routing.md`.
