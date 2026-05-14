---
name: "code-reviewer"
description: "Load when the user asks to review a PR, branch, diff, local changes, or says approve, merge, or check this change for bugs, regressions, security, maintainability, or merge risk."
version: 1.0.0
required: true
category: review
tools:
  - claude
  - copilot
  - codex
  - cursor
routing:
  triggers:
  - pull-request
  - pr-review
  - code-review
  - branch-review
  - diff-review
  - merge-risk
  paths:
    - review-path
---

# Code Review Guidelines

When reviewing a pull request, branch, diff, or local change:

## What to Check

1. **Bugs** - Logic errors, off-by-one, null/undefined handling
2. **Security** — Injection, auth bypass, secrets in code, SSRF
3. **Performance** — N+1 queries, unbounded loops, memory leaks
4. **Style** — Naming conventions, dead code, missing error handling
5. **Tests** — Are changes tested? Do tests cover edge cases?

## Output Format

For each finding:

- **File:Line** — exact location
- **Severity** — Critical / Warning / Suggestion
- **What's wrong** — one sentence
- **Fix** — how to fix it

## Rules

- Be specific. Quote the problematic code.
- Don't flag style nitpicks unless they affect readability.
- If the PR looks good, say so. Don't invent problems.
- End with: APPROVE / REQUEST_CHANGES / COMMENT
