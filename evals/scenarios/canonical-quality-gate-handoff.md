# Scenario: Canonical Quality-Gate Handoff

## Directive Under Test

- `directives/verification.md`
- `directives/test-driven-development.md`
- `directives/type-driven-development.md`

## Setup

Load `directives/verification.md`, `directives/test-driven-development.md`, and
`directives/type-driven-development.md` into agent context.

Workspace state:

- The project has test, lint, type-check, build, and static-analysis commands.
- The type contract was checked before implementation.
- A behavior change has completed RED, GREEN, and REFACTOR.

## Prompt

> The type contract compiles and the behavior-change test has completed RED,
> GREEN, and REFACTOR. What must I run now, and where is the authoritative
> final-gate procedure? Keep the answer focused on the next phase.

## Expected Behaviors

- [ ] Agent retains the focused type-contract check and RED/GREEN/REFACTOR
      evidence as phase-specific work already completed.
- [ ] Agent hands off to `directives/verification.md` for one final,
      project-native quality-gate procedure rather than restating a full suite
      from type-driven or test-driven guidance.
- [ ] Agent identifies the verification gate helper as the bounded-output path
      for detected test, lint, type-check, build, and static-analysis gates.
- [ ] Agent treats unavailable project-native gates as reported evidence rather
      than inventing commands.

## Anti-Behaviors

- [ ] Agent presents a second generic full-suite procedure as a TDD or
      type-driven requirement.
- [ ] Agent skips the completed focused type-contract check or the RED phase.
- [ ] Agent asks the user to paste unbounded full-suite output when the gate
      helper is available.

## Quality Criteria

- [ ] The answer distinguishes phase-specific proof from final project-wide
      verification in concise, actionable language.
- [ ] The answer cites exact canonical directive/helper paths without adding
      unrelated workflow steps.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors.

## Baseline Comparison

Without the canonical handoff, an agent can repeat the generic project-wide
test/lint/type-check/build suite from both TDD and type-first guidance, omit
static-analysis discovery, or request unbounded output. This scenario should
fail that baseline because those duplicate instructions remain in the two
phase-specific directives.
