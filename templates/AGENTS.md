# <!-- FILL IN: project name -->

<!--
This file is an agent instruction template adapted from agent-directives.
Replace every <!-- FILL IN: ... --> placeholder with project-specific content.
Delete this comment block when done.
-->

## Five non-negotiables

- Surface assumptions before building. Wrong assumptions held silently are the most common failure mode.
- Stop and ask when requirements conflict. Don’t guess.
- Push back when warranted. The agent (or engineer) is not a yes-machine.
- Prefer the boring, obvious solution. Cleverness is expensive.
- Touch only what you’re asked to touch.

## Why

<!-- FILL IN: one-paragraph description of why this project exists and what it does -->

## What

<!-- FILL IN: technologies, frameworks, build system, key dependencies -->

## Commands

| Command | Purpose |
| ------- | ------- |
| <!-- FILL IN: build command --> | <!-- FILL IN: build purpose --> |
| <!-- FILL IN: test command --> | <!-- FILL IN: test purpose --> |
| <!-- FILL IN: lint command --> | <!-- FILL IN: lint purpose --> |
| <!-- FILL IN: format command (optional) --> | <!-- FILL IN: format purpose (optional) --> |
| <!-- FILL IN: additional command (optional) --> | <!-- FILL IN: additional purpose (optional) --> |

## Mandatory Workflow

**NEVER commit directly to `main`.** Work on a feature branch. No exceptions.

**Load `directives/adaptive-routing.md` first.**

The root file provides project-specific context plus compact routing pointers: commands, repo layout, local constraints, and any client-specific workflow reminders.

Workflow path selection, directive loading, skill loading, rule selection, and evidence requirements live in `directives/adaptive-routing.md`.

After routing, report:
`Route: <path>; using <directive/skill files>; rules: <rule files or none>; evidence: <checks>.`

When adaptive routing selects Full Path or another route that invokes the full
phase sequence, no skipping steps:

| Step | Phase        | Action                                   | Verify                                                                       |
| ---- | ------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| -1   | **ORIENT**   | **Navigate codebase safely**             | See `directives/codebase-navigation.md` (SAFE pattern)                       |
| -0.5 | **BOUNDARIES** | **Classify touched files and dependency edges** | See `directives/architecture-boundaries.md` when imports/exports/packages/shared code may change |
| 0    | **BASELINE** | **Verify starting state is clean**       | <!-- FILL IN: baseline verification command --> all pass                      |
| 0.5  | **SPEC**     | **Create or identify the durable written specification before implementation** | See `directives/specification-driven-development.md`; spec depth may scale, presence must not |
| 1    | TYPES        | Define types first                       | Type-check passes                                                            |
| 2    | RED          | Write ONE failing test                   | Test fails                                                                   |
| 3    | GREEN        | Write minimum code to pass               | New test passes, all existing tests still pass, type-check passes             |
| 4    | REFACTOR     | Clean up if needed                       | All tests still pass                                                         |
| 4.5  | **SELF-AUDIT** | **Triage weakest assumptions and anomalies** | See `skills/self-audit/SKILL.md` — route findings: 🔁 fix → step 2, 📋 document, or 🧑 ask human |
| 4.75 | **VERIFY**   | **Produce verification summary**         | See `directives/verification.md` for protocol — target 📋 documented Jenga entries |
| 5    | GATES        | Run quality gates                        | <!-- FILL IN: gates commands -->                                             |
| 5.5  | **HANDOFF**  | **Compact current task state when routed** | See `directives/context-handoff.md` for phase/session handoff |
| 6    | COMMIT       | Atomic commit                            | One behavior per commit                                                      |

Steps 0.5-6 repeat for each behavior-changing slice. Do not batch.

## Directives (Routed)

Run adaptive routing first, then load the directives selected for the task phase.
They govern **how** you work. Do not load unrelated directives just to satisfy ceremony.

