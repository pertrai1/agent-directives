# Agent Directives

A collection of reusable directives, skills, and templates for AI coding agents.
Extract the parts you need, drop them into your project, and customize the
placeholders. Everything works standalone — no framework lock-in, no hidden
dependencies between files.

## What's Included

| Category | Files | What they do |
|----------|-------|--------------|
| **Workflow** | 10 directives | Govern how the agent works: adaptive routing, workspace isolation, context handoff, TDD, type-first, spec-driven, verification, task framing, exploration, architecture boundaries |
| **Navigation** | 1 directive | SAFE pattern for exploring codebases before implementation |
| **Memory** | 2 directives | Error memory and session decisions for persistent learning |
| **Skills** | 13 skills | Code reviewer, test reviewer, spec reviewer, product requirements writer, implementation task planner, subagent-driven development, self-audit, systematic debugging, architecture boundary reviewer, codebase health reviewer, production readiness reviewer, harness hooks reviewer, and MCP integration reviewer |
| **Templates** | 4 templates | Drop-in instruction files for AGENTS.md, CLAUDE.md, Copilot, and decision logs |
| **Tooling** | TypeScript scripts | Validate directive wiring, assemble eval scenarios, record loaded-file manifests, and generate eval health reports |

## Quick Start

The repository contains two things you install into your own project:

1. **Directive and skill files** — copied from `directives/` and `skills/`.
2. **A root instruction file** — copied from `templates/` and renamed for your agent
   (`AGENTS.md`, `CLAUDE.md`, or `.github/copilot-instructions.md`).

For a typical Codex/OpenAI-style project, run these commands from the repository
that should receive the instructions:

```bash
cd /path/to/your-project

# Install the required directives and skills into ./directives and ./skills.
npx --yes github:pertrai1/agent-directives sync --tool codex --yes

# Add the root instruction file, then edit every <!-- FILL IN: ... --> placeholder.
curl -fsSL \
  https://raw.githubusercontent.com/pertrai1/agent-directives/main/templates/AGENTS.md \
  -o AGENTS.md
```

If your project already has an `AGENTS.md`, `CLAUDE.md`, or Copilot instruction
file, do not overwrite it blindly. Merge the relevant sections from the matching
template instead.

After installation, open the root instruction file and:

1. Fill in the project-specific placeholders.
2. Keep `directives/adaptive-routing.md` as the first directive the agent loads.
3. Delete directives or skills your team does not want, then remove matching rows
   from the root instruction file.
4. Run the check command for your target tool:

```bash
npx --yes github:pertrai1/agent-directives check --tool codex
```

## Installing for Different Tools

| Tool | Install directives/skills | Root instruction file |
| --- | --- | --- |
| Codex / OpenAI agents | `npx --yes github:pertrai1/agent-directives sync --tool codex --yes` | `templates/AGENTS.md` → `AGENTS.md` |
| Claude Code | `npx --yes github:pertrai1/agent-directives sync --tool claude --yes` | `templates/CLAUDE.md` → `CLAUDE.md` |
| GitHub Copilot | `npx --yes github:pertrai1/agent-directives sync --tool copilot --yes` | `templates/copilot-instructions.md` → `.github/copilot-instructions.md` |
| Cursor | `npx --yes github:pertrai1/agent-directives sync --tool cursor --yes` | Installed as `.cursor/rules/*.mdc` |

When `--tool` is omitted, the CLI tries to auto-detect the target from marker
files in the current directory. Passing `--tool` is safer for first-time setup.

## CLI Reference

The `agent-directives` CLI reads `manifest.json` and copies the requested entries
into the current working directory. Use it from the project that should receive
the files.

### Commands

