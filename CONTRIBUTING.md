# Contributing to agent-directives

Thanks for contributing. This repo distributes reusable directives, skills, and templates for AI coding agents. The bar for adding something here is: **useful to more than one project, deliberately scoped, and validated by the existing tooling**.

## What this repo contains

| Type | Lives in | Role |
| --- | --- | --- |
| **Directive** | `directives/*.md` | A rule the agent follows at a workflow phase (TDD, verification, routing, etc.) |
| **Skill** | `skills/<id>/SKILL.md` | A persona the agent adopts for a specific task type (code review, debugging, etc.) |
| **Template** | `templates/*.md` | A drop-in instruction file for a specific tool (Claude, Copilot, Codex) |
| **Eval scenario** | `evals/scenarios/*.md` | A regression test that exercises a directive or skill under a realistic prompt |

If your contribution doesn't fit one of these, open an issue first to discuss.

## Adding a new directive or skill

1. **Create the file** in the right location:
   - Directive: `directives/<kebab-case-name>.md`
   - Skill: `skills/<kebab-case-name>/SKILL.md`
2. **Add the frontmatter** (see schema below).
3. **Write the body** following the conventions in existing files.
4. **Regenerate the manifest:** `npm run manifest`
5. **Validate:** `npm run validate`
6. **Mention the entry** in `directives/adaptive-routing.md` so the router knows when to load it (only for skills; directives don't need this).
7. **Open a PR** using the template — fill out the checklist.

## Frontmatter contract

Every directive and skill must declare these fields. The validator and the manifest generator both enforce them.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Must match the file/directory name exactly |
| `description` | string | One sentence explaining when to load this entry |
| `version` | string | Semver, start at `1.0.0` |
| `required` | boolean | `true` if everyone should load this by default; `false` for opt-in |
| `category` | string | One of: `workflow`, `architecture`, `memory`, `testing`, `review`, `planning`, `debugging` |
| `tools` | string[] | Subset of: `claude`, `copilot`, `codex`, `cursor` (must contain at least one) |
| `triggers` | string[] | Keywords that should auto-load this entry (used by adaptive routing) |
| `routing` | object | Tool-specific routing hints — see existing files |

### Categories — when to pick which

| Category | Use for |
| --- | --- |
| `workflow` | Process directives that govern how work is done (routing, framing, verification) |
| `architecture` | Boundary, dependency, and structural rules |
| `memory` | Persistent capture of decisions and recurring mistakes |
| `testing` | TDD, type-driven, test-quality review |
| `review` | PR/diff/spec/code reviewers |
| `planning` | Turning ideas into PRDs or task lists |
| `debugging` | Root-cause investigation |

If your entry doesn't fit one of these, open an issue — adding a new category requires updating the validator's allowed set in `scripts/validate-directives.ts`.

### `required` — when to pick which

Mark as `required: true` only if **every** project using this library should have the entry loaded. The bar is high: if a team could reasonably skip it, mark it `false`.

Current required entries (for reference):

- Directives: `adaptive-routing`, `codebase-navigation`, `exploration-mode`, `task-framing`, `verification`
- Skills: `code-reviewer`, `systematic-debugging`, `test-reviewer`

## Validation pipeline

Before opening a PR, run:

```bash
npm install
npm run typecheck                 # TypeScript clean
npm run manifest                  # Regenerate manifest.json
npm run validate                  # Frontmatter contract + path references
npm run test:cli                  # CLI integration tests
```

All four must pass. The full sequence is wired into `npm run check`.

If you changed frontmatter on existing entries, `manifest.json` will change. Commit the regenerated manifest alongside your edits — CI will fail on drift otherwise.

## Adding an eval scenario

Eval scenarios live in `evals/scenarios/<name>.md`. Each must include six top-level sections:

```markdown
## Directive Under Test
…which directive or skill this exercises…

## Setup
…files to load, environment notes…

## Prompt
…the user prompt the agent receives…

## Expected Behaviors
…what the agent should do…

## Anti-Behaviors
…what the agent must not do…

## Quality Criteria
…how a reviewer scores the run…
```

Missing or empty sections fail validation.

## PR checklist

Use the template that opens automatically when you click "New pull request" and:

- [ ] Frontmatter contract satisfied (validator passes)
- [ ] Manifest regenerated (`npm run manifest`)
- [ ] Adaptive routing updated if you added a skill
- [ ] Eval scenario added if the entry changes agent behavior in a way worth regression-testing
- [ ] README updated if the change affects the public surface

## Style notes

- **Directive tone**: rule-oriented ("Never do X", "Always do Y"). Constrained behavior.
- **Skill tone**: persona-oriented ("You are a specialist in…"). Structured findings as output.
- Prefer concrete examples over abstract guidance.
- Keep entries focused — one entry should govern one concern.
