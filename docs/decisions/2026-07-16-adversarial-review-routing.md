---
date: 2026-07-16
task: Add adversarial reviewer skill and routing
domain: adversarial-review-routing
kind: repo-policy
scope: repo
status: active
triggers:
  - adding or changing adversarial review behavior
  - changing reviewer skill routing
  - deciding whether adversarial review is a mode or a separate skill
applies_to:
  - directives/adaptive-routing.md
  - skills/adversarial-reviewer/SKILL.md
  - skills/*/SKILL.md
supersedes: []
---

# Treat adversarial review as a separate reviewer role

## Context

The repository already had domain reviewer skills such as code, test, spec,
architecture, and production-readiness review. The new need was different: run a
separate skeptical reviewer whose only job is to find credible reasons an
implementation fails, ideally in a different context from the implementer. This
created a real choice between adding a mode to an existing reviewer and creating
a distinct skill.

## Decision

Adversarial review is a dedicated skill that composes with the relevant domain
reviewer skills. This preserves role separation: domain reviewers judge their
area of merge risk, while the adversarial reviewer attacks the strongest proof
and reports credible failure modes without implementing fixes or approving the
change. Adaptive routing should load it for explicit adversarial/red-team or
failure-mode review requests and for significant high-risk, broad, or
agent-authored changes that need independent skepticism.

## Rejected Alternatives

**Make adversarial review a mode inside `skills/code-reviewer/SKILL.md`** —
Rejected because the user specifically wanted separate reviewer contexts and
incentives. A mode inside code-reviewer would be cheaper but easier for agents to
collapse back into ordinary self-review.

**Replace domain reviewer skills with adversarial review for risky changes** —
Rejected because adversarial review is cross-cutting and skeptical, not a
substitute for test, spec, architecture, production, security, MCP, or harness
expertise.

**Only add routing prose without a skill file** — Rejected because independent
review sessions need a concrete persona, process, and output contract to load.

## Consequences

**Easier:**
- Multi-reviewer sessions can assign one reviewer to failure-mode discovery
  without weakening domain review coverage.
- Agents have explicit instructions not to let the adversarial reviewer implement
  fixes or act as final approver.

**Harder:**
- Routing must avoid treating every agent-authored or risky change as permission
  to bulk-load all reviewers.
- Review orchestration now has one more specialist role to explain in route
  output.

**Watch for:**
- Agents using adversarial review as a tone rather than a separate role.
- Agents loading adversarial review for tiny low-risk edits without an explicit
  user request.
- Findings that are speculative but lack a plausible failure path.

**Unlearn:**
- A separate skill was appropriate here because role separation is the feature;
  do not default to a new skill when a lightweight mode in an existing reviewer
  would preserve the same behavior.
