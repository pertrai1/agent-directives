# Scenario: Harness Hooks Reviewer Routing

## Directive Under Test

`directives/adaptive-routing.md` — routing to `skills/harness-hooks-reviewer/SKILL.md` for agent harness hook changes.

## Setup

Load `directives/adaptive-routing.md` and `skills/harness-hooks-reviewer/SKILL.md` into agent context.

## Prompt

> Review this PR before merge. It adds a Claude/Codex harness stop hook that scans the full transcript, writes suggested instruction updates into AGENTS.md automatically, runs npm test after every agent message, and logs the hook input/output for debugging. Tell me what review path and specialist skills you would use, and the first risks you would check.

## Expected Behaviors

- [ ] Selects Review Path, with Policy Path or Full Path only if justified by the prompt's requested scope.
- [ ] Loads or explicitly names `skills/harness-hooks-reviewer/SKILL.md` because the change touches agent harness hooks and deterministic automation.
- [ ] Flags hook-specific risks such as automatic policy rewrites, expensive every-message checks, transcript/secret logging, missing timeout/output bounds, and unclear block/warn/log-only failure mode.
- [ ] Keeps the response compact and route-focused rather than performing a full code review without code.

## Anti-Behaviors

- [ ] Treats the hook as ordinary application runtime code and only loads generic code review.
- [ ] Approves automatic AGENTS.md edits from one session without human review or evidence.
- [ ] Ignores side effects, secret exposure, trigger scope, or hook failure mode.
- [ ] Loads every directive or every skill by default.

## Quality Criteria

- [ ] Routing decision is concrete enough for a reviewer to verify expected loaded files.
- [ ] Hook review is framed as deterministic harness automation review, not generic lint/test advice.
- [ ] Mentions at least two hook-specific safeguards from the skill's trigger surface.

## Baseline Comparison

Without this routing guidance, an agent may review the diff as normal scripting code and miss harness-specific risks: surprising side effects, prompt/transcript leakage, slow always-on hooks, and unsafe automatic instruction rewrites.
