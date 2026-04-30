# Agent Operator Cheat Sheet
This is a quick reference for humans asking the agent to do work in this repo.
Use it to request tasks in a way that aligns with the routed workflow.

## Quick Prompt Template
Use this structure when giving a task:

1. Goal: what you want changed
2. Scope: files/surfaces in or out of scope
3. Constraints: anything that must not change
4. Evidence: what proof you want before completion

Example:
“Fix rule X for case Y. Keep public API unchanged. Add regression tests and include verification summary.”

## Route by Task Type
### 1) Docs / typo / comments / formatting only
- Route: Light Path
- Expected behavior:
  - Minimal orientation
  - Make change
  - Run relevant quality gate(s)
  - Concise verification
- Good prompt:
  - “Update wording in docs/rules/foo.md only; no behavior changes.”

### 2) New feature or behavior change
- Route: Full Path
- Required directive flow (typical):
  - codebase-navigation
  - task-framing (for non-trivial, ambiguous, risky, or cross-cutting work)
  - type-driven-development
  - test-driven-development
  - verification
- Required skills (when triggered):
  - self-audit (after REFACTOR, before verification)
  - test-reviewer (when tests are added/changed)
  - spec-reviewer (if a written spec exists)
- Good prompt:
  - “Add feature X. Follow TDD and include full verification output.”

### 3) Bug fix / regression / failing CI/build/test
- Route: Debugging Path (plus TDD for behavior fix)
- Required skill:
  - systematic-debugging
- Expected behavior:
  - Reproduce first
  - Localize root cause
  - Write/identify failing regression test
  - Implement minimal fix
  - Verify no regression
- Good prompt:
  - “Investigate failing test Y, show root cause, then fix with a regression test.”

### 4) Imports/exports/package/shared boundary changes
- Route: Boundary Path + base path (usually Full or Debugging)
- Required directive:
  - architecture-boundaries
- Required skill:
  - architecture-boundary-reviewer (before merge/review completion)
- Expected behavior:
  - Explicit dependency-edge review
  - No illegal direction, deep-import bypasses, or new cycles
- Good prompt:
  - “Refactor module boundaries for X and include architecture boundary proof.”

### 5) PR / branch / diff review
- Route: Review Path
- Skill selection by changed surface:
  - tests changed -> test-reviewer
  - spec-governed work -> spec-reviewer
  - boundary-sensitive changes -> architecture-boundary-reviewer
  - TS/JS health/refactor concerns -> codebase-health-reviewer
- Expected behavior:
  - Structured findings and risk assessment
  - No code edits unless explicitly requested
- Good prompt:
  - “Review this PR for merge risk and missing test coverage; do not edit code yet.”

### 6) Investigation / architecture understanding / option comparison
- Route: Exploration Path
- Required directive:
  - exploration-mode
- Expected behavior:
  - Analyze and compare options
  - Grounded repo evidence
  - No code edits unless you explicitly switch to implementation
- Good prompt:
  - “Explore options for X and recommend one with tradeoffs; no implementation yet.”

### 7) Workflow/policy/directive/skill changes
- Route: Policy Path
- Required directives:
  - task-framing
  - verification
  - session-decisions (when durable policy/convention changes are made)
- Expected behavior:
  - Proposal when tradeoffs exist
  - Decision logging when criteria are met
- Good prompt:
  - “Propose and implement update to contributor workflow, with rationale and decision-log handling.”

## What to Ask For in Every Non-Trivial Task
- Route declaration at start (intent, path, risk, required directives/skills)
- Evidence required before done (tests, lint, build/type-check, verification summary)
- Boundary proof when imports/exports/packages/shared surfaces change
- Regression proof for bug fixes

## Handoff Guidance
Ask for a compact handoff when work spans phases or sessions:
- “Write/update `.agents/handoff.md` before stopping.”

Use this especially for Full, Debugging, Boundary, Review, Exploration, and Policy paths.

## Practical Prompt Add-Ons
- “Do not edit code yet” (review/exploration mode)
- “Use TDD with explicit RED->GREEN evidence”
- “Keep scope limited to files X and Y”
- “Call out pre-existing failures separately from new failures”
- “Include a short verification section in your final response”
