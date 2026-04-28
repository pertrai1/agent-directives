# <!-- FILL IN: project name -->

<!--
This file is a GitHub Copilot instruction template adapted from agent-directives.
Replace every <!-- FILL IN: ... --> placeholder with project-specific content.
Delete this comment block when done.
-->

## What This Project Is

<!-- FILL IN: one-paragraph description of the project and its purpose -->

## Key Rules

These rules are non-negotiable. For detailed guidance, load the corresponding
directive from the `directives/` directory.

### Types First

Define types before writing any implementation code. Run the project's type-check
before proceeding to tests.

### Strict TDD

Follow the RED/GREEN/REFACTOR cycle for ALL code changes:

1. Write ONE failing test → confirm it fails
2. Write minimum code to pass → confirm ALL tests pass
3. Clean up if needed → confirm all tests still pass
4. Repeat for each behavior — do not batch

**Never** write implementation before a failing test exists.

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

### Light Path

Use when: ≤2 files changed, no new exports, no type changes, no logic changes.

| Step | Phase        | Action                         | Verify                                                |
| ---- | ------------ | ------------------------------ | ----------------------------------------------------- |
| 0    | **BASELINE** | Verify starting state is clean | <!-- FILL IN: baseline verification command --> passes |
| 1    | FIX          | Make the change                | Affected test passes                                  |
| 2    | GATES        | Run quality gates              | <!-- FILL IN: gates commands --> pass                 |
| 3    | COMMIT       | Atomic commit                  | One change per commit                                 |

### Full Path

Use for: everything else. No skipping steps.

| Step | Phase        | Action                                   | Verify                                                       |
| ---- | ------------ | ---------------------------------------- | ------------------------------------------------------------ |
| -1   | **ORIENT**   | **Navigate codebase safely**             | See codebase-navigation directive (SAFE pattern)             |
| 0    | **BASELINE** | **Verify starting state is clean**       | <!-- FILL IN: baseline verification command --> all pass     |
| 1    | TYPES        | Define types first                       | Type-check passes                                            |
| 2    | RED          | Write ONE failing test                   | Test fails                                                   |
| 3    | GREEN        | Write minimum code to pass               | All tests pass, type-check passes                            |
| 4    | REFACTOR     | Clean up if needed                       | All tests still pass                                         |
| 4.5  | **SELF-AUDIT** | **Triage weakest assumptions and anomalies** | See `skills/self-audit/SKILL.md` — route: 🔁 fix → step 2, 📋 document, or 🧑 ask human |
| 4.75 | **VERIFY**   | **Produce verification summary**         | See verification directive — target 📋 documented Jenga entries |
| 5    | GATES        | Run quality gates                        | <!-- FILL IN: gates commands -->                             |
| 6    | COMMIT       | Atomic commit                            | One behavior per commit                                      |

## Forbidden

- `any` type or implicit `any`
- `it.skip()` in tests
- Fake assertions (`expect(true).toBe(true)`)
- Writing implementation before a failing test exists
- Batching multiple behaviors into one commit

## Directives

For detailed guidance on each workflow rule, load the corresponding directive
from the `directives/` directory:

- `codebase-navigation.md` — SAFE exploration pattern
- `exploration-mode.md` — Pre-implementation investigation stance
- `task-framing.md` — Intake checklist for non-trivial work
- `specification-driven-development.md` — Write specs before code, verify after
- `type-driven-development.md` — Types before implementation
- `test-driven-development.md` — RED/GREEN/REFACTOR cycle
- `verification.md` — Evidence of correctness before GATES
- `error-memory.md` — Persistent memory for repeated mistakes
- `session-decisions.md` — Durable decision capture

## Skills

Load the relevant skill for the task type.

- `skills/test-reviewer/SKILL.md` — Before writing or reviewing any test
- `skills/spec-reviewer/SKILL.md` — Before merging when a written spec exists
- `skills/self-audit/SKILL.md` — After REFACTOR, before VERIFY on every Full Path cycle

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in `docs/decisions/*.md` and load matching active
entries. Progressive disclosure — do not bulk-read every record.
