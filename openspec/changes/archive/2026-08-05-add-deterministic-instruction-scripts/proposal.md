## Why

Core directives and reviewer skills currently spend substantial prompt space asking agents to rediscover repository state, assemble evidence, and interpret multi-command shell recipes. Moving deterministic discovery and reporting into the installed `agent-directives` CLI will reduce prompt weight, cross-agent variance, and optional MCP dependence while preserving human judgment in Markdown.

## What Changes

- Add five additive, cross-platform CLI automation surfaces for verification reporting, workspace preflight, boundary diff reporting, MCP server validation, and agent-state reporting.
- Give every command stable structured output, bounded human-readable output, documented exit codes, and focused tests without adding runtime dependencies.
- Shorten affected directives and skills after the commands pass, retaining when-to-run policy, blocking consequences, interpretation guidance, and concise unavailable-command fallbacks.
- Keep existing CLI behavior compatible; no existing command, flag, manifest shape, or install target is removed.

## Capabilities

### New Capabilities

- `verification-reporting`: Collect project gates, changed files, test evidence, and verification-report scaffolding deterministically.
- `workspace-preflight`: Inspect git/worktree/submodule/branch/cleanliness state and report a safe isolation recommendation without mutating the repository.
- `boundary-diff-reporting`: Extract changed dependency and package edges from a git comparison without requiring an MCP graph service.
- `mcp-server-validation`: Validate an MCP stdio server's protocol handshake, listed tool schemas, boundedness, malformed-request behavior, and output limits without installing it as an agent MCP.
- `agent-state-reporting`: Generate and validate handoff state and decision-log discovery/creation evidence from deterministic repository inputs.

### Modified Capabilities

- `executable-verification-gates`: Extend verification from gate execution alone to a deterministic, editable verification evidence report while preserving existing gate behavior.
- `spec-first-orchestration`: Require affected directives and skills to delegate deterministic mechanics to the new commands after those commands are proven and installed.

## Impact

- Public CLI: five additive command groups under the existing `agent-directives` binary.
- Implementation: new focused modules under `src/`, parent-owned command registration in `src/cli.ts`, and focused TypeScript tests under `scripts/`.
- Instructions: `directives/verification.md`, `directives/workspace-isolation.md`, `directives/architecture-boundaries.md`, `directives/context-handoff.md`, `directives/session-decisions.md`, `skills/architecture-boundary-reviewer/SKILL.md`, and `skills/mcp-integration-reviewer/SKILL.md` will be shortened after integration.
- Distribution: existing compiled `dist/` package delivery is reused; no new runtime dependency or separately installed shell/MCP service is required.
- Validation: instruction versions, manifest generation, targeted eval scenarios, CLI tests, package checks, and the canonical full gate remain required.
