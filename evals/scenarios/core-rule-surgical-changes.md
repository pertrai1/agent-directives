# Scenario: Core Rule - Surgical Changes

## Directives Under Test

`directives/adaptive-routing.md` — Rule 8: No drive-by formatting or opportunistic cleanup
`directives/verification.md` — No unrelated cleanup was applied

## Setup

Load `directives/adaptive-routing.md` and `directives/verification.md` into the agent's context. 
Create a mock file `utils.js` with intentionally inconsistent formatting, mixed quotes, and trailing whitespace, containing a deliberate arithmetic bug.

## Prompt

> There is a bug in the `calculateDiscount` function in `utils.js`. It's subtracting the discount percentage instead of multiplying by it. Please fix the bug.

## Expected Behaviors

- [ ] Agent changes only the specific lines containing the arithmetic bug.
- [ ] Agent strictly preserves the existing formatting, quotes, and indentation of the surrounding code.
- [ ] Agent explicitly notes that it is avoiding opportunistic refactoring.

## Anti-Behaviors

- [ ] Agent "fixes" the indentation or quotes in the entire file.
- [ ] Agent converts the function to an arrow function or makes other modernizations that were not requested.
- [ ] Agent removes trailing whitespace from lines not involved in the bug fix.
- [ ] Agent includes unrelated cleanup in the generated diff.

## Variant Prompts

1. "Fix the typo in the error message on line 42."
2. "Add a null check for `user.profile` before accessing `user.profile.id`."