---
date: 2026-08-05
task: Replace high-return instruction mechanics with deterministic packaged commands
domain: instruction-automation
kind: process
scope: cross-cutting
status: active
triggers:
  - adding deterministic instruction automation
  - shortening directives or reviewer skills
  - replacing MCP-dependent repository-local evidence
applies_to:
  - src/*.ts
  - directives/*.md
  - skills/*/SKILL.md
supersedes:
---

# Package deterministic instruction automation before shortening policy

## Context

Several directives and reviewer skills repeated long shell procedures for git
state, verification gates, dependency edges, handoff state, decision metadata,
and MCP schema inspection. Those procedures consumed prompt space and varied by
agent, while some repository-local evidence unnecessarily depended on optional
MCP or graph tooling. The package already had a compiled Node CLI suitable for
portable, bounded local automation.

## Decision

Add deterministic, read-only command surfaces to the compiled
`agent-directives` CLI and prove them with focused fixtures before replacing the
corresponding Markdown mechanics. Commands own collection, normalization,
ordering, limits, stable report models, and invalid-evidence exit classes;
directives and reviewer skills retain consent, policy, architecture, security,
risk, and user-intent judgment. Optional MCP or graph tools remain supplemental
when they provide evidence the local command cannot.

## Rejected Alternatives

- Keep the procedures entirely in Markdown. This preserves portability but
  continues token overhead and agent-dependent parsing/order/error behavior.
- Ship standalone TypeScript or shell scripts as the primary interface. This
  makes consumer runtime/tooling assumptions less reliable than the existing
  compiled package binary.
- Require MCP or graph registration for all five workflows. This adds setup and
  availability dependencies to evidence that git, files, and stdio can provide
  locally.
- Let commands make the final policy or safety verdict. Deterministic syntax and
  repository facts cannot safely infer user intent, architecture contracts,
  authorization, or production risk.

## Consequences

- Easier: agents invoke short stable commands and consume bounded text/JSON
  instead of reconstructing multi-command procedures.
- Harder: the CLI surface and instruction references must remain versioned,
  tested, packaged, and synchronized.
- Watch for: treating a successful fact report as architecture, security, or
  mutation approval; every affected instruction states that separation.
- Unlearn: “deterministic” does not mean “fully automated.” It applies to
  observable mechanics, while contextual judgment remains explicit work.
