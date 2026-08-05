## Context

The package already exposes a compiled Node CLI and installs Markdown plus helper assets. Four shell helpers cover narrow workflows, but the largest instruction procedures remain manual, vary by agent, and sometimes recommend optional MCP or platform tooling. The new automation must work from the published package, remain additive, run without shell interpolation, and produce bounded evidence suitable for direct model consumption.

## Goals / Non-Goals

**Goals:**

- Add five deterministic CLI surfaces with stable TypeScript contracts, text/JSON rendering, bounded output, and documented exit semantics.
- Keep worker changes parallel-safe by putting each capability in one new `src/` module plus one focused `scripts/test-*.ts` file.
- Preserve judgment in Markdown while replacing repository discovery, command execution, normalization, and report scaffolding.
- Avoid requiring configured MCP, GitNexus, Fallow, `tsx`, or new runtime packages in consuming repositories.

**Non-Goals:**

- Automatically approve architecture, security, rollout, or weakest-assumption judgments.
- Create or delete worktrees, change branches, write decision records, or rewrite handoffs without an explicit future mutation command.
- Support every programming language parser in the first boundary-diff release.
- Replace the existing `verify`, install, sync, or manifest contracts.

## Decisions

### Use additive commands on the compiled CLI

The commands will be registered by the parent in `src/cli.ts`; workers implement importable modules and focused tests only. This reuses the published binary and avoids shipping uncompiled TypeScript or platform-specific shell as the primary interface. Standalone shell helpers remain compatibility fallbacks during migration.

### Keep worker write sets disjoint

Each worker owns exactly one named `src/` module and one named test file. Workers must not edit `src/cli.ts`, `package.json`, Markdown, manifests, shared test helpers, or another worker's files. The parent integrates command registration and shared scripts after reviewing all worker outputs.

### Standardize deterministic output

Every module exports a serializable versioned report builder and a renderer. Collections use lexical path/name ordering. Text output is capped by an explicit positive limit; JSON retains the same ordered data. Default operation is read-only. Exit semantics at CLI integration are `0` for a complete non-blocking report, `1` for detected blocking findings or failed checks, and `2` for invalid arguments, malformed evidence, timeout, protocol failure, or unavailable required state.

### Spawn processes without a shell

Commands use `spawnSync`/`execFileSync` with executable and argument arrays, explicit `cwd`, timeout, and buffer limits. No command accepts a raw shell command string. MCP validation launches a provided executable directly and speaks newline-delimited JSON-RPC over stdio; it does not require an installed MCP connector.

### Separate facts from judgment

Reports label facts as observed, unavailable, or inferred. Scripts may identify deterministic candidates (changed edges, dirty default branch, missing schema bounds), but Markdown retains policy decisions such as whether isolation is warranted, whether an inferred boundary is valid, and whether an unverified risk is acceptable.

### Migrate instructions only after proof

After parent integration and focused tests pass, affected directives/skills are reduced to command invocation, interpretation, blocking consequences, and a concise unavailable-command fallback. Existing instruction files receive required version bumps, focused eval scenarios, and manifest regeneration.

## Risks / Trade-offs

- [Cross-platform process differences] → use Node APIs, argument arrays, temporary fixtures, and platform-neutral assertions.
- [False confidence from static boundary extraction] → report `allowed`, `violation`, or `unclear` only when a configured rule supports classification; otherwise emit observed edges without approval.
- [MCP validators hanging or flooding context] → enforce timeout and byte caps, terminate the child, and return exit class 2.
- [Verification duplicates existing gate behavior] → reuse/refactor existing verification result contracts during parent integration rather than maintain two execution engines.
- [Instruction references outrun package delivery] → update Markdown only after compiled CLI integration and package tests pass.
- [Parallel workers conflict] → prohibit shared-file edits and reserve all registration/docs/manifest work for the parent.
