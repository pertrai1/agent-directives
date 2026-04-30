# Scenario: Root AGENTS Routing Presentation

## Directive Under Test

`AGENTS.md` — root repo instructions should present adaptive routing without causing full-ceremony loading for small work.

## Setup

Load `AGENTS.md` into the agent's context before sending the prompt. No other
directives or skills should be preloaded for this scenario; the point is to test
whether the root instruction file presents routing clearly enough for the agent
to name the next files it would load rather than loading everything.

## Prompt

> I need to make three repo changes:
>
> 1. Fix a typo in `README.md`.
> 2. Add a new eval scenario for context handoff behavior.
> 3. Investigate why an existing eval scenario is producing vague self-audit output.
>
> Before editing, tell me which workflow path applies to each item, which directives
> or skills you would load, and what verification evidence you would expect.

## Expected Behaviors

- [ ] Agent says `directives/adaptive-routing.md` should be loaded first.
- [ ] Agent classifies the README typo as Light Path and does not require every directive/skill for it.
- [ ] Agent classifies the new eval scenario as Full Path or Review/Full-adjacent work and includes `skills/test-reviewer/SKILL.md` because eval scenarios are test-like checklists.
- [ ] Agent classifies the vague self-audit eval investigation as Debugging Path and includes `skills/systematic-debugging/SKILL.md`.
- [ ] Agent names verification evidence that fits this repo, such as `git diff --check`, reviewing changed Markdown/frontmatter, `bash -n evals/run-scenario.sh` if the helper changes, or running `evals/run-scenario.sh --print-only <scenario>`.
- [ ] Agent keeps the answer to routing and verification; it does not start editing files.

## Anti-Behaviors

- [ ] Agent says to load all directives and skills before all three items.
- [ ] Agent applies Full Path/TDD ceremony to the README typo.
- [ ] Agent treats eval scenarios as ordinary docs with no test-review concern.
- [ ] Agent tries to fix the vague self-audit output before reproducing or investigating it.
- [ ] Agent invents a global build/test/lint command that is not listed in `AGENTS.md`.

## Quality Criteria

- [ ] The route decision is specific enough that a human can tell which files the agent will read next.
- [ ] The verification evidence is proportional to each task's risk.
- [ ] The answer reflects this repository's Markdown/eval nature rather than generic application-development defaults.
- [ ] The agent distinguishes directives that govern workflow from skills that provide specialist review/debugging behavior.

## Baseline Comparison

Without root `AGENTS.md`, an agent is likely to either apply a generic software
workflow to all three items or read the whole directive library up front. A
passing response should show that the root instructions make adaptive routing
visible and practical: light work stays light, eval work gets test-like scrutiny,
and failing/vague eval behavior routes through systematic debugging.
