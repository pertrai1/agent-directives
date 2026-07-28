# Scenario: Accessibility Directive Routing

## Directive Under Test

`directives/adaptive-routing.md` — progressively disclosing `directives/accessibility.md` for user-facing UI surfaces without loading it for unrelated backend work.

## Setup

Load `directives/adaptive-routing.md` into agent context. For ambiguous, composite, Full, Review, or Policy routes, load `directives/references/adaptive-routing-detail.md` when the router requires the lazy companion.

Workspace state:

- `src/components/SignupForm.tsx` exists and renders email/password fields, validation errors, and a submit button.
- `src/components/SignupForm.test.tsx` exists and uses Testing Library.
- `src/api/users.ts` exists and contains backend-only JSON request handling.

Do not preload `directives/accessibility.md`; the scenario tests whether the router selects it from touched UI paths and prompt content.

## Prompt

> Add a password visibility toggle to `src/components/SignupForm.tsx`, update the frontend interaction test, and tell me the route, directives, skills, rules, and evidence you would use before editing. Then say whether the same accessibility directive would be loaded for a backend-only edit to `src/api/users.ts` that changes JSON serialization.

## Expected Behaviors

- [ ] Selects Full Path because adding a visibility toggle and updating an interaction test changes user-facing behavior.
- [ ] Loads or explicitly names `directives/accessibility.md` because the touched surface is a form UI component with an interactive control, focus/keyboard behavior, and frontend tests.
- [ ] Loads or explicitly names `skills/test-reviewer/SKILL.md` because the prompt includes frontend interaction test updates.
- [ ] Names relevant accessibility evidence such as accessible name for the toggle, native button semantics, keyboard activation, visible focus, form label/error preservation, and role/name-based test queries.
- [ ] Keeps accessibility as a directive or surface requirement, not a standalone specialist skill unless the prompt asks for an accessibility audit.
- [ ] States that `directives/accessibility.md` should not load for the backend-only JSON serialization edit unless it changes user-facing UI accessibility requirements.
- [ ] Lists final evidence with project-native test/lint/type checks or clear fallback wording if commands are unavailable.

## Anti-Behaviors

- [ ] Skips accessibility because the user did not explicitly say "a11y" or "accessible".
- [ ] Loads `directives/accessibility.md` for every task by default, including the backend-only JSON edit.
- [ ] Treats automated accessibility scans as sufficient without keyboard, focus, or accessible-name evidence.
- [ ] Loads every directive, skill, or rule by default.
- [ ] Performs the implementation before reporting the route and evidence plan requested by the prompt.

## Quality Criteria

- [ ] Route output separates directives, skills, rules, and evidence.
- [ ] Accessibility disclosure is based on touched UI surfaces and interaction behavior, not generic frontend stack detection alone.
- [ ] Non-UI work remains compact and does not receive unrelated accessibility context.

## Baseline Comparison

Without this routing guidance, an agent may implement a working toggle that has no accessible name, drops keyboard/focus behavior, weakens form labels or errors, or writes tests that click implementation details instead of proving user-visible accessibility behavior. Without progressive disclosure, agents may load accessibility guidance for backend-only tasks and waste context.
