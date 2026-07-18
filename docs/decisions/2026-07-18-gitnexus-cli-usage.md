---
date: 2026-07-18
task: Clarify GitNexus usage guidance without installing skills or updating agent files
domain: gitnexus-cli-usage
kind: process
scope: repo
status: active
triggers:
  - changing GitNexus usage guidance
  - running GitNexus in this repository
  - deciding whether GitNexus should install agent skills
applies_to:
  - AGENTS.md
  - directives/*.md
  - skills/*/SKILL.md
supersedes: []
---

# Run GitNexus directly without changing agent files

## Context

The repository includes GitNexus guidance in project instructions, directives, and reviewer skills. Some GitNexus commands or setup flows can create or update agent instruction files, which creates unrelated churn during normal code or documentation work. Agents need a clear way to use GitNexus evidence while keeping agent-file installation and instruction updates out of scope unless explicitly requested.

## Decision

Use GitNexus through the existing local CLI or already-configured MCP tools, typically via `npx gitnexus ...`, without installing GitNexus skills, running setup, or modifying agent instruction files. If a GitNexus command creates or changes files such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, or `.cursor/rules/**`, treat those changes as tool side effects and revert them unless the user explicitly asked to update agent files.

## Rejected Alternatives

**Install GitNexus skills whenever GitNexus is referenced** — rejected because skill installation changes the agent environment and is unnecessary for running local CLI/MCP queries.

**Allow GitNexus setup/analyze side effects to remain in task diffs** — rejected because unrelated agent-file churn obscures the requested change and can silently alter project instructions.

**Remove GitNexus guidance entirely** — rejected because GitNexus remains useful boundary and impact evidence when it is already available.

## Consequences

**Easier:**
- Agents can use GitNexus as evidence without expanding scope into agent setup.
- Reviews can identify and reject unrelated GitNexus-generated agent-file changes.

**Harder:**
- Agents must distinguish useful GitNexus index updates from unrelated setup or instruction-file side effects.

**Watch for:**
- If GitNexus changes its commands so index refresh no longer touches agent files, keep the no-setup/no-skill-install rule but update the side-effect examples.