| Directive                    | What it governs                             | File                                         |
| ---------------------------- | ------------------------------------------- | -------------------------------------------- |
| Adaptive Routing             | Selects workflow path and required directives/skills | `directives/adaptive-routing.md`             |
| Agent Permissions            | Defines agent read/write/command/network permission boundaries and escalation behavior | `directives/agent-permissions.md`            |
| Workspace Isolation          | Protect mutable work with an isolated workspace; prefer native tools, then git fallback | `directives/workspace-isolation.md`      |
| Codebase Navigation          | SAFE exploration before implementation      | `directives/codebase-navigation.md`          |
| Architecture Boundaries      | Preserve dependency DAG and import rules    | `directives/architecture-boundaries.md`      |
| Exploration Mode             | Pre-implementation investigation stance     | `directives/exploration-mode.md`             |
| Task Framing                 | Intake checklist that hands off to specification-driven development | `directives/task-framing.md`                 |
| Specification-Driven Dev     | Create or identify durable specs before implementation, verify after | `directives/specification-driven-development.md` |
| Type-First Development       | Types before implementation                 | `directives/type-driven-development.md`      |
| Test-Driven Development      | RED/GREEN/REFACTOR for behavior changes     | `directives/test-driven-development.md`      |
| Verification Protocol        | Evidence of correctness before GATES        | `directives/verification.md`                 |
| Error Memory                 | Persistent memory for repeated mistakes     | `directives/error-memory.md`                 |
| Context Handoff              | Compact current task state at phase/session boundaries | `directives/context-handoff.md`              |
| Session Decisions            | Durable decision capture at task completion | `directives/session-decisions.md`            |

## Skills (Mandatory)

Load the relevant skill selected by adaptive routing before performing any task it covers.

| Skill         | When                                          | File                       |
| ------------- | --------------------------------------------- | -------------------------- |
| Code Reviewer | Before reviewing PRs, branches, diffs, or local changes | `skills/code-reviewer/SKILL.md` |
| Test Reviewer | Before writing or reviewing any test           | `skills/test-reviewer/SKILL.md`  |
| Spec Reviewer | Before merging when a written spec exists      | `skills/spec-reviewer/SKILL.md`  |
| Product Requirements Writer | Before turning a feature idea or vague requirement into a PRD/spec | `skills/product-requirements-writer/SKILL.md` |
| Implementation Task Planner | Before turning a PRD, issue, or acceptance criteria into implementation tasks | `skills/implementation-task-planner/SKILL.md` |
| Subagent-Driven Development | Before executing an existing implementation plan through delegated subagents or isolated worker sessions | `skills/subagent-driven-development/SKILL.md` |
| Self-Audit    | After REFACTOR, before VERIFY (every Full Path cycle) | `skills/self-audit/SKILL.md` |
| Systematic Debugging | Before fixing bugs, failing tests, CI failures, or regressions | `skills/systematic-debugging/SKILL.md` |
| Architecture Boundary Reviewer | Before merging changes to imports, exports, packages, services, shared code, or folder boundaries | `skills/architecture-boundary-reviewer/SKILL.md` |
| Codebase Health Reviewer | Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes | `skills/codebase-health-reviewer/SKILL.md` |
| Production Readiness Reviewer | Before merging/reviewing production-sensitive changes: persistence, external services, async jobs, auth/security/privacy, infra/config/deploy, critical user paths, performance/scale, or cross-service compatibility | `skills/production-readiness-reviewer/SKILL.md` |
| Harness Hooks Reviewer | Before adding/reviewing agent harness hooks, start/stop hooks, pre-action hooks, or deterministic agent automation | `skills/harness-hooks-reviewer/SKILL.md` |
| MCP Integration Reviewer | Before adding/reviewing MCP servers/tools, agent tool schemas, internal API bridges, or write-capable agent tools | `skills/mcp-integration-reviewer/SKILL.md` |

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, or cross-cutting task, load and
follow `directives/task-framing.md`. This directive defines the minimum framing
checklist and hands behavior-changing work to
`directives/specification-driven-development.md` for the required durable
specification before implementation.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