```bash
npx --yes github:pertrai1/agent-directives list                 # List all entries
npx --yes github:pertrai1/agent-directives list --required      # Only required entries
npx --yes github:pertrai1/agent-directives list --category review
npx --yes github:pertrai1/agent-directives list --tool cursor
npx --yes github:pertrai1/agent-directives list --type skill

npx --yes github:pertrai1/agent-directives add code-reviewer --tool claude
npx --yes github:pertrai1/agent-directives add code-reviewer --tool claude --force

npx --yes github:pertrai1/agent-directives check --tool codex
npx --yes github:pertrai1/agent-directives context-audit --tool codex --required
npx --yes github:pertrai1/agent-directives context-audit --tool codex --required --max-tokens 12000
npx --yes github:pertrai1/agent-directives sync --tool claude --yes
npx --yes github:pertrai1/agent-directives sync --tool claude --force
```

### Context budget audit

Use `context-audit` to estimate how much prompt budget a tool/profile consumes before copying instructions into a project:

```bash
npx --yes github:pertrai1/agent-directives context-audit --tool codex --required
npx --yes github:pertrai1/agent-directives context-audit --tool claude --max-tokens 20000
```

The estimate uses a simple `characters / 4` heuristic and reports total tokens, required vs optional counts, and the largest directive/skill files. With `--max-tokens`, the command exits non-zero when the selected entries exceed the budget, making it usable in CI.

### Tool auto-detection

When `--tool` is omitted, the CLI inspects the current directory for marker files:

| Marker | Tool |
| --- | --- |
| `.cursor/` | `cursor` |
| `.github/copilot-instructions.md` | `copilot` |
| `AGENTS.md` | `codex` |
| `CLAUDE.md` or `.claude/` | `claude` |

Pass `--tool` explicitly when auto-detection is ambiguous or wrong.

### Install layout

For `claude`, `copilot`, and `codex`, the CLI preserves the source layout — each
entry is written to its declared path (`directives/<name>.md` or
`skills/<name>/SKILL.md`) relative to the current working directory. The root
instruction file is left to you so existing project instructions are not
accidentally overwritten.

For `cursor`, each entry is flattened to a single file in `.cursor/rules/<id>.mdc`.

### Conflict handling

`agent-directives add` and `agent-directives sync` never silently overwrite a locally-modified file. If a target file already exists with content that differs from the source, the CLI reports a conflict and exits non-zero unless `--force` is passed. Files that already match the source are reported as `already up-to-date` and skipped.

### Local development

```bash
npm install
npm run cli -- list                       # invoke the CLI via npm
npm run test:cli                          # run CLI integration tests
```

## Directives vs Skills

| | Directive | Skill |
|---|---|---|
| **Nature** | Rule you follow | Persona you adopt |
| **When** | At a workflow phase | For a task type |
| **Output** | Constrained behavior | Structured findings |
| **Tone** | "Never do X" / "Always do Y" | "You are a specialist in..." |
| **Format** | Rules + forbidden patterns table | Frontmatter + review process + output format |

## Directives

### Adaptive Routing (`directives/adaptive-routing.md`)

Runs first and selects the lightest safe workflow based on task intent, risk,
and touched surfaces. Prevents loading every directive by default while still
escalating to Full, Debugging, Boundary, Review, Exploration, or Policy paths
when the task requires stronger evidence.

### Workspace Isolation (`directives/workspace-isolation.md`)

Protects mutable work from leaking into a shared checkout. Detects existing
isolation first, prefers native workspace/worktree tooling when available, falls
back to `git worktree` only when needed, and requires setup/baseline proof in the
workspace where implementation will actually run.


### Context Handoff (`directives/context-handoff.md`)

Compacts task state at directive, phase, PR, or session boundaries so later phases
can continue from a current handoff instead of accumulated chat history. Defines
`.agents/handoff.md` as the preferred active handoff file, rewrites it instead of
appending forever, and treats optional handoff logs as historical rather than
authoritative.

### Test-Driven Development (`directives/test-driven-development.md`)

Strict RED/GREEN/REFACTOR cycle for behavior-changing code. Defines TDD rules, a
forbidden-patterns table, and makes TDD the default for fixes and review changes
that affect runtime behavior — while allowing adaptive routing to choose a lighter
path for purely mechanical or non-behavioral edits.

### Type-First Development (`directives/type-driven-development.md`)

