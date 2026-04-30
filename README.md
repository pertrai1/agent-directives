# Agent Directives

A collection of reusable directives, skills, and templates for AI coding agents.
Extract the parts you need, drop them into your project, and customize the
placeholders. Everything works standalone — no framework lock-in, no hidden
dependencies between files.

## What's Included

| Category | Files | What they do |
|----------|-------|--------------|
| **Workflow** | 7 directives | Govern how the agent works: TDD, type-first, spec-driven, verification, task framing, exploration, architecture boundaries |
| **Navigation** | 1 directive | SAFE pattern for exploring codebases before implementation |
| **Memory** | 2 directives | Error memory and session decisions for persistent learning |
| **Skills** | 6 skills | Test reviewer, spec reviewer, self-audit, systematic debugging, architecture boundary reviewer, and codebase health reviewer |
| **Templates** | 4 templates | Drop-in instruction files for AGENTS.md, CLAUDE.md, Copilot, and decision logs |

## Quick Start

1. **Copy directives** into your project — e.g. `.agents/directives/` or any directory your agent reads
2. **Copy skills** alongside them — e.g. `.agents/skills/`
3. **Pick a template** — `AGENTS.md`, `CLAUDE.md`, or `copilot-instructions.md` depending on your tool
4. **Fill in the placeholders** — every `<!-- FILL IN: ... -->` is a project-specific value you need to provide
5. **Customize** — remove directives you don't need, adjust rules to match your team's conventions

## Directives vs Skills

| | Directive | Skill |
|---|---|---|
| **Nature** | Rule you follow | Persona you adopt |
| **When** | At a workflow phase | For a task type |
| **Output** | Constrained behavior | Structured findings |
| **Tone** | "Never do X" / "Always do Y" | "You are a specialist in..." |
| **Format** | Rules + forbidden patterns table | Frontmatter + review process + output format |

## Directives

### Test-Driven Development (`directives/test-driven-development.md`)

Strict RED/GREEN/REFACTOR cycle for all code changes. Defines 7 TDD rules, a
forbidden-patterns table, and makes TDD mandatory for fixes and review changes
too — not just new features.

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

### Test Reviewer (`skills/test-reviewer/SKILL.md`)

Detects tests that duplicate production logic, use shallow assertions, skip edge
cases, or assert on mocks instead of behavior. Six-step review process with
output format for flagged tests.

### Spec Reviewer (`skills/spec-reviewer/SKILL.md`)

Reviews implementation against written specifications. Three-dimensional check:
completeness (all requirements implemented), correctness (code matches spec
intent), and coherence (design decisions followed). Natural pairing with
test-reviewer — one reviews tests, the other reviews implementation against specs.

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

Every directive works standalone. There are no cross-file dependencies.

## Tool Compatibility

These files work with any tool that reads markdown instructions:

- **Claude Code** — drop into project root as `CLAUDE.md` or load from `.claude/`
- **GitHub Copilot** — use as `.github/copilot-instructions.md`
- **Codex / OpenAI agents** — use as `AGENTS.md`
- **Cursor / Windsurf / other IDE agents** — load from the tool's instruction directory

No special syntax, no tool-specific features required. Just markdown.
