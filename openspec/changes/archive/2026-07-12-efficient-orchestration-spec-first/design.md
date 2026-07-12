## Context

`directives/adaptive-routing.md` is the only unconditional workflow entry point, but it does not currently route specification-driven development or error memory. Task framing and specification-driven development also expose competing proposal paths, while handoff-state discovery and delegation sizing remain implicit. The change affects portable Markdown instructions, their manifest metadata, and scenario-based eval coverage; it does not change runtime code.

## Goals / Non-Goals

**Goals:**

- Require a durable written specification before implementation or behavior-changing work begins.
- Scale specification depth to task complexity without making specification presence optional.
- Make router decisions fast for Light Path tasks and deterministic for Full/Policy work.
- Make existing error memory, agent-state files, and delegation-cost guidance discoverable.
- Preserve version, manifest, and eval consistency.

**Non-Goals:**

- Require a repository spec for purely conversational work or non-behavioral typo/formatting edits.
- Restructure `.agents/`, `docs/ERRORS.md`, or `docs/decisions/` storage.
- Add deterministic hooks, runtime enforcement, dependencies, or CI configuration.
- Rewrite unrelated directive prose or alter Claude's existing staged verification guidance.

## Decisions

1. **Specification presence is mandatory; depth is proportional.** Every implementation or behavior-changing task must create or identify a durable specification before RED/GREEN work. Small changes may use a brief proposal plus atomic acceptance criteria; medium and large changes use proposal, design, and detailed requirements. This is preferred over making specification-driven development conditional because conditional routing recreated the orphaning failure. Requiring full multi-document design for typo-only work was rejected as ceremony without implementation risk.

   The directive remains `required: false` in manifest metadata because this
   repository defines `required: true` as always loaded. Adaptive routing makes
   the directive mandatory when implementation is selected without adding it to
   conversational, review-only, or non-behavioral Light Path contexts.

2. **Task framing is intake; specification-driven development owns the contract.** Task framing establishes problem, constraints, assumptions, failure modes, and scope, then hands all implementation work to the Propose/Design/Specify sequence. This is preferred over maintaining two interchangeable proposal templates because one deterministic handoff preserves the Wobble and Counterfactual gates.

3. **Put a condensed decision table before detailed router guidance.** Agents can stop after selecting Light Path, while non-Light routes continue to the detailed sections. Deleting detailed path guidance was rejected because higher-risk routes still need it.

4. **Discover state without consolidating storage.** Context handoff will tell agents to list `.agents/` and check relevant state plus `docs/ERRORS.md`; moving existing files was rejected because it would create path migrations outside the requested scope.

5. **Use an advisory delegation threshold.** Delegation is skipped by default for fewer than roughly three files or one clear function/section unless isolation or specialist review materially reduces risk. A hard numeric prohibition was rejected because a small security-sensitive task can still justify delegation.

6. **Use one focused eval scenario with independent expectations.** A single scenario will exercise spec-first routing and the five orchestration fixes while keeping the behavior contract reviewable. Unrelated existing scenarios remain unchanged unless validation exposes a direct contradiction.

## Risks / Trade-offs

- **[Spec-first language could accidentally burden Light Path typo work]** → Explicitly scope the mandatory durable spec gate to implementation and behavior-changing tasks, while allowing the user request/scope line to frame non-behavioral Light Path work.
- **[Moving quick-reference content could create duplicated or contradictory routing guidance]** → Keep one authoritative early table and remove the old duplicate after verifying all path entries remain represented.
- **[Version changes could collide with Claude's staged bumps]** → Treat the staged versions as the working baseline and apply the appropriate next minor versions for new routing/evidence behavior.
- **[One eval could hide which behavior failed]** → Give each requirement a separate expected-behavior checklist item and anti-behavior.
- **[Stale GitNexus index weakens graph evidence]** → This change edits Markdown instructions rather than code symbols; refresh and use change detection before commit if the CLI supports the required scope check.

## Migration Plan

1. Add the spec-first routing and sequencing requirements.
2. Add fast-path, state-discovery, and delegation heuristics.
3. Add targeted eval coverage and regenerate manifest metadata.
4. Run OpenSpec validation, scenario print-only validation, repository checks, self-audit, and spec review.
5. Commit the coherent policy change on the feature branch. Existing consumers adopt the behavior when they next load the updated directives.

Rollback is a normal git revert of this documentation-only change.

## Open Questions

None. The user explicitly prioritized mandatory specification-first development and requested all five findings.
