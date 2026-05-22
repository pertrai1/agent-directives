---
name: "code-reviewer"
description: "Load when the user asks to review a PR, branch, diff, local changes, or says approve, merge, or check this change for bugs, regressions, security, maintainability, or merge risk."
version: 1.1.0
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

## Review Depth

Default to the lightest useful review.

### Fast Path
Use when the change is small, localized, or already has passing gates.

Output:
- Top 1-3 material findings only
- “No material findings” if clean
- Verification gaps only if they affect merge confidence

Do not emit the full checklist when there are no findings.

### Deep Path
Use the full review process when the change is high-risk, cross-cutting, security/data-sensitive, behavior-changing without tests, or explicitly requested.

# Code Review Guidelines

When reviewing a pull request, branch, diff, or local change:

## Review Heuristics (What to Check)

Do not just read the code top-to-bottom. Apply these specific checks:

| Severity | Check | Heuristic / Action |
| :--- | :--- | :--- |
| **🛑 Critical** | **CI & Config Changes** | Look at `.github/workflows`, test configs, and lint rules first. Flag any change that weakens CI, ignores rules, or deletes tests to "fix" them. |
| **🛑 Critical** | **Evidence Requirements** | For any non-trivial logic change, require a test that fails on the pre-change behavior. |
| **⚠️ Warning** | **New Utilities (DRY)** | Search for new functions, helpers, or modules. Run a repo search to check for duplicates. Flag anything that reinvents existing codebase functionality. |
| **🔍 Trace** | **Critical Path** | Pick the most important logic change and trace it end-to-end: input → transforms → output. Check boundary conditions and unexpected branching. |
| **🔍 Trace** | **Security Boundaries** | If the PR touches untrusted input or LLM calls, explicitly check for prompt injection, auth bypass, and missing sanitization. |

## Standard Categories

## Output Format

For each finding:

- **File:Line** — exact location
- **Severity** — Critical / Warning / Trace / Suggestion
- **What's wrong** — one sentence
- **Fix** — how to fix it

## Rules

- Be specific. Quote the problematic code.
- Don't flag style nitpicks unless they affect readability.
- If the PR looks good, say so. Don't invent problems.
- End with: APPROVE / REQUEST_CHANGES / COMMENT
