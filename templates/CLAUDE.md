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

**All code changes follow one of these sequences:**

### Light Path

Use when: ≤2 files changed, no new exports, no type changes, no logic changes.
Typical: typo fixes, one-line bug fixes, docs-only changes.

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

Load the relevant directive from the `directives/` directory before each task.

- **Codebase Navigation** — SAFE exploration pattern before implementation (`directives/codebase-navigation.md`)
- **Exploration Mode** — Pre-implementation investigation and thinking stance (`directives/exploration-mode.md`)
- **Task Framing** — Intake checklist for non-trivial work (`directives/task-framing.md`)
- **Specification-Driven Development** — Write specs before code, implement against specs, verify after (`directives/specification-driven-development.md`)
- **Type-First Development** — Define types before writing implementation code (`directives/type-driven-development.md`)
- **Test-Driven Development** — Strict RED/GREEN/REFACTOR cycle for all code changes (`directives/test-driven-development.md`)
- **Verification Protocol** — Structured evidence of correctness before GATES (`directives/verification.md`)
- **Error Memory** — Persistent memory for repeated mistakes (`directives/error-memory.md`)
- **Session Decisions** — Durable decision capture at task completion (`directives/session-decisions.md`)

## Skills

Load the relevant skill for the task type.

- **Test Reviewer** — Before writing or reviewing any test (`skills/test-reviewer/SKILL.md`)
- **Spec Reviewer** — Before merging when a written spec exists (`skills/spec-reviewer/SKILL.md`)
- **Self-Audit** — After REFACTOR, before VERIFY on every Full Path cycle (`skills/self-audit/SKILL.md`)
- **Systematic Debugging** — Before fixing bugs, failing tests, CI failures, or regressions (`skills/systematic-debugging/SKILL.md`)

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, or cross-cutting task, load and
follow the task-framing directive. It defines the minimum framing checklist,
when a proposal must precede implementation, and which supporting docs are
supplemental rather than binding.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