Define types before writing implementation code. Five-step flow: check, define,
verify, confirm (for complex types), and hand off to TDD. Keeps type-check
commands generic with TypeScript as an example.

### Task Framing (`directives/task-framing.md`)

Intake checklist for non-trivial work. Eight-point framing checklist that
catches ambiguous requirements before implementation starts. Defines when a
proposal must precede implementation.

### Codebase Navigation (`directives/codebase-navigation.md`)

SAFE exploration pattern (Survey, Anchor, Filter, Execute) with token budgets.
Five context-discipline rules that prevent the agent from reading too much
irrelevant code before starting work.

### Architecture Boundaries (`directives/architecture-boundaries.md`)

Preserve the project's directed architecture graph before changing imports,
exports, folders, packages, services, or shared code. Requires agents to classify
touched files into zones, identify changed dependency edges, and verify no upward,
sideways, cyclic, or public-API-bypassing dependency was introduced. Includes
optional Fallow and GitNexus checks for tool-assisted boundary evidence.

### Exploration Mode (`directives/exploration-mode.md`)

Pre-implementation investigation stance for thinking through problems before
committing to an approach. Curious, grounded, visual — no code during exploration.
Fills the gap between codebase navigation (how to search) and task framing
(how to scope).

### Specification-Driven Development (`directives/specification-driven-development.md`)

Write specifications before code, implement against specs, verify after.
Five-phase loop: propose, design, specify, implement, verify. Operates above
TDD (correctness) and type-driven (shapes) — this directive defines what and why.

### Verification Protocol (`directives/verification.md`)

Structured evidence of correctness before running quality gates. Produces a
verification summary a reviewer can scan in 30 seconds. Generic proof framework
covering functional, test coverage, integration, and documentation proof.

### Error Memory (`directives/error-memory.md`)

Persistent memory for repeated mistakes. Four-condition write criteria prevent
the agent from logging trivial errors. Includes compaction pipeline and monthly
review with retirement mechanism.

### Session Decisions (`directives/session-decisions.md`)

Durable decision capture at task completion. Four-condition write criteria, YAML
frontmatter schema for retrieval, progressive-disclosure workflow, and five
required sections (Title, Context, Decision, Rejected Alternatives, Consequences).

## Skills

### Code Reviewer (`skills/code-reviewer/SKILL.md`)

Baseline review skill for pull requests, branches, diffs, and local changes.
Checks correctness, security, performance, maintainability, tests, and merge risk
without inventing findings when the change is clean.

### Test Reviewer (`skills/test-reviewer/SKILL.md`)

Detects tests that duplicate production logic, use shallow assertions, skip edge
cases, or assert on mocks instead of behavior. Six-step review process with
output format for flagged tests.

### Spec Reviewer (`skills/spec-reviewer/SKILL.md`)

Reviews implementation against written specifications. Three-dimensional check:
completeness (all requirements implemented), correctness (code matches spec
intent), and coherence (design decisions followed). Natural pairing with
test-reviewer — one reviews tests, the other reviews implementation against specs.

### Product Requirements Writer (`skills/product-requirements-writer/SKILL.md`)

Turns rough feature ideas, product requests, vague requirements, or problem
statements into concrete PRDs/specs before implementation planning. Asks only
essential clarifying questions, captures goals and non-goals, and stops before
coding.

### Implementation Task Planner (`skills/implementation-task-planner/SKILL.md`)

Turns a PRD, issue, acceptance criteria, or requirements document into a staged
implementation task list with relevant files, likely tests, validation gates, and
review checkpoints. Grounds file paths in repo evidence or marks them tentative.

### Subagent-Driven Development (`skills/subagent-driven-development/SKILL.md`)

Executes an existing implementation plan through delegated subagents or isolated
worker sessions while the parent agent owns task slicing, scope, review,
integration, and final verification. Prevents unsafe parallel writes and requires
self-contained worker prompts.

### Self-Audit (`skills/self-audit/SKILL.md`)

