---
date: 2026-05-09
task: Add workspace isolation guidance to the directive library
domain: workspace-isolation-routing
kind: repo-policy
scope: repo
status: active
triggers:
  - adding or renaming workspace isolation guidance
  - deciding between native workspace tools and git worktrees
  - updating routed directive lists for isolated repo work
applies_to:
  - directives/workspace-isolation.md
  - directives/adaptive-routing.md
  - README.md
  - AGENTS.md
  - templates/*.md
supersedes: []
---

# Treat workspace isolation as a routed workflow rule

## Context

The repo needed reusable guidance for protecting a user's current checkout while
an agent performs mutable implementation work. There were several plausible ways
to add that guidance: a git-worktrees-only document, a skill, or a routed
directive that stays tool-agnostic while still allowing git fallback. Because
this library is meant to be portable across agent platforms, the choice affects
more than one file and would be easy for a future contributor to revisit.

## Decision

Workspace isolation is represented as a directive named
`directives/workspace-isolation.md`, not as a skill and not as a git-only rule.
The directive is routed conditionally through `directives/adaptive-routing.md`
so agents can add it to implementation or debugging work when the current
checkout is shared, protected, dirty, or explicitly meant to stay untouched.
The body is native-tool-first, with `git worktree` as the fallback, because that
keeps the library portable while still giving git-based agents a concrete escape
hatch.

## Rejected Alternatives

**Git-worktrees-only directive** — Rejected because it bakes one mechanism into
the rule and fits this repository's portability goal poorly. Some agents have
native workspace tools that should be preferred over raw git commands.

**Skill instead of directive** — Rejected because the behavior is a workflow
rule about how to prepare a mutable workspace, not a specialist persona or
review process.

**Template-only guidance** — Rejected because listing the idea in templates
without routing would make discovery inconsistent and easy to skip.

## Consequences

**Easier:**
- Future directive/template updates can refer to one routed, portable source of
  truth for isolated workspace setup.
- Agents can explain why isolation was chosen instead of treating worktrees as an
  ad hoc shell trick.

**Harder:**
- Adaptive routing and directive inventories must stay aligned when this guidance
  changes.
- Eval coverage now needs to exercise routing plus isolation behavior, not just
  prose quality.

**Watch for:**
- Tool-specific paths or assumptions sneaking back into the directive body.
- Future contributors adding workspace isolation language to templates but
  forgetting to keep adaptive routing or README summaries in sync.

**Unlearn:**
- "Feature branch" and "isolated workspace" are not interchangeable; branch
  creation alone does not protect unrelated local work in the current checkout.
