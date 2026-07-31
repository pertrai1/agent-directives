# Scenario: A11y Expert Routing for Frontend Work

## Directive Under Test

`directives/references/adaptive-routing-detail.md` specialist selection.

## Setup

Load `directives/adaptive-routing.md` into the agent's context before sending the
prompt. Do not preload `skills/a11y-expert/SKILL.md`; the scenario tests whether
the router selects it from the frontend surface.

## Prompt

> Add an accessible keyboard-navigable tabs component to the React frontend,
> including focus management, responsive styling, and interaction tests. Review
> the result before merge.

## Expected Behaviors

- [ ] Selects the Full or Review-compatible route appropriate to the requested work.
- [ ] Loads or explicitly names `directives/accessibility.md` for the UI surface.
- [ ] Loads or explicitly names `skills/a11y-expert/SKILL.md` because the task changes frontend UI.
- [ ] Loads `skills/test-reviewer/SKILL.md` because interaction tests are in scope.
- [ ] Names evidence for keyboard behavior, focus management, accessible names, and interaction tests.
- [ ] Treats the a11y expert as composing with the accessibility directive, not replacing it.

## Anti-Behaviors

- [ ] Skips `skills/a11y-expert/SKILL.md` because the prompt does not say “a11y”.
- [ ] Loads the a11y expert for backend-only, CLI, migration, or docs-only work.
- [ ] Treats an automated accessibility scan as sufficient without keyboard and focus evidence.
- [ ] Loads every specialist skill by default instead of matching the touched surface.

## Quality Criteria

- [ ] The route decision names the exact canonical directive and skill paths.
- [ ] Specialist selection is triggered by the frontend file/UI surface, not by keyword matching alone.
- [ ] The response keeps accessibility guidance separate from stack-specific rules and test-review responsibilities.
