# Agent Directives

## Five non-negotiables

- Surface assumptions before building. Wrong assumptions held silently are the most common failure mode.
- Stop and ask when requirements conflict. Don’t guess.
- Push back when warranted. The agent (or engineer) is not a yes-machine.
- Prefer the boring, obvious solution. Cleverness is expensive.
- Touch only what you’re asked to touch.

## Why

This repository is a portable library of AI coding-agent instructions: reusable directives, specialist skills, eval scenarios, and drop-in templates for tools such as Codex, Claude Code, GitHub Copilot, Cursor, and similar agents. The project exists to make agent behavior more reliable without locking users into a framework.

## What

- Content-first Markdown repository; there is no package manager, build artifact, or runtime application.
- Markdown files directly under `directives/`, such as `directives/adaptive-routing.md`, define workflow rules an agent follows during phases such as routing, workspace isolation, exploration, TDD, verification, and handoff.
- `SKILL.md` files one directory below `skills/`, such as `skills/code-reviewer/SKILL.md`, define specialist personas/review processes with YAML frontmatter metadata.
- Markdown files one directory below each rule pack in `rules/`, such as `rules/angular/components-and-templates.md`, define lazy-loaded stack or project standards.
- `templates/` contains starter instruction files for different agent tools.
- `evals/` contains manual scenario-based evaluations plus a helper script for assembling directive/skill context.

## Commands

| Command                                 | Purpose                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `git status --short`                    | Baseline check before edits and final cleanliness check.                                        |
| `git diff --check`                      | Detect whitespace errors in changed files.                                                      |
| `npm install`                           | Install TypeScript tooling for repo scripts.                                                    |
| `npm run check`                         | Type-check TypeScript scripts and validate directive/skill wiring.                              |
| `npm run eval:report`                   | Regenerate `evals/results/report.html` from structured eval results and run manifests.          |
| `bash -n evals/run-scenario.sh`         | Syntax-check the eval wrapper when touched.                                                     |
| `evals/run-scenario.sh <scenario-name>` | Manually exercise a directive/skill scenario in a temporary workspace and write a run manifest. |

Repo automation should be written in TypeScript. Avoid adding new Python scripts; if a small one-off check is needed, prefer `npm run validate` or a temporary Node/TypeScript snippet.

There is no global application build command for this content-first repository today. Choose the smallest evidence that matches the touched files and state when a check is not applicable.

## Mandatory Workflow

**NEVER commit directly to `main`.** Work on a feature branch. No exceptions.

**Load `directives/adaptive-routing.md` first.**

The root file provides project-specific context plus compact routing pointers: commands, repo layout, local constraints, and any client-specific workflow reminders.

Workflow path selection, directive loading, skill loading, rule selection, and evidence requirements live in `directives/adaptive-routing.md`.

After routing, report:
`Route: <path>; using <directive/skill files>; rules: <rule files or none>; evidence: <checks>.`

When adaptive routing selects Full Path or another route that invokes the full
phase sequence, no skipping steps:

| Step | Phase          | Action                                                    | Verify                                                                                                           |
| ---- | -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| -1   | **ORIENT**     | **Navigate codebase safely**                              | See `directives/codebase-navigation.md` (SAFE pattern)                                                           |
| -0.5 | **BOUNDARIES** | **Classify touched files and dependency edges**           | See `directives/architecture-boundaries.md` when file paths, template references, or dependency edges may change |
| 0    | **BASELINE**   | **Verify starting state is clean**                        | `git status --short` and relevant existing scenario/docs inspected                                               |
| 1    | TYPES/METADATA | Define metadata/schema expectations first                 | Frontmatter/routing metadata shape is known before editing                                                       |
| 2    | RED            | Identify or create failing evidence when behavior changes | Existing scenario/check fails or a new scenario documents the gap                                                |
| 3    | GREEN          | Make the minimum change to satisfy the evidence           | Scenario/checklist or validator now passes/reviews cleanly                                                       |
| 4    | REFACTOR       | Clean up if needed                                        | Markdown remains concise and references stay consistent                                                          |
| 4.5  | **SELF-AUDIT** | **Triage weakest assumptions and anomalies**              | See `skills/self-audit/SKILL.md` — route findings: 🔁 fix, 📋 document, or 🧑 ask human                          |
| 4.75 | **VERIFY**     | **Produce verification summary**                          | See `directives/verification.md` for command output and evidence                                                 |
| 5    | GATES          | Run quality gates                                         | `git diff --check`, plus `bash -n evals/run-scenario.sh` if touched, plus metadata/path validation when relevant |
| 5.5  | **HANDOFF**    | **Compact current task state when routed**                | See `directives/context-handoff.md` for phase/session handoff                                                    |
| 6    | COMMIT         | Atomic commit                                             | One behavior or document scope; one inseparable eligible batch is allowed                                       |

