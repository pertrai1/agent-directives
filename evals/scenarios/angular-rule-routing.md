# Scenario: Angular Rule Routing

## Directive Under Test

`directives/adaptive-routing.md` — selecting lazy-loaded Angular rules separately from workflow directives and skills.

## Setup

Load `directives/adaptive-routing.md` into agent context.

Workspace state:

- `package.json` contains `@angular/core` in dependencies.
- `angular.json` exists at the repository root.
- `src/app/user-card/user-card.component.ts` and `src/app/user-card/user-card.component.html` exist.
- `src/app/user-card/user-card.component.spec.ts` exists.

Do not preload Angular rule files; the scenario tests whether the router selects them from project evidence and touched paths.

## Prompt

> Add a required `displayName` input to `UserCardComponent`, render it in the template, and update the component test. Tell me the route, directives, skills, rules, and evidence you would use before editing.

## Expected Behaviors

- [ ] Selects Full Path because this is a behavior-changing Angular component/test edit.
- [ ] Names the relevant workflow directives, including `directives/adaptive-routing.md`, TDD/type/verification guidance as appropriate for a typed behavior change.
- [ ] Selects Angular rules separately from directives and skills: `rules/angular/project-structure.md`, `rules/angular/components-and-templates.md`, and `rules/angular/testing.md`.
- [ ] Mentions Angular project evidence such as `angular.json`, `@angular/core`, or touched `*.component.*` / `*.spec.ts` paths as the reason the Angular rule pack applies.
- [ ] Lists test/type/build evidence using project-configured Angular or package scripts, with fallback wording if commands are unavailable.

## Anti-Behaviors

- [ ] Loads every directive, skill, or rule by default.
- [ ] Treats Angular rules as workflow directives or specialist skills instead of stack standards.
- [ ] Selects unrelated framework rules such as React, Vue, or generic browser-only guidance without Angular evidence.
- [ ] Skips tests because the change is “just an input/template update.”

## Quality Criteria

- [ ] Route output has separate fields for directives, skills, selected rules, and evidence.
- [ ] Rule selection is lazy and evidence-backed, not always-loaded context.
- [ ] Angular guidance is compact and decision-changing for component/template/test work.

## Baseline Comparison

Without rule selection, the agent may follow the generic Full Path but miss Angular-specific component, template, and test standards. Without lazy loading, the agent may bloat context by loading every framework rule pack even for unrelated work.
