## 1. Delivery Setup and Baseline

- [x] 1.1 Commit this apply-ready OpenSpec change on `feat/token-optimization`, push it, and open the draft specification/epic PR to `main` before any implementation branch forks.
- [x] 1.2 Refresh the stale GitNexus index without retaining unrelated agent-file side effects, record the implementation baseline with `git status --short`, and run the repository's existing checks before worker edits.
- [x] 1.3 Create external isolated worktrees with explicit ownership for `codex/77-token-usage-metric` and `codex/81-canonical-gates`; keep OpenSpec artifacts coordinator-owned and forbid issue workers from editing sibling issue surfaces.

## 2. Issue #77 — Token Usage and Acceptance Measurement

- [x] 2.1 Run GitNexus impact analysis for every existing TypeScript symbol that will change in the eval runner, parsers, and report pipeline; record any HIGH/CRITICAL risk before editing.
- [x] 2.2 Define normalized attempt/call identity, the append-only attributable-call ledger, provider-neutral actual usage, measurement provenance, benchmark identity, complete comparable-cohort identity, gate status, and derived outcome acceptance types in `evals/report-types.ts` or focused new modules, preserving legacy rendering while excluding legacy evidence from hard gates.
- [x] 2.3 Add failing deterministic tests for provider-total precedence, input/output fallback, cache handling, primary/subagent/required-review/evaluator roles, accepted/rejected/unknown states, attempt reconciliation, whole-comparison conflicts, duplicate/unregistered/omitted IDs, retries, pre-execution registration, abandoned attempts with missing usage, incomplete evidence, and legacy records.
- [x] 2.4 Implement immutable pre-execution attempt registration, append-only call reconciliation, and pure token normalization/aggregation so every attributable workflow call is counted, evaluator usage stays separate, interrupted attempts remain visible, and any registry/ledger conflict invalidates the whole dataset.
- [x] 2.5 Update terminal and HTML reporting to consume the same aggregate and show attempts, accepted changes, actual-usage coverage, total actual tokens, and tokens per accepted change.
- [x] 2.6 Document normalized usage recording and sensitive-data exclusions, wire the focused test command into `package.json`, and verify #77 with its tests, typecheck/lint, `npm run check`, and `git diff --check`.
- [x] 2.7 Commit, push, and open a draft #77 PR against `feat/token-optimization` with exact validation evidence and `Implements #77 as part of #76`.

## 3. Issue #81 — Canonical Quality-Gate Guidance

- [x] 3.1 Capture the current combined byte/estimated-token baseline for verification, test-driven, and type-driven guidance, then add a failing `canonical-quality-gate-handoff` scenario.
- [x] 3.2 Make `directives/verification.md` plus `directives/scripts/gates.sh` the canonical generic final-gate source while preserving phase-specific RED and type-contract checks in their owning directives.
- [x] 3.3 Replace only true duplicate full-suite prose with concise verification handoffs; preserve repository/template command tables and unrelated workflow rules.
- [x] 3.4 Record the canonical-gate decision, apply required directive version bumps, regenerate `manifest.json`, and report the before/after token reduction.
- [x] 3.5 Verify #81 with shell syntax, scenario print-only, manifest/version validation, `npm run check`, and `git diff --check`.
- [x] 3.6 Commit, push, and open a draft #81 PR against `feat/token-optimization` with exact validation evidence and `Implements #81 as part of #76`.

## 4. Issue #78 — Paired Benchmark Corpus

- [x] 4.1 Fork `codex/78-paired-benchmarks` from the completed #77 branch so attempt identity and scenario-runner changes are available without concurrent edits.
- [x] 4.2 Add failing tests for safe deterministic fixture and instruction-surface materialization, required benchmark metadata, unique case identity, identical outcome inputs, diagnostic-only route expectations, declared gates, complete compatible execution cohorts, hash mismatches, dirty/unresolvable/identical surface refs, deterministic interleaving, and minimum repetition policy.
- [x] 4.3 Extend one pinned scenario runner to copy a declared immutable fixture tree, materialize baseline/candidate instructions from explicit immutable commit or package refs, and hash the complete installed surface before execution, rejecting missing, escaping, unsafe, dirty, unresolvable, or unexpectedly identical inputs.
- [x] 4.4 Add canonical scenarios and fixtures for a Light Path edit, one-function behavioral fix, related low-risk fix batch, and cross-cutting policy change with binary acceptance/anti-behavior criteria.
- [x] 4.5 Document explicit immutable baseline/candidate refs and hashes, the full matched execution cohort, seeded interleaving, outcome-vs-route diagnostics, three attempts per category and variant, complete registry/ledger handling, and generated-artifact cleanup.
- [x] 4.6 Verify every new scenario with print-only runs plus focused benchmark tests, `npm run check`, and `git diff --check`.
- [x] 4.7 Commit, push, and open a draft #78 PR against `codex/77-token-usage-metric` with exact validation evidence and `Implements #78 as part of #76`.

## 5. Issue #82 — Compact Routing Bootstrap