Steps 2–6 repeat for each behavior. Do not batch unrelated directive or skill
changes; only an explicitly eligible Small Batch may amortize the outer cycle
while retaining its batch spec, matrix, and per-row proof.

## Directives (Routed)

Run adaptive routing first, then load the directives selected for the task phase.
They govern **how** you work. Do not load unrelated directives just to satisfy ceremony.

| Directive                        | What it governs                                                                         | File                                             |
| -------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Adaptive Routing                 | Selects workflow path and required directives/skills                                    | `directives/adaptive-routing.md`                 |
| Agent Permissions                | Defines agent read/write/command/network permission boundaries and escalation behavior  | `directives/agent-permissions.md`                |
| Workspace Isolation              | Protect mutable work with an isolated workspace; prefer native tools, then git fallback | `directives/workspace-isolation.md`              |
| Codebase Navigation              | SAFE exploration before implementation, review, or unfamiliar work                      | `directives/codebase-navigation.md`              |
| Architecture Boundaries          | Preserve dependency DAG, public APIs, imports/exports, and file reference integrity     | `directives/architecture-boundaries.md`          |
| Exploration Mode                 | Pre-implementation investigation stance                                                 | `directives/exploration-mode.md`                 |
| Task Framing                     | Intake checklist for non-trivial, ambiguous, high-risk, or cross-cutting work           | `directives/task-framing.md`                     |
| Specification-Driven Development | Write specs before larger changes where build-and-see would risk rework                 | `directives/specification-driven-development.md` |
| Type-First Development           | Define types/contracts/metadata before implementation                                   | `directives/type-driven-development.md`          |
| Test-Driven Development          | RED/GREEN/REFACTOR for behavior-changing implementation or fixes                        | `directives/test-driven-development.md`          |
| Verification Protocol            | Evidence of correctness before gates and PRs                                            | `directives/verification.md`                     |
| Error Memory                     | Durable memory for repeated mistakes only when criteria are met                         | `directives/error-memory.md`                     |
| Context Handoff                  | Compact current task state at phase/session boundaries                                  | `directives/context-handoff.md`                  |
| Session Decisions                | Durable decision capture for repo policy/workflow changes                               | `directives/session-decisions.md`                |

## Skills (Mandatory)

Load the relevant skill selected by adaptive routing before performing any task it covers.

| Skill                          | When                                                                                                                                                                                                                  | File                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Code Reviewer                  | Before reviewing pull requests, branches, diffs, or local changes for merge risk                                                                                                                                      | `skills/code-reviewer/SKILL.md`                  |
| Adversarial Reviewer           | Before explicit adversarial/red-team/failure-mode review or high-risk, broad, or agent-authored changes needing a separate skeptical reviewer                                                                         | `skills/adversarial-reviewer/SKILL.md`           |
| Test Reviewer                  | Before writing or reviewing eval scenarios, tests, or test-like checklists                                                                                                                                            | `skills/test-reviewer/SKILL.md`                  |
| Spec Reviewer                  | Before merging when a written spec or requirements document governs the change                                                                                                                                        | `skills/spec-reviewer/SKILL.md`                  |
| Product Requirements Writer    | Before turning a feature idea, product request, or vague requirement into a PRD/spec                                                                                                                                  | `skills/product-requirements-writer/SKILL.md`    |
| Implementation Task Planner    | Before turning a PRD, issue, acceptance criteria, or requirements doc into implementation tasks                                                                                                                       | `skills/implementation-task-planner/SKILL.md`    |
| Subagent-Driven Development    | Before executing an existing implementation plan through delegated subagents or isolated worker sessions                                                                                                              | `skills/subagent-driven-development/SKILL.md`    |
| Self-Audit                     | After REFACTOR, before VERIFY for Full Path work                                                                                                                                                                      | `skills/self-audit/SKILL.md`                     |
| Systematic Debugging           | Before fixing bugs, failing tests, CI/build failures, regressions, or integration failures                                                                                                                            | `skills/systematic-debugging/SKILL.md`           |
| Architecture Boundary Reviewer | Before merging changes to imports, exports, packages, services, shared code, file layout, or template/reference paths                                                                                                 | `skills/architecture-boundary-reviewer/SKILL.md` |
| Codebase Health Reviewer       | Before merging TypeScript/JavaScript refactors, cleanup, shared utilities, or Fallow-relevant changes                                                                                                                 | `skills/codebase-health-reviewer/SKILL.md`       |
| Production Readiness Reviewer  | Before merging/reviewing production-sensitive changes: persistence, external services, async jobs, auth/security/privacy, infra/config/deploy, critical user paths, performance/scale, or cross-service compatibility | `skills/production-readiness-reviewer/SKILL.md`  |
| Harness Hooks Reviewer         | Before adding/reviewing agent harness hooks, start/stop hooks, pre-action hooks, or deterministic agent automation                                                                         | `skills/harness-hooks-reviewer/SKILL.md`         |
| MCP Integration Reviewer       | Before adding/reviewing MCP servers/tools, agent tool schemas, internal API bridges, or write-capable agent tools                                                                          | `skills/mcp-integration-reviewer/SKILL.md`       |