Triage point between TDD and verification. After GREEN/REFACTOR, identifies the
single weakest assumption (Jenga Test), logs anomalies that passing tests mask,
and checks for sunk-cost trajectory across cycles. Each finding is routed: fix
now (loop back to RED), document for the PR reviewer, or ask the human. Output
goes in the PR body before the verification section.

### Systematic Debugging (`skills/systematic-debugging/SKILL.md`)

Root-cause debugging process for bugs, failing tests, CI failures, regressions,
flaky behavior, and unexpected system behavior. Four phases — reproduce and
observe, localize the fault, form and test one hypothesis, then fix and prove —
prevent guess-and-check patches and require evidence before code changes.

### Architecture Boundary Reviewer (`skills/architecture-boundary-reviewer/SKILL.md`)

Reviews whether a change preserves architectural zones, dependency direction,
public APIs, package/service boundaries, and DAG constraints. Catches illegal
imports, public API bypasses, cycles, and shared-code pollution that tests may
not reveal.

### Codebase Health Reviewer (`skills/codebase-health-reviewer/SKILL.md`)

Interprets Fallow and fallback static-analysis output for TypeScript/JavaScript
codebase health: dead code, duplication, complexity, circular dependencies,
boundary violations, and architecture drift. Separates new regressions from
pre-existing cleanup follow-ups.

### Production Readiness Reviewer (`skills/production-readiness-reviewer/SKILL.md`)

Reviews whether working code is safe to ship and operate when a change touches
persistence, external services, async jobs, auth/security/privacy, infra/config,
critical user paths, performance/scale, or cross-service compatibility. Focuses
on failure modes, observability, rollback/recovery, data safety, compatibility,
and scale.

### Harness Hooks Reviewer (`skills/harness-hooks-reviewer/SKILL.md`)

Reviews agent harness hooks and deterministic automation such as start/stop hooks,
pre-action policy gates, post-change checks, and session logging. Focuses on
trigger scope, side effects, failure modes, timeouts, secret handling, and whether
the hook enforces deterministic behavior rather than vague prompt policy.

### MCP Integration Reviewer (`skills/mcp-integration-reviewer/SKILL.md`)

Reviews MCP servers and agent-accessible tool surfaces such as internal API
bridges, structured search, docs/ticketing/analytics connectors, schemas, and
write-capable tools. Focuses on tool routing, strict validation, least privilege,
bounded output, auditability, write safety, and operational failure behavior.

## Templates

| Template | For | Key difference |
|----------|-----|----------------|
| `templates/AGENTS.md` | Codex / general agents | Full directive table with file paths, boundary step, skills table |
| `templates/CLAUDE.md` | Claude Code | Directives by name with one-line descriptions |
| `templates/copilot-instructions.md` | GitHub Copilot | Condensed — key rules inlined, points to directives/ for details |
| `templates/decision-log.md` | Any | Blank template matching the session-decisions frontmatter schema |

## Customization

These directives are opinionated defaults. Adjust them to fit your project:

- **Remove what you don't need** — if your project doesn't use TypeScript, drop type-driven-development
- **Relax rules for prototyping** — TDD and verification can slow down throwaway work
- **Add project-specific sections** — the templates have placeholder rows for extra commands
- **Change thresholds** — token budgets in codebase-navigation, condition counts in error-memory

Every directive works standalone. There are no hidden runtime dependencies. Directive
and skill frontmatter fields provide machine-readable routing hints, but the
markdown body remains the source of truth for human-readable instructions. Some
directives intentionally reference optional follow-on phases, such as context
handoff after long or multi-phase work.

## Tool Compatibility

These files work with any tool that reads markdown instructions:

- **Claude Code** — drop into project root as `CLAUDE.md` or load from `.claude/`
- **GitHub Copilot** — use as `.github/copilot-instructions.md`
- **Codex / OpenAI agents** — use as `AGENTS.md`
- **Cursor / Windsurf / other IDE agents** — load from the tool's instruction directory

No special syntax, no tool-specific features required. Just markdown.
