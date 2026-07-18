---
"agent-directives": minor
---

Install directive/skill helper scripts during sync. Entries can now declare a `scripts:` frontmatter list, and `sync`/`add` copy those scripts (executable, under `.agents/`) alongside the instruction file so downstream projects actually get them. Ships four scripts referenced by the verification, session-decisions, context-handoff directives and the code-reviewer skill: `gates.sh` (capped quality-gate runner), `diff.sh` (scoped review diff), `decisions-index.sh` (decision-log frontmatter index), and `handoff-state.sh` (git state snapshot).
