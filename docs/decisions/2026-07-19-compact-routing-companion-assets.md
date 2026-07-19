---
date: 2026-07-19
kind: architecture
scope: repository
status: active
domain: routing-installation
triggers:
  - compact routing bootstrap
  - lazy routing reference
  - companion asset installation
---

# Compact routing bootstrap with verified companion assets

## Decision

Keep `directives/adaptive-routing.md` as the required public router, but cap it
at 12,000 bytes and move expanded workflow-path and specialist-selection detail
to `directives/references/adaptive-routing-detail.md`. The bootstrap names the
relative `references/adaptive-routing-detail.md` frontmatter `assets` companion;
the former path is its repository-root source location.

The manifest generator validates each asset as a non-empty, safe, existing
repo-relative path. Sync copies it under `.agents/<repo-path>` for Claude,
Codex, Copilot, and Cursor; Cursor's `.cursor/rules/` bootstrap uses the stable
`.agents/directives/references/adaptive-routing-detail.md` path. Install conflict
preflight covers the bootstrap and all scripts/assets atomically. `check` compares
source and installed content rather than accepting existence alone.
Install and check operations reject symlinked or non-directory ancestors under
the project root, including `.agents`, nested `.agents` paths, and `.cursor`;
they never follow those ancestors, even with `--force`. Force only suppresses
conflicts it repairs, so an unrepaired directory or special-file conflict still
produces a nonzero exit.

Obvious Light, Review, and Exploration work uses only the bootstrap. Ambiguous,
composite, high-risk, Full, Debugging, Boundary, Policy, and Workspace-Isolation
routes load the companion before implementation or merge readiness.

## Consequences

- Required router context stays below the 12 KB / characters-per-four estimate.
- Lazy detail remains deterministic and safe after noninteractive sync.
- `assets` remains separate from executable `scripts`, preserving script modes
  and keeping prompt-load semantics out of the manifest's required-entry count.
- Future bootstraps may use the same validated companion mechanism when they
  need installed, non-executable supporting guidance.
