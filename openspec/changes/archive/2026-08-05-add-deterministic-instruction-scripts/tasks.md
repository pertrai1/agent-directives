## 1. Parallel Command Modules

- [x] 1.1 Implement `src/verification-report.ts` and `scripts/test-verification-report.ts` with a versioned report model, stable text/JSON rendering, bounded evidence, and explicit incomplete/failure states.
- [x] 1.2 Implement `src/workspace-preflight.ts` and `scripts/test-workspace-preflight.ts` with read-only git inspection, normalized status parsing, stable recommendation codes, and non-git/submodule/worktree coverage.
- [x] 1.3 Implement `src/boundary-diff.ts` and `scripts/test-boundary-diff.ts` with local git comparison, supported JS/TS edge extraction, package dependency diffs, stable ordering, and invalid-reference handling.
- [x] 1.4 Implement `src/mcp-server-validation.ts` and `scripts/test-mcp-server-validation.ts` with no-shell stdio JSON-RPC probing, deterministic schema findings, timeout/output bounds, and child cleanup.
- [x] 1.5 Implement `src/agent-state-report.ts` and `scripts/test-agent-state-report.ts` with handoff-state collection/rendering plus decision listing/filtering/validation and placeholder detection.

## 2. Parent Integration

- [x] 2.1 Review each worker against its capability spec, resolve concerns, and confirm no worker changed shared integration or instruction files.
- [x] 2.2 Register the five additive command surfaces in `src/cli.ts` with consistent format, limit, cwd/base, timeout, and exit-code handling.
- [x] 2.3 Add focused test scripts to `package.json`, include them in the canonical check sequence, and confirm the compiled package contains all runtime modules.
- [x] 2.4 Refactor existing verification internals only as needed to share structured gate results without changing the existing `verify` command behavior.

## 3. Instruction Migration

- [x] 3.1 Shorten verification, workspace isolation, architecture boundary, context handoff, and session decision directives to invoke proven commands while retaining policy and concise fallbacks.
- [x] 3.2 Shorten architecture-boundary and MCP reviewer skills to consume command reports while retaining reviewer judgment and findings formats.
- [x] 3.3 Bump every changed directive/skill version according to policy and regenerate `manifest.json`.
- [x] 3.4 Add or update focused eval scenarios for command-first behavior, unavailable-command fallback, and the prohibition on treating script facts as judgment.

## 4. Verification and Delivery

- [x] 4.1 Run focused module tests, CLI integration tests, OpenSpec validation, typecheck, lint, manifest/version checks, package-content checks, and `git diff --check`.
- [x] 4.2 Run spec review, test review, architecture-boundary review, self-audit, and combined diff review; address material findings.
- [x] 4.3 Produce the final verification summary with command outputs, changed files, known gaps, and scope-control evidence.
