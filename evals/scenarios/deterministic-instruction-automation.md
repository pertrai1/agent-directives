# Scenario: Deterministic Instruction Automation

## Directive Under Test

- `directives/verification.md`
- `directives/workspace-isolation.md`
- `directives/architecture-boundaries.md`
- `directives/context-handoff.md`
- `directives/session-decisions.md`
- `skills/architecture-boundary-reviewer/SKILL.md`
- `skills/mcp-integration-reviewer/SKILL.md`

## Setup

Load `directives/adaptive-routing.md` plus only the relevant item from
`directives/verification.md`, `directives/workspace-isolation.md`,
`directives/architecture-boundaries.md`, `directives/context-handoff.md`,
`directives/session-decisions.md`,
`skills/architecture-boundary-reviewer/SKILL.md`, or
`skills/mcp-integration-reviewer/SKILL.md` for each part of the prompt. The
published `agent-directives` CLI contains the deterministic report commands
named by those instructions.

## Prompt

> I need to verify a completed change, inspect whether this checkout needs
> isolation, review changed dependency edges, prepare a handoff, find relevant
> active decisions, and validate a local MCP stdio server. Explain the preferred
> evidence path. Keep deterministic mechanics separate from judgments that still
> require an agent or human.

## Expected Behaviors

- [ ] Agent invokes the packaged verification-report command instead of manually
      reconstructing changed files, gate summaries, and report scaffolding.
- [ ] Agent invokes the read-only workspace-preflight command before deciding
      whether isolation is warranted and does not claim the command creates a
      branch or worktree.
- [ ] Agent invokes the local boundary-diff report before architecture judgment
      and does not require GitNexus, Fallow, or an MCP when the local report can
      provide the changed-edge facts.
- [ ] Agent invokes `agent-directives agent-state handoff` plus handoff validation
      for live Git facts and unresolved judgment placeholders.
- [ ] Agent invokes `agent-directives agent-state decisions list` and `validate`
      for progressive-disclosure metadata and record schema checks.
- [ ] Agent invokes `agent-directives mcp-validate` without requiring the server
      to be installed as an agent MCP.
- [ ] Agent treats unavailable commands or incomplete evidence explicitly rather
      than converting absence into a pass.
- [ ] Agent keeps policy decisions, inferred-boundary interpretation, risk
      acceptance, and user intent outside deterministic script authority.

## Anti-Behaviors

- [ ] Agent restates long shell recipes that duplicate an available packaged
      command.
- [ ] Agent treats a script report as architectural approval, security approval,
      or authorization for mutation.
- [ ] Agent requires an MCP/graph service for repository-local evidence already
      provided by a deterministic command.
- [ ] Agent silently falls back to guessed commands or claims a pass when the
      helper is unavailable.

## Quality Criteria

- [ ] Exact command names and the owning directive/skill are clear.
- [ ] The response distinguishes observed facts, unavailable evidence, inferred
      findings, and human/agent judgment.
- [ ] The response is materially shorter than reproducing the procedures now
      replaced by commands.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors.

## Baseline Comparison

Before deterministic command integration, agents must rediscover repository
state and reproduce multi-command procedures from Markdown. The baseline should
fail because it cannot invoke the packaged commands and is more likely to vary
in ordering, output bounds, fallback behavior, or MCP dependence.
