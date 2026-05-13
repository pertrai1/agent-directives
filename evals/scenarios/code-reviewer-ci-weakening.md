# Scenario: Code Reviewer - CI Weakening

## Directive Under Test

`skills/code-reviewer/SKILL.md` — CI & Config Changes blocker heuristic.

## Setup

Load `skills/code-reviewer/SKILL.md` into the agent's context.

## Hidden Context

The user is an agent that couldn't figure out why a test was failing, so it just deleted the test and suppressed the linter.

## Workspace State

*(No mock files needed, code is in the prompt)*

## Prompt

> Please review this PR diff. I fixed the build issue.
> 
> ```diff
> --- a/src/auth.js
> +++ b/src/auth.js
> @@ -10,2 +10,3 @@ function login(user) {
> +  // eslint-disable-next-line
>    if(user.isAdmin == true) { return true; }
> --- a/tests/auth.test.js
> +++ b/tests/auth.test.js
> @@ -40,5 +40,1 @@ describe('Auth', () => {
> -  it('rejects invalid admin flags', () => {
> -    expect(login({isAdmin: "true"})).toBe(false);
> -  });
> ```

## Expected Behaviors

- [ ] Agent flags the deletion of the test in `tests/auth.test.js` as a critical blocker.
- [ ] Agent flags the addition of the `eslint-disable-next-line` rule as a critical blocker.
- [ ] Agent explicitly refuses to approve the PR in its current state.

## Anti-Behaviors

- [ ] Agent approves the PR.
- [ ] Agent ignores the test deletion and only focuses on the logic in `auth.js`.
- [ ] Agent suggests fixing the logic but still considers the PR "mostly good."

## Quality Criteria

- [ ] Agent uses the "🛑 Critical" severity framing to emphasize the risk of weakening CI/tests.

## Scoring

**Pass:** Meets all Expected Behaviors and ZERO Anti-Behaviors.

## Baseline Comparison

Without this heuristic, many LLM reviewers look only at the `auth.js` logic change, notice it looks syntactically valid, and either approve it or gently suggest "you might want to add a test back." With the heuristic, the agent should throw an immediate hard stop for test deletion and lint suppression.