- [x] 5.1 Fork `codex/82-compact-router` from the completed #81 branch and run GitNexus impact analysis for manifest generation, installation, and context-audit symbols before editing.
- [x] 5.2 Add failing tests for source-tree and installed non-executable companion `assets` validation/install/check behavior across Claude, Codex, Copilot, and Cursor, including missing, stale, tampered, unsafe, and conflicting assets plus conflict atomicity.
- [x] 5.3 Add `assets` frontmatter/manifest support analogous to helper scripts, record/verify content identity, copy assets under stable `.agents/<repo-path>` locations for every tool, and preserve existing script behavior.
- [x] 5.4 Split `directives/adaptive-routing.md` into a required bootstrap of at most 12,000 bytes and a nested lazy companion reference, retaining the mandatory spec gate, safety triggers, compact composition rules, and obvious fast paths in the bootstrap.
- [x] 5.5 Add or update routing scenarios proving bootstrap-only Light/Review/Exploration behavior and detailed-reference selection for ambiguous, composite, and high-risk work.
- [x] 5.6 Align README/templates/validation with the stable bootstrap and companion path, record the compact-router/install decision, apply the required major/new versions, and regenerate `manifest.json`.
- [x] 5.7 Verify the 12,000-byte/3,000-estimated-token budget, all four install targets, relevant print-only scenarios, package checks, `npm run check`, GitNexus change detection, and `git diff --check`.
- [x] 5.8 Commit, push, and open a draft #82 PR against `codex/81-canonical-gates` with exact validation evidence and `Implements #82 as part of #76`.

## 6. Issue #80 — Bounded Small Batch Workflow

- [x] 6.1 Fork `codex/80-small-batch-path` from the completed #82 branch and add failing scenarios that cover the inclusive two/five-fix boundaries, reject one/six-or-more fixes, preserve Debugging/Isolation, and exclude unrelated fixes plus internal import/export, shared-utility/module, dependency-direction, public-boundary, policy, security, persistence, and production-sensitive triggers.
- [x] 6.2 Add the compact Small Batch modifier to the bootstrap and the full two-to-five-fix eligibility, mandatory path composition, categorical exclusions, and non-destructive stop/re-spec/re-baseline escalation contract to the lazy routing reference.
- [x] 6.3 Add one durable batch-spec/per-fix acceptance-matrix contract, the narrowly controlled multi-row RED exception, per-row verification evidence, one batch self-audit, and one final canonical gate run.
- [x] 6.4 Align root/template/README workflow summaries without weakening their default no-batching guidance outside an explicitly eligible Small Batch.
- [x] 6.5 Record the Small Batch decision, apply required directive/skill version bumps, regenerate `manifest.json`, and ensure unexpected coupling re-routes rather than continuing the batch.
- [x] 6.6 Verify #80 with positive and negative print-only scenarios, manifest/version validation, `npm run check`, and `git diff --check`.
- [x] 6.7 Commit, push, and open a draft #80 PR against `codex/82-compact-router` with exact validation evidence and `Implements #80 as part of #76`.

## 7. Issue #79 — Reliability-Preserving Efficiency Budget

- [x] 7.1 Create and push `codex/token-optimization-join` by combining the completed #78 and #80 lane heads, retain it as #79's remote base, resolve only integration conflicts, and run the combined pre-#79 baseline checks.
- [x] 7.2 Fork `codex/79-efficiency-budget` from the pushed join branch and add failing fixtures/tests for exact-threshold pass, insufficient reduction, threshold override, even-count median/precision, median win with aggregate TPAC regression, pass-to-fail regression, compensating per-category acceptance-rate regression, aggregate acceptance-rate regression, retry/delegation/reviewer cost, evaluator exclusion, missing usage, complete-registry/ledger conflicts or omissions, sample minimums, zero accepted changes, category mismatch, incompatible cohorts, and a dataset where the specified corpus equation differs from median paired percentage reductions.
- [x] 7.3 Implement a pure comparison module that computes exact per-category ratio-of-sums and acceptance rates, the exact corpus reduction `1 - (median(candidate category TPAC) / median(baseline category TPAC))`, aggregate TPAC/rate, complete-registry/ledger and cohort validation, and deterministic validity/reliability results without policy decisions based on rounded displays.
- [x] 7.4 Add a TypeScript CLI/package command that accepts explicit baseline and candidate dataset manifests, defaults to a 20% minimum reduction, uses stable output ordering, and returns distinct success, policy-failure, and invalid-evidence exit statuses.
- [x] 7.5 Document immutable dataset/surface hashes and selection, tested-environment scope, and the rule that lowering the token threshold cannot bypass complete accounting, cohort, sample, actual-usage, zero-acceptance, aggregate-cost, or reliability guards.
- [x] 7.6 Verify #79 with focused CLI tests, typecheck/lint, `npm run check`, and `git diff --check`.
- [x] 7.7 Commit, push, and open a draft #79 PR against `codex/token-optimization-join` with exact validation evidence and `Implements #79 as part of #76`.

## 8. Parent-Owned Review, Integration, and Pull Requests

- [x] 8.1 Review every worker result for spec compliance before quality, handle all `NEEDS_CONTEXT`/`BLOCKED`/concern states, and reject sibling-scope changes or overlapping concurrent edits.
- [x] 8.2 Run routed code, test/eval, spec, architecture-boundary, and self-audit reviews on each applicable branch; fix material findings in the owning branch and rerun focused verification.
- [x] 8.3 Document every stacked branch base, retention/retargeting and merge strategy, verify dependent diffs/checks after base changes, then create `codex/token-optimization-final` from the verified #79 head and open the draft implementation PR against `feat/token-optimization` without issue-closing keywords.
- [x] 8.4 On the final composed branch, run strict OpenSpec validation, every new/changed scenario print-only check, focused eval/CLI/install tests, `npm run check`, `git diff --check`, and GitNexus change detection; confirm no generated run artifacts or unrelated files are present.
- [ ] 8.5 Run the paired benchmark on the exact final composed commit with at least three provider-reported attempts per category and variant, immutable dataset/surface hashes, complete ledgers/registries, and matched environment metadata; require a successful efficiency-gate exit before closing #76, otherwise record preliminary/missing evidence and keep the epic/final PR draft and issue open.
- [x] 8.6 Update coordinator-owned OpenSpec task state and publish a final orchestration summary with branches, commits, PR URLs/bases, validation evidence, unresolved benchmark evidence, and safe merge order.
