---
name: adaptive-routing-detail
description: Lazy companion detail for ambiguous, composite, and high-risk adaptive routing.
version: 1.0.0
required: false
category: workflow
tools:
  - claude
  - copilot
  - codex
  - cursor
---

# Adaptive Routing — Detailed Reference

Load this companion only when the bootstrap selects an ambiguous, composite,
high-risk, Full, Debugging, Boundary, Policy, or Workspace-Isolation route. It
expands the required bootstrap; it is not a separately required directive.

## Full Path

Use for features, behavior/API changes, meaningful refactors, changed behavior
tests, and type/public-contract changes.

1. Orient with `directives/codebase-navigation.md`; inspect relevant error
   memory when `docs/ERRORS.md` applies.
2. For non-trivial, ambiguous, high-risk, or cross-cutting work, load
   `directives/task-framing.md` before substantial edits.
3. Load `directives/specification-driven-development.md` and create or identify
   the durable governing specification before RED or implementation. Then use
   type-driven development for typed/public contracts and TDD for behavior.
4. After REFACTOR, load `skills/self-audit/SKILL.md`, verify through
   `directives/verification.md`, run selected gates, and hand off when routed.

Load `skills/test-reviewer/SKILL.md` for changed tests/eval scenarios and
`skills/spec-reviewer/SKILL.md` before merge against a written contract.

## Debugging and Boundary

Debugging applies to regressions and failing CI/build/lint/type/test evidence.
Load `skills/systematic-debugging/SKILL.md`, reproduce first, record the brief
expected-behavior/regression specification, add or identify failing proof, fix
the root cause, rerun it, then verify. Use TDD when production behavior changes.

Boundary applies to imports/exports, folders/modules/packages, public entries,
shared utilities, services, or dependency direction. Load
`directives/architecture-boundaries.md` and
`skills/architecture-boundary-reviewer/SKILL.md`; show changed-edge evidence
before merge. Debugging plus Boundary follows reproduce → failing proof → fix →
rerun → boundary review.

## Policy and workspace isolation

Policy covers directives, skills, workflow, contributor instructions,
architecture policy, and cross-cutting conventions. Load task framing and
specification-driven development before edits. Existing changed directives and
skills require the mandated version bump; durable policy changes use
`directives/session-decisions.md`. Use verification and context handoff.

Workspace Isolation applies before mutation in shared, dirty, default/protected,
or explicitly protected checkouts. Load `directives/workspace-isolation.md`,
detect existing isolation, prefer native isolation, and show either isolated
workspace proof or an explicit safe fallback before edits.

## Review and exploration details

Review uses `skills/code-reviewer/SKILL.md`; add test, spec, boundary, health,
production, hooks, MCP, or adversarial reviewers only when their surfaces match.
Do not edit unless asked. Exploration uses `directives/exploration-mode.md` and
codebase navigation for repository evidence; add product-requirements writer or
implementation-task planner only for those artifacts. Do not implement until
the user switches modes.

## Specialist selection

| Trigger | Required specialist |
| --- | --- |
| Vague feature/requirement → PRD/spec | `skills/product-requirements-writer/SKILL.md` |
| PRD/issue/acceptance criteria → task plan | `skills/implementation-task-planner/SKILL.md` |
| Existing plan executed by delegated workers | `skills/subagent-driven-development/SKILL.md` |
| Bug/regression/failing gate | `skills/systematic-debugging/SKILL.md` |
| PR/branch/diff/local review | `skills/code-reviewer/SKILL.md` |
| Explicit adversarial or broad/high-risk agent change | `skills/adversarial-reviewer/SKILL.md` |
| Tests or eval scenarios | `skills/test-reviewer/SKILL.md` |
| Spec-governed implementation/merge | `skills/spec-reviewer/SKILL.md` |
| Imports/exports/packages/shared code | `skills/architecture-boundary-reviewer/SKILL.md` |
| TS/JS refactor, cleanup, shared utilities | `skills/codebase-health-reviewer/SKILL.md` |
| Production-sensitive surface | `skills/production-readiness-reviewer/SKILL.md` |
| Harness hooks/deterministic automation | `skills/harness-hooks-reviewer/SKILL.md` |
| MCP/tool/API bridge | `skills/mcp-integration-reviewer/SKILL.md` |

## Risk and evidence rules

Escalate rather than downgrade for public APIs, data/security/auth, production
systems, shared boundaries, CI failures, broad refactors, and uncertainty.
Run the project-native gates selected by the route, fix root causes rather than
suppressing tools, and classify pre-existing/out-of-scope failures explicitly.
Keep implementation bounded: no drive-by formatting, unrelated cleanup,
speculative abstractions, or permanent handoff accumulation.
