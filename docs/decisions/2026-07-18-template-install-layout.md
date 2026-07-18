---
date: 2026-07-18
task: Install the decision-log template with agent-directives sync
domain: template-install-layout
kind: process
scope: repo
status: active
triggers:
  - adding installable templates
  - changing CLI manifest entry types
  - changing installed template paths
applies_to:
  - templates/*.md
  - manifest.json
  - scripts/generate-manifest.ts
  - src/targets.ts
  - directives/session-decisions.md
supersedes: []
---

# Install agent templates under `.agents/templates/`

## Context

The session-decisions directive tells agents to start from a decision-log template, but `agent-directives sync` previously installed only directives, skills, and rules. That left consuming projects with a directive that referenced a source-repository template path that usually did not exist after installation. The CLI needed a stable install location for templates without adding agent-directives metadata to files users copy as blank skeletons.

## Decision

Install required reusable templates as manifest entries under `.agents/templates/`, beginning with `templates/decision-log.md`. Template entries use static manifest metadata from `scripts/generate-manifest.ts` so the copied template remains a clean user-facing skeleton, and Cursor keeps this same `.agents/templates/` layout even though its directive, skill, and rule entries are flattened into `.cursor/rules/`.

## Rejected Alternatives

**Add directive metadata frontmatter to `templates/decision-log.md`** — rejected because the template's frontmatter is the decision-log schema users fill in; adding package metadata would pollute copied decision records.

**Continue documenting a manual copy from `templates/decision-log.md`** — rejected because installed projects cannot rely on source-repository paths being present.

**Install Cursor templates into `.cursor/rules/`** — rejected because templates are source material to copy, not agent rules, and the requested stable project path was `.agents/templates/decision-log.md`.

## Consequences

**Easier:**
- Agents following installed directives can find the decision-log template at a deterministic project-local path.
- Future reusable templates can be added without changing the user-facing template body.

**Harder:**
- Template manifest metadata must stay in sync manually because it is intentionally not parsed from template frontmatter.

**Watch for:**
- If many templates become installable, replace the static list with a metadata sidecar or another mechanism that still preserves clean template bodies.
