---
name: session-decisions
description: Captures durable decisions for repo policy, architecture, workflow, and cross-cutting conventions.
version: 1.3.0
scripts:
  - scripts/decisions-index.sh
required: false
category: memory
tools:
  - claude
  - codex
triggers:
  - policy-change
  - architecture-decision
  - workflow-change
  - cross-cutting-convention
routing:
  load: conditional
---

# Session Decisions Directive

**When to load:** When changing repository policy, architecture, contributor
workflow, or a cross-cutting convention.

## Decision Threshold

Write a decision record at task completion only when all are true:

1. the choice establishes or confirms a durable cross-file/repo rule;
2. at least two plausible alternatives existed;
3. the reason is not obvious from the diff;
4. a future agent would likely re-decide or reverse it without context.

Do not log routine fixes, directive-mandated behavior, local naming, obvious
standard-library choices, one-off refactors, or implementation detail already
clear in code/comments.

## Command-First Retrieval

Before cross-cutting work, list only matching active metadata:

```bash
agent-directives agent-state decisions list \
  --domain <domain> \
  --trigger <trigger> \
  --path <affected-path> \
  --format json
```

Use only relevant filters; then open the bodies of matching records. The command
orders records newest-first and does not emit decision bodies in the index.
Missing directories and malformed active metadata remain visible diagnostics.

If the CLI is unavailable, use
`.agents/directives/scripts/decisions-index.sh --active`, then filter the index.
As a final fallback, scan only frontmatter under `docs/decisions/`. Never bulk
load every body.

## Create Without Guessing the Schema

The preferred source template remains `.agents/templates/decision-log.md` (or a
project-owned `docs/decisions/TEMPLATE.md`). The CLI can render an in-memory
proposal without writing:

```bash
agent-directives agent-state decisions template \
  --date YYYY-MM-DD \
  --task "<task>" \
  --domain <domain> \
  --kind <repo-policy|process|architecture|code-convention> \
  --scope <repo|cross-cutting|subtree> \
  --trigger "<retrieval trigger>" \
  --applies-to "<path-or-glob>"
```

Choose the target explicitly:

```text
docs/decisions/YYYY-MM-DD-<decision-domain>.md
```

The topic names the domain, not the chosen outcome. Fill the title and the
required sections: Context, Decision, Rejected Alternatives, and Consequences.
Consequences should cover easier, harder, watch-for, and any context-dependent
assumption future work must unlearn.

Required frontmatter fields are `date`, `task`, `domain`, `kind`, `scope`,
`status`, `triggers`, `applies_to`, and `supersedes`. Keep them operational and
short.

## Validate Before Delivery

```bash
agent-directives agent-state decisions validate \
  docs/decisions/YYYY-MM-DD-<decision-domain>.md \
  --format json
```

Exit `1` means malformed date/name/frontmatter, missing sections, placeholders,
invalid enum values, or a broken supersession reference. Fix findings before
commit. The command never decides whether the underlying choice was wise; review
the reasoning and rejected alternatives manually.

## Required Reasoning Quality

- **Context:** why this was a real choice and which constraints mattered.
- **Decision:** specific properties that made the option preferable.
- **Rejected Alternatives:** at least one plausible option and why it lost.
- **Consequences:** trade-offs and assumptions future work must recheck.

Do not write “we chose the best approach,” leave placeholders, duplicate code
comments, or write the record before consequences are known.

The command replaces indexing, filtering, scaffolding, and schema validation.
This directive still owns whether a record is warranted and whether its reasoning
is durable and honest.
