## Why

The repository optimizes agent workflows for reliability and auditability, but it cannot yet show whether that ceremony reduces total token usage per successful change. Issue #76 and child issues #77-#82 call for measured end-to-end efficiency, representative benchmarks, and proportional workflow guidance that preserves reliability while reducing repeated instruction and verification overhead.

## What Changes

- Add a provider-neutral attempt ledger for every attributable workflow model call, including delegated/reviewer calls plus failed, abandoned, and retried attempts, and report tokens per accepted change without treating estimates or missing data as actual usage.
- Add paired benchmark cases for Light Path edits, one-function fixes, related low-risk behavioral fixes, and cross-cutting policy changes.
- Add a deterministic efficiency comparison gate with a configurable initial target of at least 20% lower median tokens per accepted change, non-increasing aggregate tokens per accepted change, and no benchmark-category reliability regression.
- Add an explicitly bounded Small Batch route that amortizes route/spec/test/verification overhead for related low-risk fixes while retaining a durable specification and per-fix acceptance evidence.
- Canonicalize repeated quality-gate guidance and replace the always-loaded routing document with a compact bootstrap plus lazy detail/metadata.
- Preserve existing supported tools, required specification-first behavior, validation/versioning rules, and conservative escalation for risky or cross-cutting work.

## Capabilities

### New Capabilities

- `token-efficiency-evaluation`: Defines actual token accounting, accepted-change semantics, paired benchmark evidence, and a reliability-preserving efficiency budget.

### Modified Capabilities

- `spec-first-orchestration`: Adds bounded Small Batch orchestration, canonical quality-gate handoff, and a compact progressively disclosed routing surface without weakening mandatory durable specifications.

## Impact

- Eval data and reporting: `scripts/eval-scenario.ts`, `evals/report-types.ts`, `evals/report-parsers.ts`, `evals/report-results.ts`, benchmark scenarios, documentation, focused TypeScript tests, and package scripts.
- Workflow guidance: `directives/adaptive-routing.md`, `directives/specification-driven-development.md`, `directives/test-driven-development.md`, `directives/type-driven-development.md`, `directives/verification.md`, and potentially `skills/self-audit/SKILL.md` where batch semantics require alignment.
- Discovery/install surfaces: `manifest.json`, manifest generation/types, install targets/tests, README/templates, and active decision records if routing paths or generated metadata change.
- No new runtime dependency, hosted service, credential, provider-specific billing integration, or weakening of existing security, boundary, persistence, production-readiness, or spec-first gates is intended.
