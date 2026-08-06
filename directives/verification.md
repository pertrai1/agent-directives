---
name: verification
description: Requires structured evidence of correctness before quality gates and pull requests.
version: 1.7.0
scripts:
  - scripts/gates.sh
required: true
category: workflow
tools:
  - claude
  - copilot
  - codex
  - cursor
triggers:
  - verification
  - pre-pr
  - quality-gates
  - implementation-complete
routing:
  load: conditional
verification: '{"commands":[{"name":"Git Short Status","run":"git status --short"},{"name":"Git Diff Check","run":"git diff --check"},{"name":"Typecheck","run":"npm run typecheck","files":["src/**/*.ts","tsconfig.json","tsconfig.build.json"]},{"name":"ESLint Linting","run":"npm run lint","files":["src/**/*.ts","*.js"]}]}'
---

# Verification Protocol

**When to load:** After REFACTOR and before final GATES.

Do not claim completion or open a PR until the verification report and the
remaining human/agent judgment fields are complete.

## Command-First Evidence

When the installed CLI is available, run:

```bash
agent-directives verification-report --format text --max-output-lines 150
```

Use `--format json` for machine consumption. The command discovers installed
verification gates, matches file filters to current changes, executes applicable
gates, sorts changed paths/results, bounds excerpts, and leaves mechanically
unavailable fields explicitly `unverified`.

Exit classes are stable:

- `0`: executed gates passed and no blocking finding was supplied;
- `1`: an executed gate failed or a blocking verification finding exists;
- `2`: options, repository evidence, or required execution evidence is invalid
  or incomplete.

Exit `0` does not turn `unverified` functional, integration, documentation, or
scope claims into passes. Complete those fields from direct evidence.

### Compact Fallback

If the CLI is unavailable, run `.agents/directives/scripts/gates.sh` when
installed. Otherwise use only project-documented test, lint, type-check, build,
and static-analysis commands. Keep successful output to one line per command and
retain only the actionable tail of failures. Never invent a missing gate.

## Required Judgment After the Report

For each applicable area, add concise evidence:

### Functional

- **Hit:** an input/scenario that produces the intended behavior.
- **Clean pass:** an input/scenario that must remain unaffected.

For a bug fix, name the previously failing test, summarize the logic change, and
show the relevant regression suite passing.

### Tests

Name the passing cases that matter: happy path, failure path, edge/boundary
values, and suggestion/fix output when applicable. A command exit alone is not a
test-case inventory.

### Integration

Confirm registration/export, configuration/module wiring, public API shape, and
actionable errors. Use `[x]` only for facts you inspected.

### Architecture Boundaries

When imports, exports, packages, file layout, shared code, or dependency edges
changed, include the `architecture-boundaries` evidence and reviewer verdict.

### Documentation

State whether public usage, API docs, README, migrations, or operator guidance
changed. Mark non-applicable areas as such; do not silently omit them.

### Scope Control

Quote the planned scope budget, list changed files, explain justified expansion,
and confirm no unrelated cleanup, abstraction, dependency, or configuration was
added.

### Unverified Areas

List every important unchecked area with its risk justification. Unverified is a
visible state, not a euphemism for pass.

For generators, CLIs, and MCP work, include one visible manual acceptance check.

## Small Batch and Long-Running Work

For an explicitly routed Small Batch, include the batch-spec path and one binary
proof row per behavior. Show the whole matrix RED before implementation and each
row GREEN before the single final report/gate run.

For long-running work, checkpoint against the specification before changes grow
beyond one refactor cycle. Every in-flight progress claim must map to a tool
result from the current session.

## Durable Output

Put the final report in the PR body under `## Verification`, in
`.agents/verification.md` for autonomous work, or in the user response for an
interactive session. Include:

- exact commands and concise outputs;
- changed files;
- tests added/updated;
- hit and clean behavior proof;
- integration, boundary, docs, and scope evidence;
- known gaps and risk justification.

Do not commit local verification state unless requested. A PR should not be
opened while required evidence is missing.

## Quality-Gate Rules

Fix the pattern a linter/static-analysis finding identifies. Do not suppress the
rule, weaken configuration, or perform cosmetic rewrites unless the project
explicitly permits the exception and the reason is documented. Separate
pre-existing debt from regressions introduced by the current change.

In autonomous operation, complete reversible in-scope verification before
ending. Do not finish with a promise to run checks later; stop only when complete
or blocked on authority/input only the user can provide.

## Forbidden Patterns

| Pattern | Why forbidden |
| --- | --- |
| Treating report exit `0` as complete verification | Judgment fields may remain unverified |
| “Tests pass, ship it” | Tests do not prove integration, boundaries, docs, or scope |
| Claiming checks without output | Evidence must be inspectable |
| Running only generic gates before phase-specific proof | Gates cannot replace behavior evidence |
| Hiding skipped checks or pre-existing failures | Distorts risk |
| Reporting progress without current tool evidence | Converts plans into false claims |
| Ending autonomous work with an unfinished plan | Work must be completed or genuinely blocked |

The command owns deterministic execution and report scaffolding. This directive
owns proof quality, interpretation, risk judgment, and delivery readiness.
