# Agent Directives

## Why

This repository is a portable library of AI coding-agent instructions: reusable directives, specialist skills, eval scenarios, and drop-in templates for tools such as Codex, Claude Code, GitHub Copilot, Cursor, and similar agents. The project exists to make agent behavior more reliable without locking users into a framework.

## What

- Content-first Markdown repository; there is no package manager, build artifact, or runtime application.
- `directives/*.md` define workflow rules an agent follows during phases such as routing, exploration, TDD, verification, and handoff.
- `skills/*/SKILL.md` define specialist personas/review processes with YAML frontmatter metadata.
- `templates/` contains starter instruction files for different agent tools.
- `evals/` contains manual scenario-based evaluations plus a helper script for assembling directive/skill context.

## Commands

| Command | Purpose |
| ------- | ------- |
| `git status --short` | Baseline check before edits and final cleanliness check. |
| `git diff --check` | Detect whitespace errors in changed files. |
| `bash -n evals/run-scenario.sh` | Syntax-check the eval helper script when touched. |
| `evals/run-scenario.sh <scenario-name>` | Manually exercise a directive/skill scenario in a temporary workspace. |
| `python3 - <<'PY' ... PY` | Use small repo-local validation scripts for Markdown frontmatter, routing metadata, or link/path checks when no dedicated validator exists. |

There is no global build/test/lint command for the whole repository today. Choose the smallest evidence that matches the touched files and state when a check is not applicable.

## Mandatory Workflow

**NEVER commit directly to `main`.** Work on a feature branch. No exceptions.

**Load `directives/adaptive-routing.md` first.** It selects the lightest safe workflow, required directives/skills, and whether `directives/context-handoff.md` is needed. Do not load every directive by default.

**Code changes follow one of these routed sequences:**

### Light Path

Use for low-risk, non-behavioral changes: typo fixes, docs-only changes,
formatting-only changes, comments, metadata-only updates, or mechanical edits with
no behavior change. Do not use for bug fixes, behavior changes, public API changes,
dependency changes, routing semantics changes, or eval harness behavior changes.

| Step | Phase | Action | Verify |
| ---- | ----- | ------ | ------ |
| 0 | **BASELINE** | Verify starting state is clean | `git status --short` shows only intended work after branch creation |
| 1 | FIX | Make the change | Review the changed Markdown/frontmatter in context |
| 2 | GATES | Run quality gates | `git diff --check` and any file-specific validation pass |
| 3 | COMMIT | Atomic commit | One coherent directive/skill/template/eval change per commit |

### Full Path

Use for everything else: new directives or skills, behavior-changing edits to
workflow rules, eval harness changes, cross-file refactors, routing metadata
changes, template restructuring, or changes that alter how agents are expected to
behave.

No skipping steps:

| Step | Phase | Action | Verify |
| ---- | ----- | ------ | ------ |
| -1 | **ORIENT** | **Navigate codebase safely** | See `directives/codebase-navigation.md` (SAFE pattern) |
| -0.5 | **BOUNDARIES** | **Classify touched files and dependency edges** | See `directives/architecture-boundaries.md` when file paths, template references, or dependency edges may change |
| 0 | **BASELINE** | **Verify starting state is clean** | `git status --short` and relevant existing scenario/docs inspected |
| 1 | TYPES/METADATA | Define metadata/schema expectations first | Frontmatter/routing metadata shape is known before editing |
| 2 | RED | Identify or create failing evidence when behavior changes | Existing scenario/check fails or a new scenario documents the gap |
| 3 | GREEN | Make the minimum change to satisfy the evidence | Scenario/checklist or validator now passes/reviews cleanly |
| 4 | REFACTOR | Clean up if needed | Markdown remains concise and references stay consistent |
| 4.5 | **SELF-AUDIT** | **Triage weakest assumptions and anomalies** | See `skills/self-audit/SKILL.md` — route findings: 🔁 fix, 📋 document, or 🧑 ask human |
| 4.75 | **VERIFY** | **Produce verification summary** | See `directives/verification.md` for command output and evidence |
| 5 | GATES | Run quality gates | `git diff --check`, plus `bash -n evals/run-scenario.sh` if touched, plus metadata/path validation when relevant |
| 5.5 | **HANDOFF** | **Compact current task state when routed** | See `directives/context-handoff.md` for phase/session handoff |
| 6 | COMMIT | Atomic commit | One behavior or documentation scope per commit |

