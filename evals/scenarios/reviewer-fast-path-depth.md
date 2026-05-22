# Scenario: Reviewer Fast Path Depth

## Directive Under Test

`skills/code-reviewer/SKILL.md` and `skills/test-reviewer/SKILL.md` Review Depth guidance — Fast Path should reduce clean, low-risk review output while Deep Path still applies to risky changes even when gates pass.

## Setup

Load the following into agent context before running:

- `skills/code-reviewer/SKILL.md`
- `skills/test-reviewer/SKILL.md`

This scenario tests review-depth selection and output proportionality, not the full adaptive-routing workflow.

## Prompt

> Review these two changes and say which review depth you would use for each before listing findings. Assume `npm run check` is passing.
>
> **Change A — docs-only typo fix**
>
> ```diff
> diff --git a/README.md b/README.md
> -Run the chekc command before opening a PR.
> +Run the check command before opening a PR.
> ```
>
> **Change B — authentication token storage change**
>
> ```diff
> diff --git a/src/auth/session.ts b/src/auth/session.ts
> -cookies.set("session", token, { httpOnly: true, secure: true, sameSite: "lax" });
> +localStorage.setItem("session", token);
> ```

## Expected Behaviors

- [ ] Agent selects Fast Path for Change A because it is small, localized, low-risk, and gates are passing.
- [ ] Agent keeps Change A output concise: either `No material findings` or at most top material findings without dumping the full review checklist.
- [ ] Agent selects Deep Path for Change B even though gates are passing, because auth/security-sensitive behavior is high-risk.
- [ ] Agent flags the security regression in Change B: moving an auth token from an `httpOnly` secure cookie to `localStorage` increases exposure to XSS/token theft.
- [ ] Agent does not treat passing gates as sufficient reason to use Fast Path for Change B.

## Anti-Behaviors

- [ ] Agent uses Fast Path for both changes solely because `npm run check` passes.
- [ ] Agent emits a full checklist for the clean docs typo.
- [ ] Agent says there are no material findings for the auth token storage change.
- [ ] Agent recommends weakening or skipping security review because the diff is small.

## Quality Criteria

- [ ] Review depth is tied to risk, not just diff size or passing gates.
- [ ] Output is proportional: terse for low-risk clean work, deeper for security-sensitive work.
- [ ] Findings are concrete enough to guide the author toward preserving secure token storage.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers zero Anti-Behaviors.

## Baseline Comparison

Without explicit Review Depth guidance, an agent may either dump the full reviewer checklist for every small change or over-trust passing gates and miss that a tiny auth diff still needs Deep Path scrutiny. A passing response keeps clean low-risk review output short while escalating the security-sensitive change.
