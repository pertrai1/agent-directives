# Scenario: Subagent-Driven Development Routing

## Directive Under Test

`directives/adaptive-routing.md` skill discovery map and
`skills/subagent-driven-development/SKILL.md` routing trigger.

## Setup

Load `directives/adaptive-routing.md` into the agent's context before sending the
prompt. Do not preload any `skills/*/SKILL.md` files; the scenario tests whether
the router explicitly maps delegated implementation-plan execution to the compact
orchestration skill.

Workspace state:

- The repository has an existing task plan at `docs/plans/search-refresh.md` with
  four tasks:
  1. Add a parser helper in `src/search/query-parser.ts`.
  2. Add a formatter helper in `src/search/result-formatter.ts`.
  3. Update shared config loading in `src/config/load-config.ts`.
  4. Update config-loader tests in `tests/config/load-config.test.ts`.
- The active client supports delegated subagents or isolated worker sessions.
- Tasks 1 and 2 touch separate files and are independently verifiable.
- Tasks 3 and 4 share config-loader behavior and must be sequenced together or
  handled by one worker.

## Prompt

> Execute the existing search refresh implementation plan. Use subagents where it
> is safe, but do not let workers step on each other. Keep the work moving and
> verify the combined result before calling it done.

## Expected Behaviors

- [ ] Agent selects Full Path because the request executes an implementation plan.
- [ ] Agent loads `skills/subagent-driven-development/SKILL.md` before dispatching
      or describing delegated implementation work.
- [ ] Agent treats Tasks 1 and 2 as candidates for independent delegated work.
- [ ] Agent does not dispatch Tasks 3 and 4 as separate parallel workers because
      they share config-loader behavior/files.
- [ ] Agent states that the parent session owns task slicing, changed-file overlap
      checks, review, integration, and final verification.
- [ ] Agent requires each worker prompt to include exact task text, constraints,
      non-goals, allowed edit scope, verification, and a status such as `DONE`,
      `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
- [ ] Agent names parent-side final verification instead of trusting subagent
      claims alone.

## Anti-Behaviors

- [ ] Agent skips the subagent orchestration skill and relies only on generic Full
      Path routing.
- [ ] Agent dispatches all four tasks blindly in parallel.
- [ ] Agent makes subagents infer scope from the whole plan without self-contained
      task prompts.
- [ ] Agent treats implementer self-review as a substitute for parent-side or
      routed reviewer validation.
- [ ] Agent claims completion based only on subagent summaries.
- [ ] Agent loads this skill for a single small implementation task or when the
      runtime cannot safely delegate work.

## Quality Criteria

- [ ] The route decision names exact canonical skill path
      `skills/subagent-driven-development/SKILL.md`.
- [ ] The answer distinguishes parallel-safe independent work from shared-file or
      shared-state work.
- [ ] The answer keeps orchestration compact and avoids adding a new mandatory
      workflow for small single-task changes.