Steps 2–6 repeat for each behavior. Do not batch unrelated directive or skill changes.

## Directives (Routed)

Run adaptive routing first, then load the directives selected for the task phase.
They govern **how** you work. Do not load unrelated directives just to satisfy ceremony.

| Directive | What it governs | File |
| --------- | --------------- | ---- |
| Adaptive Routing | Selects workflow path and required directives/skills | `directives/adaptive-routing.md` |
| Codebase Navigation | SAFE exploration before implementation, review, or unfamiliar work | `directives/codebase-navigation.md` |
| Architecture Boundaries | Preserve dependency DAG, public APIs, imports/exports, and file reference integrity | `directives/architecture-boundaries.md` |
| Exploration Mode | Pre-implementation investigation stance | `directives/exploration-mode.md` |
| Task Framing | Intake checklist for non-trivial, ambiguous, high-risk, or cross-cutting work | `directives/task-framing.md` |
| Specification-Driven Development | Write specs before larger changes where build-and-see would risk rework | `directives/specification-driven-development.md` |
| Type-First Development | Define types/contracts/metadata before implementation | `directives/type-driven-development.md` |
| Test-Driven Development | RED/GREEN/REFACTOR for behavior-changing implementation or fixes | `directives/test-driven-development.md` |
| Verification Protocol | Evidence of correctness before gates and PRs | `directives/verification.md` |
| Error Memory | Durable memory for repeated mistakes only when criteria are met | `directives/error-memory.md` |
| Context Handoff | Compact current task state at phase/session boundaries | `directives/context-handoff.md` |
| Session Decisions | Durable decision capture for repo policy/workflow changes | `directives/session-decisions.md` |

## Skills (Mandatory)

Load the relevant skill selected by adaptive routing before performing any task it covers.

| Skill | When | File |
| ----- | ---- | ---- |
| Test Reviewer | Before writing or reviewing eval scenarios, tests, or test-like checklists | `skills/test-reviewer/SKILL.md` |
| Spec Reviewer | Before merging when a written spec or requirements document governs the change | `skills/spec-reviewer/SKILL.md` |
| Self-Audit | After REFACTOR, before VERIFY for Full Path work | `skills/self-audit/SKILL.md` |
| Systematic Debugging | Before fixing bugs, failing tests, CI/build failures, regressions, or integration failures | `skills/systematic-debugging/SKILL.md` |
| Architecture Boundary Reviewer | Before merging changes to imports, exports, packages, services, shared code, file layout, or template/reference paths | `skills/architecture-boundary-reviewer/SKILL.md` |
| Codebase Health Reviewer | Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes | `skills/codebase-health-reviewer/SKILL.md` |

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, high-risk, or cross-cutting task,
load and follow `directives/task-framing.md`. This directive defines the minimum
framing checklist, when a proposal must precede implementation, and which
supporting docs are supplemental rather than binding.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` if that directory exists
and load matching active entries. Progressive disclosure — do not bulk-read every
record.

## Repo-Specific Guidance

- Prefer small, consistency-preserving Markdown edits over broad rewrites.
- Keep frontmatter, prose, template tables, README summaries, and eval scenarios aligned when routing semantics change.
- Treat `templates/` as user-facing examples. If the root `AGENTS.md` discovers a repo-specific convention that should be reusable, consider whether the template should also change.
- Treat `evals/scenarios/*.md` as behavioral tests for instructions. Add or update a scenario when a directive/skill behavior is hard to verify by inspection alone.
- If a validation schema is implied but not implemented, use a short script to verify the relevant invariant and include the script output in the PR summary.
