---
date: 2026-05-23
task: Enforce version bumps for changed directives and skills
domain: instruction-version-policy
kind: repo-policy
scope: repo
status: active
triggers:
  - changing directive or skill version policy
  - editing directives or skills in a pull request
  - updating validation rules for instruction metadata
applies_to:
  - directives/*.md
  - skills/*/SKILL.md
  - scripts/validate-version-bumps.ts
  - CONTRIBUTING.md
  - AGENTS.md
supersedes: []
---

# Require version bumps for changed directives and skills

## Context

The repo needed a consistent policy for whether `version` frontmatter changes
when a directive or skill is edited. Two reasonable goals were in tension:
avoid noisy version churn for tiny wording edits, but make behavior and metadata
changes visible to humans, agents, manifests, and downstream sync workflows.
Because CI cannot reliably infer semantic intent from Markdown diffs, a
case-by-case policy would be easy for agents to skip or misclassify.

## Decision

Every existing `directives/*.md` or `skills/*/SKILL.md` file changed in a PR must
increase its frontmatter `version`. The bump size carries intent: patch for typo,
wording, clarification, or behavior-tightening changes; minor for new heuristics,
routing triggers, evidence requirements, required outputs, or meaningful new
coverage; major for incompatible routing, schema, path, or removal changes.
New directives and skills start with an initial version and do not need a
comparison bump on their first PR.

## Rejected Alternatives

**Bump only behavior-changing edits** — Rejected because it is the ideal semantic
policy but not mechanically enforceable. Agents and humans would have to decide
whether a Markdown change affects behavior, and CI could not verify the judgment.

**Never enforce per-entry versions** — Rejected because changed instructions can
silently alter downstream agent behavior while keeping manifest metadata stable.
That makes sync, review, and compatibility decisions weaker.

**Allow unbumped edits with a PR-body exemption** — Rejected for now because it
adds another review ritual and CI integration surface. A patch bump is cheaper
and leaves a clearer machine-readable signal.

## Consequences

**Easier:**
- CI can enforce the rule deterministically against the PR base branch.
- Manifest metadata changes when an existing directive or skill changes.
- Reviewers and downstream consumers get a compact signal that an instruction
  changed, even for small wording edits.

**Harder:**
- Typo-only instruction edits now require a patch bump and manifest regeneration.
- Version numbers will advance faster than a purely semantic-release policy.

**Watch for:**
- Overusing minor bumps for small clarifications; patch is usually enough.
- Forgetting to stage regenerated `manifest.json` after changing a version.
- Treating version bumps as a substitute for eval scenarios when behavior
  actually changes.

**Unlearn:**
- "No behavior change" is not a reliable CI-detectable category for Markdown
  instructions. Use patch bumps as the cheap deterministic default.
