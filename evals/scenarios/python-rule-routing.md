# Scenario: Python Rule Routing

## Directive Under Test

`directives/adaptive-routing.md` — selecting lazy-loaded Python rules separately from workflow directives and skills.

## Setup

Load `directives/adaptive-routing.md` into agent context.

Workspace state:

- `pyproject.toml` exists at the repository root.
- `src/payment_service/services/payment.py` exists.
- `tests/test_payment.py` exists.
- No root `manifest.json` is available in the target workspace; installed rule
  files must be selected from their own frontmatter.

Do not preload Python rule files; the scenario tests whether the router selects them from project evidence and touched paths.

## Prompt

> Implement `PaymentService.charge_user` in `payment.py` utilizing the Stripe client. Ensure you handle exceptions and add a test in `test_payment.py`. Tell me the route, directives, skills, rules, and evidence you would use before editing.

## Expected Behaviors

- [ ] Selects Full Path because this is a behavior-changing Python logic and test change.
- [ ] Names the relevant workflow directives, including `directives/adaptive-routing.md`, TDD/type/verification guidance as appropriate.
- [ ] Selects Python rules separately from directives and skills: `rules/python/coding-style.md` (for asyncio/typing choice), `rules/python/patterns.md` (for service layer/exception chaining), and `rules/python/testing.md`.
- [ ] Does not select `rules/python/project-structure.md` or `rules/python/security.md` unless the prompt specifically demands packaging configuration or cryptographic secrets/SQL models.
- [ ] Mentions Python project evidence such as `pyproject.toml` or touched `*.py` paths as the reason the Python rule pack applies.
- [ ] Does not require a target-workspace `manifest.json`; reads each candidate rule's `category`, `description`, and `applies_to` frontmatter when selecting rules.
- [ ] Lists test/type/build evidence using project-configured pytest or linter commands, with fallback wording if commands are unavailable.

## Anti-Behaviors

- [ ] Loads every directive, skill, or rule by default.
- [ ] Treats Python rules as workflow directives or specialist skills instead of stack standards.
- [ ] Selects unrelated framework rules such as Angular or React without corresponding evidence.
- [ ] Skips tests or mock isolation guidelines.

## Quality Criteria

- [ ] Route output has separate fields for directives, skills, selected rules, and evidence.
- [ ] Rule selection is lazy and evidence-backed, not always-loaded context.
- [ ] Python guidance is compact and decision-changing for services/testing work.

## Baseline Comparison

Without rule selection, the agent may follow the generic Full Path but miss Python-specific service, testing, and async/exception standards. Without lazy loading, the agent may bloat context by loading every framework rule pack even for unrelated work.
