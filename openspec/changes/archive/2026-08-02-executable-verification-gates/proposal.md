## Why

Currently, verification guidelines and development gates specified in our agent directives and rulesets are defined as static, human-readable markdown prose. There is no automated, local mechanism to execute these checks. This relies on the agent's reasoning to discover, parse, and accurately run these commands. 

By introducing an executable verification gate engine into the CLI, we bridge the gap between static policy and runtime correctness. This ensures that agents programmatically execute and satisfy the codebase gates before declaring a task complete, removing the failure mode of "no-op/false-positive" self-reports.

## What Changes

- **Schema Enhancement:** Support a structured, machine-readable `verification` field in the frontmatter of all directives and rulesets.
- **CLI Command Addition:** Add an `agent-directives verify` command to parse and programmatically execute the validation commands associated with the installed/active directives/rulesets on modified or matched files.
- **Verification Script Generation:** When syncing or adding directives, generate a standalone, executable helper script under `.agents/bin/verify` (and optionally set up a pre-commit git hook) that runs these active gates locally.
- **Tool-Agnostic Execution:** Ensure the `verify` command is fully compatible with our supported developer tools (Claude Code, Cursor, Copilot, Codex).

## Capabilities

### New Capabilities

- `executable-verification-gates`: The design, parsing, and execution of structured verification gates from rules and directives frontmatter, exposing an active local runner and CLI command `agent-directives verify`.

### Modified Capabilities

None. This is an entirely new capability layer that does not modify existing requirement specifications.

## Impact

- **Affected files:**
  - `src/cli.ts`: Register the new `verify` command and options.
  - `src/manifest.ts`: Update schemas and validation to support the new `verification` metadata mapping.
  - `src/install.ts`: Ensure `.agents/bin/verify` script generation is executed and set as executable during installation/sync.
  - `scripts/validate-directives.ts`: Update validator to check the structure and validity of frontmatter `verification` blocks.
  - `package.json` & dependencies: Minimal impact; no new external runtime dependencies should be introduced.
