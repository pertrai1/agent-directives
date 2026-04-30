# <!-- FILL IN: project name -->

<!--
This file is an agent instruction template adapted from agent-directives.
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

**Load `directives/adaptive-routing.md` first.** It selects the lightest safe workflow, required directives/skills, and whether `directives/context-handoff.md` is needed. After routing, briefly state the selected path and directive/skill files being used; one sentence is enough for tiny low-risk edits. Do not load every directive by default.

**Code changes follow one of these routed sequences:**

### Light Path

Use for low-risk, non-behavioral changes: typo fixes, docs-only changes,
formatting-only changes, comments, or mechanical edits with no behavior change.
Do not use for bug fixes, behavior changes, public API changes, or dependency changes.

| Step | Phase        | Action                         | Verify                                                |
| ---- | ------------ | ------------------------------ | ----------------------------------------------------- |
| 0    | **BASELINE** | Verify starting state is clean | <!-- FILL IN: baseline verification command --> passes |
| 1    | FIX          | Make the change                | Affected test passes (or no test needed for docs)     |
| 2    | GATES        | Run quality gates              | <!-- FILL IN: gates commands --> pass                 |
| 3    | COMMIT       | Atomic commit                  | One change per commit                                 |

### Full Path

Use for: everything else — new features, bug fixes, refactors, behavior changes, public API changes, dependency changes, or type changes.

No skipping steps:

| Step | Phase        | Action                                   | Verify                                                                       |
| ---- | ------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| -1   | **ORIENT**   | **Navigate codebase safely**             | See `directives/codebase-navigation.md` (SAFE pattern)                       |
| -0.5 | **BOUNDARIES** | **Classify touched files and dependency edges** | See `directives/architecture-boundaries.md` when imports/exports/packages/shared code may change |
| 0    | **BASELINE** | **Verify starting state is clean**       | <!-- FILL IN: baseline verification command --> all pass                      |
| 1    | TYPES        | Define types first                       | Type-check passes                                                            |
| 2    | RED          | Write ONE failing test                   | Test fails                                                                   |
| 3    | GREEN        | Write minimum code to pass               | New test passes, all existing tests still pass, type-check passes             |
| 4    | REFACTOR     | Clean up if needed                       | All tests still pass                                                         |
| 4.5  | **SELF-AUDIT** | **Triage weakest assumptions and anomalies** | See `skills/self-audit/SKILL.md` — route findings: 🔁 fix → step 2, 📋 document, or 🧑 ask human |
| 4.75 | **VERIFY**   | **Produce verification summary**         | See `directives/verification.md` for protocol — target 📋 documented Jenga entries |
| 5    | GATES        | Run quality gates                        | <!-- FILL IN: gates commands -->                                             |
| 5.5  | **HANDOFF**  | **Compact current task state when routed** | See `directives/context-handoff.md` for phase/session handoff |
| 6    | COMMIT       | Atomic commit                            | One behavior per commit                                                      |

Steps 2–6 repeat for each behavior. Do not batch.

## Directives (Routed)

Run adaptive routing first, then load the directives selected for the task phase.
They govern **how** you work. Do not load unrelated directives just to satisfy ceremony.

| Directive                    | What it governs                             | File                                         |
| ---------------------------- | ------------------------------------------- | -------------------------------------------- |
| Adaptive Routing             | Selects workflow path and required directives/skills | `directives/adaptive-routing.md`             |
| Codebase Navigation          | SAFE exploration before implementation      | `directives/codebase-navigation.md`          |
| Architecture Boundaries      | Preserve dependency DAG and import rules    | `directives/architecture-boundaries.md`      |
| Exploration Mode             | Pre-implementation investigation stance     | `directives/exploration-mode.md`             |
| Task Framing                 | Intake checklist for non-trivial work       | `directives/task-framing.md`                 |
| Specification-Driven Dev     | Write specs before code, verify after       | `directives/specification-driven-development.md` |
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
| Test Reviewer | Before writing or reviewing any test           | `skills/test-reviewer/SKILL.md`  |
| Spec Reviewer | Before merging when a written spec exists      | `skills/spec-reviewer/SKILL.md`  |
| Self-Audit    | After REFACTOR, before VERIFY (every Full Path cycle) | `skills/self-audit/SKILL.md` |
| Systematic Debugging | Before fixing bugs, failing tests, CI failures, or regressions | `skills/systematic-debugging/SKILL.md` |
| Architecture Boundary Reviewer | Before merging changes to imports, exports, packages, services, shared code, or folder boundaries | `skills/architecture-boundary-reviewer/SKILL.md` |
| Codebase Health Reviewer | Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes | `skills/codebase-health-reviewer/SKILL.md` |

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, or cross-cutting task, load and
follow `directives/task-framing.md`. This directive defines the minimum framing
checklist, when a proposal must precede implementation, and which supporting
docs are supplemental rather than binding.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