## Task Framing (Mandatory for Non-Trivial Work)

Before implementing a non-trivial, ambiguous, high-risk, or cross-cutting task,
load and follow `directives/task-framing.md`. This directive defines the minimum
framing checklist, when a proposal must precede implementation, and which
supporting docs are supplemental rather than binding.

## Decision Log Lookup

Before changing repo policy, contributor workflow, or any cross-cutting
convention, scan frontmatter in Markdown files directly under `docs/decisions/`
if that directory exists and load matching active entries. Progressive disclosure
— do not bulk-read every record.

## Repo-Specific Guidance

- Prefer small, consistency-preserving Markdown edits over broad rewrites.
- Keep frontmatter, prose, template tables, README summaries, and eval scenarios aligned when routing semantics change.
- Treat `templates/` as user-facing examples. If the root `AGENTS.md` discovers a repo-specific convention that should be reusable, consider whether the template should also change.
- Treat Markdown files directly under `evals/scenarios/` as behavioral tests for instructions. When changing Markdown files directly under `directives/` or `SKILL.md` files one directory below `skills/`, update an existing scenario or add a targeted one if the change affects routing, required outputs, review heuristics, decision points, or expected agent behavior. Skip eval churn for typo fixes, formatting, frontmatter-only cleanup with no routing effect, or wording that does not change behavior; note the reason in the PR summary.
- Bump the frontmatter `version` for every existing Markdown file directly under `directives/` or `SKILL.md` file one directory below `skills/` changed in a PR. Use patch for wording or behavior-tightening, minor for new heuristics/routing/evidence coverage, and major for incompatible routing/schema/path changes. Raw deletions are rejected; deprecate with a major version bump before deletion. `npm run version:check` enforces this against the base branch.
- For eval scenario changes, verify setup with `npm run eval:scenario -- --print-only <scenario-name>` and remove generated run artifacts under `evals/results/runs/` before committing unless intentionally updating committed results.
- If a validation schema is implied but not implemented, use a short script to verify the relevant invariant and include the script output in the PR summary.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

Follow this section only when this repository is configured for GitNexus, such as
when `.gitnexus/meta.json` exists or GitNexus MCP/CLI tools are available. If the
repository is not using GitNexus, ignore this section and use the normal
codebase-navigation, architecture-boundary, review, and verification guidance
selected by adaptive routing.

This project is indexed by GitNexus as **agent-directives** (917 symbols, 999
relationships, 3 execution flows). Use the local GitNexus CLI/MCP tools to
understand code, assess impact, and navigate safely.

Run GitNexus directly with `npx gitnexus ...` or the already-configured MCP tools.
Do **not** install GitNexus skills, run `gitnexus setup`, or modify agent
instruction files to use GitNexus. If a GitNexus command creates or changes
agent files such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`,
or `.cursor/rules/**`, treat those changes as tool side effects and revert them
unless the user explicitly asked to update agent files.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first, then revert any unrelated agent-file side effects.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/agent-directives/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool             | When to use                   | Command                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `query`          | Find code by concept          | `gitnexus_query({query: "auth validation"})`                            |
| `context`        | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})`                              |
| `impact`         | Blast radius before editing   | `gitnexus_impact({target: "X", direction: "upstream"})`                 |
| `detect_changes` | Pre-commit scope check        | `gitnexus_detect_changes({scope: "staged"})`                            |
| `rename`         | Safe multi-file rename        | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher`         | Custom graph queries          | `gitnexus_cypher({query: "MATCH ..."})`                                 |

## Impact Risk Levels

| Depth | Meaning                               | Action                |
| ----- | ------------------------------------- | --------------------- |
| d=1   | WILL BREAK — direct callers/importers | MUST update these     |
| d=2   | LIKELY AFFECTED — indirect deps       | Should test           |
| d=3   | MAY NEED TESTING — transitive         | Test if critical path |

## Resources

| Resource                                          | Use for                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/agent-directives/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/agent-directives/clusters`       | All functional areas                     |
| `gitnexus://repo/agent-directives/processes`      | All execution flows                      |
| `gitnexus://repo/agent-directives/process/{name}` | Step-by-step execution trace             |

## Self-Check Before Finishing

Before completing any code modification task, verify:

1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update the index only:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

Do not run setup or install/update GitNexus agent skills while refreshing the
index. If an analyze hook or tool side effect modifies agent instruction files,
revert those unrelated changes before continuing.

## CLI

Use the local CLI directly when MCP helpers are unavailable:

```bash
npx gitnexus status
npx gitnexus query "concept"
npx gitnexus context SymbolName
npx gitnexus impact SymbolName --direction upstream
```

Do not install GitNexus skills or update agent files as part of normal GitNexus
usage in this repository.

<!-- gitnexus:end -->
