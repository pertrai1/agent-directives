# Scenario: Spec-First Efficient Orchestration

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/task-framing.md`
- `directives/specification-driven-development.md`
- `directives/context-handoff.md`
- `skills/subagent-driven-development/SKILL.md`

## Setup

Load `directives/adaptive-routing.md` first. Make the other listed files
available for conditional loading, but do not preload them.

Workspace state:

- `.agents/handoff.md` and `.agents/verification.md` exist.
- `docs/ERRORS.md` contains a relevant entry about repeated config-parser
  regressions.
- A proposed bug fix changes one function in `src/config/parse.ts` and its test.
- A separate cross-cutting workflow change would modify four directive/skill
  files.
- The runtime supports delegated subagents.

## Prompt

> Before editing, route these three tasks and explain the gates you would follow:
>
> 1. Fix one typo in `README.md` with no behavior or metadata effect.
> 2. Fix the config-parser regression described in `docs/ERRORS.md`.
> 3. Implement the cross-cutting workflow change from an existing task plan.
>
> State whether each task needs a durable specification, how task framing and
> specification-driven development compose, what existing state you inspect,
> and whether you would delegate each task.

## Expected Behaviors

- [ ] Agent uses the early decision table to classify Task 1 as Light Path and
      does not process unrelated detailed path guidance.
- [ ] Agent does not require a multi-document implementation specification for
      the non-behavioral typo, but still names proportional diff/gate evidence.
- [ ] Agent routes Task 2 through Debugging + Full and loads
      `directives/specification-driven-development.md` before writing a failing
      test or fix.
- [ ] Agent requires a brief durable expected-behavior/regression specification
      for Task 2; it scales specification depth but never removes the spec.
- [ ] Agent loads `directives/error-memory.md` during orientation and reads the
      relevant `docs/ERRORS.md` entry before changing the config parser.
- [ ] Agent lists `.agents/` and inspects the existing handoff and verification
      state before assuming a clean start.
- [ ] Agent treats `directives/task-framing.md` as intake for Task 3, then uses
      specification-driven development's Propose/Design/Specify phases as the
      single durable contract before implementation.
- [ ] Agent does not create competing task-framing and specification proposals.
- [ ] Agent keeps Task 2 in the parent session because it touches fewer than
      approximately three files and one clear function, absent a specific
      isolation or specialist-review benefit.
- [ ] Agent considers delegation for Task 3 only after the specification and
      task plan exist and only for independently scoped slices.

## Anti-Behaviors

- [ ] Agent reads all detailed workflow paths before selecting an obvious Light
      Path typo task.
- [ ] Agent treats specification-driven development as optional for the bug fix
      because the change is small.
- [ ] Agent writes the failing regression test or implementation before the
      durable regression specification.
- [ ] Agent chooses between task framing and specification-driven development as
      interchangeable proposal systems.
- [ ] Agent assumes clean state without inspecting `.agents/` or ignores the
      relevant error-memory entry.
- [ ] Agent delegates the one-function bug fix solely because subagents are
      available.
- [ ] Agent starts the cross-cutting implementation before Propose, Design, and
      Specify are complete.

## Quality Criteria

- [ ] The response names exact canonical directive/skill paths.
- [ ] The route distinguishes specification presence from proportional
      specification depth.
- [ ] The response preserves a genuinely lightweight path for non-behavioral
      typo work.
- [ ] State discovery and delegation decisions are tied to the concrete
      workspace facts rather than generic ceremony.
