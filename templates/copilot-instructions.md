# <!-- FILL IN: project name -->

<!--
This file is a GitHub Copilot instruction template adapted from agent-directives.
Replace every <!-- FILL IN: ... --> placeholder with project-specific content.
Delete this comment block when done.
-->

## Five non-negotiables

- Surface assumptions before building. Wrong assumptions held silently are the most common failure mode.
- Stop and ask when requirements conflict. Don’t guess.
- Push back when warranted. The agent (or engineer) is not a yes-machine.
- Prefer the boring, obvious solution. Cleverness is expensive.
- Touch only what you’re asked to touch.

## What This Project Is

<!-- FILL IN: one-paragraph description of the project and its purpose -->

## Key Rules

These rules are routed by `.agents/directives/adaptive-routing.md`. Load that directive
first, then load the corresponding detailed directive from `.agents/directives/`.

### Specification First

For every implementation or behavior-changing task, create or identify the
durable written specification before types, tests, or implementation. Spec depth
may scale with task size, but spec presence must not be skipped.

### Types First

Define types before writing any implementation code. Run the project's type-check
before proceeding to tests.

### Strict TDD

Follow the RED/GREEN/REFACTOR cycle for behavior-changing code:

1. Write ONE failing test → confirm it fails
2. Write minimum code to pass → confirm ALL tests pass
3. Clean up if needed → confirm all tests still pass
4. Repeat for each behavior — do not batch

**Never** write behavior-changing implementation before a durable specification
and a failing test exist.

### No Skipping Steps

Do not skip REFACTOR or VERIFY phases. Do not batch multiple behaviors into
one commit. Each behavior gets its own test-commit + implementation-commit pair.

## Commands

| Command | Purpose |
| ------- | ------- |
| <!-- FILL IN: build command --> | <!-- FILL IN: build purpose --> |
| <!-- FILL IN: test command --> | <!-- FILL IN: test purpose --> |
| <!-- FILL IN: lint command --> | <!-- FILL IN: lint purpose --> |
| <!-- FILL IN: format command (optional) --> | <!-- FILL IN: format purpose (optional) --> |

## Mandatory Workflow

**Load `.agents/directives/adaptive-routing.md` first.**

The root file provides project-specific context plus compact routing pointers: commands, repo layout, local constraints, and any client-specific workflow reminders.

Workflow path selection, directive loading, skill loading, rule selection, and evidence requirements live in `.agents/directives/adaptive-routing.md`.
For ambiguous, composite, or high-risk routes, load its synced lazy companion at
`.agents/directives/references/adaptive-routing-detail.md`; obvious Light,
Review, and Exploration tasks do not preload it.

After routing, report:
`Route: <path>; using <directive/skill files>; rules: <rule files or none>; evidence: <checks>.`

## Forbidden

- `any` type or implicit `any`
- `it.skip()` in tests
- Fake assertions (`expect(true).toBe(true)`)
- Writing behavior-changing implementation before a durable specification exists
- Writing behavior-changing implementation before a failing test exists
- Batching multiple behaviors into one commit

## Directives

For detailed guidance on each workflow rule, load `.agents/directives/adaptive-routing.md` first,
then load only the selected directive:

- `.agents/directives/adaptive-routing.md` — Selects workflow path and required directives/skills
- `.agents/directives/agent-permissions.md` — Defines agent read/write/command/network permission boundaries and escalation behavior
- `.agents/directives/workspace-isolation.md` — Protect mutable work with an isolated workspace; prefer native tools, then git fallback
- `.agents/directives/codebase-navigation.md` — SAFE exploration pattern
- `.agents/directives/architecture-boundaries.md` — Preserve dependency DAG and import rules
- `.agents/directives/exploration-mode.md` — Pre-implementation investigation stance
- `.agents/directives/task-framing.md` — Intake checklist that hands off to specification-driven development
- `.agents/directives/specification-driven-development.md` — Create or identify durable specs before implementation, verify after
- `.agents/directives/type-driven-development.md` — Types before implementation
- `.agents/directives/test-driven-development.md` — RED/GREEN/REFACTOR cycle
- `.agents/directives/verification.md` — Evidence of correctness before GATES
- `.agents/directives/error-memory.md` — Persistent memory for repeated mistakes
- `.agents/directives/context-handoff.md` — Compact current task state at phase/session boundaries
- `.agents/directives/session-decisions.md` — Durable decision capture

## Skills

Load the relevant skill selected by adaptive routing for the task type.

- `.agents/skills/code-reviewer/SKILL.md` — Before reviewing PRs, branches, diffs, or local changes
- `.agents/skills/adversarial-reviewer/SKILL.md` — Before explicit adversarial/red-team/failure-mode review or high-risk, broad, or agent-authored changes needing a separate skeptical reviewer
- `.agents/skills/test-reviewer/SKILL.md` — Before writing or reviewing any test
- `.agents/skills/spec-reviewer/SKILL.md` — Before merging when a written spec exists
- `.agents/skills/product-requirements-writer/SKILL.md` — Before turning a feature idea or vague requirement into a PRD/spec
- `.agents/skills/implementation-task-planner/SKILL.md` — Before turning a PRD, issue, or acceptance criteria into implementation tasks
- `.agents/skills/subagent-driven-development/SKILL.md` — Before executing an existing implementation plan through delegated subagents or isolated worker sessions
- `.agents/skills/self-audit/SKILL.md` — After REFACTOR, before VERIFY on every Full Path cycle
- `.agents/skills/systematic-debugging/SKILL.md` — Before fixing bugs, failing tests, CI failures, or regressions
- `.agents/skills/architecture-boundary-reviewer/SKILL.md` — Before merging changes to imports, exports, packages, services, shared code, or folder boundaries
- `.agents/skills/codebase-health-reviewer/SKILL.md` — Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes
- `.agents/skills/production-readiness-reviewer/SKILL.md` — Before merging/reviewing production-sensitive changes: persistence, external services, async jobs, auth/security/privacy, infra/config/deploy, critical user paths, performance/scale, or cross-service compatibility
- `.agents/skills/harness-hooks-reviewer/SKILL.md` — Before adding/reviewing agent harness hooks, start/stop hooks, pre-action hooks, or deterministic agent automation
- `.agents/skills/mcp-integration-reviewer/SKILL.md` — Before adding/reviewing MCP servers/tools, agent tool schemas, internal API bridges, or write-capable agent tools

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
