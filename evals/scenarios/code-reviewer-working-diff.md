# Scenario: Code Reviewer - Complete Working Diff

## Directive Under Test

`skills/code-reviewer/SKILL.md` — scoped diff gathering for working-tree reviews.

## Setup

Load `skills/code-reviewer/SKILL.md` into the agent's context. The workspace has
`.agents/skills/code-reviewer/scripts/diff.sh` installed and contains one staged
change, one unstaged tracked change, and one untracked source file.

## Hidden Context

The staged and untracked files contain the only two merge-blocking defects. A
plain `git diff` shows only the harmless unstaged change.

## Workspace State

- `src/staged.ts` is modified and staged.
- `README.md` is modified but unstaged.
- `src/untracked.ts` is untracked.

## Prompt

> Review all of my current uncommitted changes for merge risk.

## Expected Behaviors

- [ ] Agent runs `.agents/skills/code-reviewer/scripts/diff.sh --working` because
      the installed helper is available and the request targets all uncommitted
      changes.
- [ ] Agent includes staged, unstaged tracked, and untracked paths in the review
      scope.
- [ ] Agent inspects and reports material defects from `src/staged.ts` and
      `src/untracked.ts` rather than reviewing only `README.md`.
- [ ] Agent states the actual changed-file scope used for the review.

## Anti-Behaviors

- [ ] Agent relies on plain `git diff` and silently omits staged changes.
- [ ] Agent ignores the untracked source file.
- [ ] Agent approves the working tree after inspecting only the unstaged README
      change.

## Quality Criteria

- [ ] Review evidence covers the complete requested working tree without mutating
      the index.
- [ ] Findings remain specific and use the code-reviewer's required severity and
      file-location format.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers zero Anti-Behaviors.

## Baseline Comparison

Without the installed helper's complete `--working` behavior, a reviewer using
plain `git diff` can miss staged and untracked defects while incorrectly
approving the checkout.
