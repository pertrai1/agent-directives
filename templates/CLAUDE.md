# <!-- FILL IN: project name -->

<!--
This file is a Claude Code instruction template adapted from agent-directives.
Replace every <!-- FILL IN: ... --> placeholder with project-specific content.
Delete this comment block when done.
-->

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

**Load `directives/adaptive-routing.md` first.** It selects the lightest safe workflow and the required directives/skills for the task. Do not load every directive by default.

**Code changes follow one of these routed sequences:**

### Light Path

Use when: ≤2 files changed, no new exports, no type changes, no logic changes.
Typical: typo fixes, docs-only changes, formatting-only changes, or mechanical
edits with no behavior change.

| Step | Phase        | Action                         | Verify                                                |
| ---- | ------------ | ------------------------------ | ----------------------------------------------------- |
| 0    | **BASELINE** | Verify starting state is clean | <!-- FILL IN: baseline verification command --> passes |
| 1    | FIX          | Make the change                | Affected test passes (or no test needed for docs)     |
| 2    | GATES        | Run quality gates              | <!-- FILL IN: gates commands --> pass                 |
| 3    | COMMIT       | Atomic commit                  | One change per commit                                 |

### Full Path

Use for: everything else — new features, refactors, multi-file changes, type changes.

No skipping steps:

| Step | Phase        | Action                                   | Verify                                                                       |
| ---- | ------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| -1   | **ORIENT**   | **Navigate codebase safely**             | See codebase-navigation directive (SAFE pattern)                              |
| -0.5 | **BOUNDARIES** | **Classify touched files and dependency edges** | See architecture-boundaries directive when imports/exports/packages/shared code may change |
| 0    | **BASELINE** | **Verify starting state is clean**       | <!-- FILL IN: baseline verification command --> all pass                      |
| 1    | TYPES        | Define types first                       | Type-check passes                                                            |
| 2    | RED          | Write ONE failing test                   | Test fails                                                                   |
| 3    | GREEN        | Write minimum code to pass               | New test passes, all existing tests still pass, type-check passes             |
| 4    | REFACTOR     | Clean up if needed                       | All tests still pass                                                         |
| 4.5  | **SELF-AUDIT** | **Triage weakest assumptions and anomalies** | See `skills/self-audit/SKILL.md` — route findings: 🔁 fix → step 2, 📋 document, or 🧑 ask human |
| 4.75 | **VERIFY**   | **Produce verification summary**         | See verification directive — target 📋 documented Jenga entries               |
| 5    | GATES        | Run quality gates                        | <!-- FILL IN: gates commands -->                                             |
| 6    | COMMIT       | Atomic commit                            | One behavior per commit                                                      |

Steps 2–6 repeat for each behavior. Do not batch.

## Directives

Load `directives/adaptive-routing.md` first, then load only the directives it selects for the current task.

- **Adaptive Routing** — Selects workflow path and required directives/skills (`directives/adaptive-routing.md`)
- **Codebase Navigation** — SAFE exploration pattern before implementation (`directives/codebase-navigation.md`)
- **Architecture Boundaries** — Preserve dependency DAG and import rules (`directives/architecture-boundaries.md`)
- **Exploration Mode** — Pre-implementation investigation and thinking stance (`directives/exploration-mode.md`)
- **Task Framing** — Intake checklist for non-trivial work (`directives/task-framing.md`)
- **Specification-Driven Development** — Write specs before code, implement against specs, verify after (`directives/specification-driven-development.md`)
- **Type-First Development** — Define types before writing implementation code (`directives/type-driven-development.md`)
- **Test-Driven Development** — Strict RED/GREEN/REFACTOR cycle for all code changes (`directives/test-driven-development.md`)
- **Verification Protocol** — Structured evidence of correctness before GATES (`directives/verification.md`)
- **Error Memory** — Persistent memory for repeated mistakes (`directives/error-memory.md`)
- **Session Decisions** — Durable decision capture at task completion (`directives/session-decisions.md`)

## Skills

Load the relevant skill selected by adaptive routing for the task type.

- **Test Reviewer** — Before writing or reviewing any test (`skills/test-reviewer/SKILL.md`)
- **Spec Reviewer** — Before merging when a written spec exists (`skills/spec-reviewer/SKILL.md`)
- **Self-Audit** — After REFACTOR, before VERIFY on every Full Path cycle (`skills/self-audit/SKILL.md`)
- **Systematic Debugging** — Before fixing bugs, failing tests, CI failures, or regressions (`skills/systematic-debugging/SKILL.md`)
- **Architecture Boundary Reviewer** — Before merging changes to imports, exports, packages, services, shared code, or folder boundaries (`skills/architecture-boundary-reviewer/SKILL.md`)
- **Codebase Health Reviewer** — Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes (`skills/codebase-health-reviewer/SKILL.md`)

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, or cross-cutting task, load and
follow the task-framing directive. It defines the minimum framing checklist,
when a proposal must precede implementation, and which supporting docs are
supplemental rather than binding.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
