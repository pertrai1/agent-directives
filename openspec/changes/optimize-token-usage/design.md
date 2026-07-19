## Context

The current eval harness records scenario, loaded-file, route, verdict, and checklist data, while `context-audit` estimates static prompt weight with a characters/4 heuristic. It does not record provider token usage, quality-gate acceptance, retries, or a tokens-per-accepted-change result. The workflow layer also repeats quality-gate prose and requires the roughly 30.5 KB `directives/adaptive-routing.md` early in every task, even though the manifest already carries compact routing metadata.

This change spans TypeScript eval/reporting code, portable Markdown instructions, generated manifest/install behavior, and scenario-based evidence. It must preserve compatibility with existing result files and all four supported agent targets. Active repository decisions continue to require a durable specification before implementation and version bumps for every changed directive or skill.

## Goals / Non-Goals

**Goals:**

- Measure actual provider-reported token cost across successful, failed, and retried attempts.
- Compare identical baseline and candidate tasks with explicit reliability guardrails.
- Reduce repeated orchestration work for related low-risk fixes without creating a spec-free or test-free path.
- Reduce the always-loaded routing payload and duplicate gate guidance while preserving behavior and installability.
- Deliver the work as reviewable issue-sized slices with deterministic validation.

**Non-Goals:**

- Infer billing cost, prices, or equivalent tokens across providers.
- Treat static context estimates as actual usage or silently infer missing usage as zero.
- Add a hosted telemetry service, credentials, network reporting, or prompt-content collection.
- Weaken security, boundary, persistence, production-readiness, specification, or review triggers.
- Redesign the entire eval framework, directive taxonomy, installer, or repository release process.

## Decisions

### 1. Normalize usage and acceptance at the eval-run boundary

Extend the normalized eval run with a stable attempt ID, an append-only call ledger, optional token usage, measurement provenance, benchmark identity, repetition, quality-gate status, and comparable-cohort identity. A cohort records provider, exact model/tokenizer identity, client and harness versions, tool configuration, cache policy, global-instruction hash, and material inference settings that affect tokenization or behavior. A run is one attempt. Each ledger entry has a unique call ID, role (`primary`, `subagent`, `required-reviewer`, or `evaluator`), and provider-reported usage provenance. The hard workflow metric includes every call causally attributable to producing and verifying the change—primary, delegated, and required-review calls—and excludes the external evaluation-only judge, whose usage is preserved and reported separately.

The harness persists an immutable started-attempt record before launching the client so interruption or abandonment remains visible. Dataset manifests enumerate the complete started-attempt registry for the selected cohort. Harness manifests and later judged/result records reference the same attempt ID and are reconciled before aggregation; compatible fields merge. Any conflicting identity/token record, duplicate call or attempt ID, unregistered completed attempt, registry gap, or started attempt absent from the dataset invalidates the entire comparison instead of merely dropping one record. Legacy records without an attempt ID remain readable but cannot satisfy hard-gate evidence or silently join another record.

Acceptance is derived only when the judge/eval verdict is `pass` and required project gates are `pass`; missing evidence remains `unknown`.

Actual usage records distinguish input, output, cache read, cache write, and provider total. Aggregation prefers a provider total when supplied; otherwise it uses non-overlapping input plus output and reports cache counts separately. Estimated instruction tokens remain a separate diagnostic field and never satisfy actual-usage coverage.

The current interactive scenario runner remains usable. It may emit empty usage/acceptance placeholders or ingest normalized data supplied by the operator/client, but provider-specific adapters and billing semantics stay outside the core schema. Outcome acceptance is derived from repository behavior, declared acceptance checks, and required project gates. Expected route, files loaded, or other variant-specific workflow conformance remains diagnostic and cannot make one side of a paired benchmark fail by construction.

Alternative considered: use `context-audit` estimates as the metric. Rejected because static instruction weight excludes model output, tool exchanges, retries, and rework. Alternative considered: bind the harness to one provider's response format. Rejected because the repository supports multiple clients and the comparison contract is provider-neutral.

### 2. Define tokens per accepted change without survivor bias

For a benchmark category and variant, tokens per accepted change (TPAC) is the sum of actual tokens across every valid attempt, including failed and retried attempts, divided by accepted attempts. Zero accepted attempts or incomplete actual-usage coverage makes the category invalid rather than infinite, zero, or silently omitted.

Reports show both aggregate TPAC and per-category TPAC. Let `B` be the median of baseline category TPAC values and `C` the median of candidate category TPAC values; the reported reduction is exactly `1 - (C / B)`. Median sorts exact category values and, for an even count, uses the arithmetic mean of the two middle values. Policy comparisons use unrounded values; rounding is display-only. The gate uses that corpus-level equation so a single large prompt does not dominate the corpus and does not substitute the median of paired percentage reductions. Aggregate TPAC must also be non-increasing so a median win cannot hide an overall cost explosion. Aggregate acceptance rate, every per-category acceptance rate, and category pass/fail transitions remain explicit reliability checks. The sample minimum is per benchmark category and variant. A category is passing when at least one attempt is accepted under its unchanged checklist and gates; a candidate must not reduce the acceptance rate of any category, even if improvements elsewhere leave the aggregate rate unchanged.

Alternative considered: average token counts from successful runs only. Rejected because it rewards workflows that spend tokens on failed attempts and discard them. Alternative considered: compare total tokens across the whole corpus only. Rejected because category mix and task size would dominate the result.

### 3. Use paired, repeated benchmark cases

Benchmark cases reuse the existing scenario conventions and add stable benchmark metadata for case identity, `baseline`/`candidate` variant, repetition, comparable-cohort identity, and explicit immutable instruction-surface refs. The initial corpus covers a non-behavioral Light Path edit, a one-function behavioral fix, a related low-risk fix batch, and a cross-cutting policy change. Each case owns an immutable fixture directory that the scenario runner copies into its temporary workspace before installing the instruction surface. One pinned harness commit materializes baseline and candidate instruction surfaces from explicit clean, resolvable commit or package-artifact refs, then records a complete installed-surface hash. The pair is invalid if refs are dirty/unresolvable, the installed hash does not match declared evidence, or the baseline and candidate surfaces are unexpectedly identical.

Baseline and candidate variants reference the same prompt, fixture, outcome-only acceptance checklist, project gates, provider, exact model/tokenizer identity, client and harness versions, tool configuration, cache policy, global-instruction hash, and material inference settings; manual recreation of `## Workspace State` is not sufficient benchmark evidence. Incompatible cohorts are rejected rather than normalized across providers or silently pooled. Repetitions are interleaved in a deterministically seeded order that is recorded with the dataset to limit time/order bias.

Each variant requires at least three valid actual-usage attempts. The harness registers each attempt before execution. Abandoned, failed, and retry attempts are retained; an interrupted attempt without recoverable actual usage makes the dataset incomplete rather than disappearing from evidence. Generated run directories remain uncommitted unless a reviewed baseline update intentionally includes them.

Alternative considered: benchmark only the branch that motivated #76. Rejected because one branch cannot distinguish task-specific overhead from a general workflow pattern. Alternative considered: keep the current manual `## Workspace State` setup. Rejected because manual setup cannot prove identical paired starting state. Alternative considered: create a new benchmark framework. Rejected because the existing scenario/checklist/run-manifest model already supplies most of the needed structure.

### 4. Enforce a configurable efficiency budget with a strict reliability floor

A new deterministic TypeScript command accepts explicit baseline and candidate datasets. Its initial default requires `1 - (median(candidate category TPAC) / median(baseline category TPAC)) >= 0.20`, candidate aggregate TPAC no greater than baseline, no benchmark category moving from passing to failing, no decrease in any per-category accepted-change rate, and no decrease in aggregate accepted-change rate. The reduction threshold is configurable; complete ledger/registry accounting, comparable-cohort identity, sample count, actual-usage coverage, aggregate-cost, and reliability checks are not bypassed by lowering the token target.

The command fails on incomplete/contradictory registry or ledger evidence, insufficient samples, missing actual usage, zero accepted changes, token-budget failure, aggregate-cost regression, or reliability regression. It prints compact per-category and aggregate evidence suitable for CI but is not automatically added to CI in this change.

Alternative considered: make any reduction pass. Rejected because noise could masquerade as improvement. Alternative considered: require a fixed absolute token budget. Rejected because task sizes and providers vary; a relative paired target is more portable.

### 5. Add a conservative Small Batch workflow path

Small Batch is an orchestration-amortization modifier, not a replacement for mandatory workflow paths. It is eligible only when two to five fixes share one subsystem and coherent outcome/root cause, fit one reversible change, and avoid every Boundary, Policy, and Production trigger, including internal imports/exports, shared utilities/modules, dependency direction, security/privacy/auth, persistence or schema migration, external services, public APIs/package boundaries, deployment, and infrastructure. Eligible behavioral fixes still compose with mandatory Debugging behavior and Workspace Isolation. Any failed criterion or newly discovered coupling stops implementation, preserves or isolates the partial state non-destructively, and requires re-routing, an updated specification, and a new baseline before work continues.

An eligible batch routes once, records one durable specification with per-fix acceptance rows, performs one RED phase containing the complete failing matrix, then one GREEN/REFACTOR pass, one batch self-audit, one verification summary, and one final full quality-gate run. Each acceptance row still receives focused proof.

Alternative considered: exempt small fixes from specifications or TDD. Rejected by the active specification-first decision and because it trades token savings for hidden correctness risk. Alternative considered: keep every fix in a separate full cycle. Rejected because repeated route/spec/gate narration is the exact overhead this bounded path is intended to amortize.

### 6. Keep the router path stable and split required bootstrap from lazy detail

Retain `directives/adaptive-routing.md` as the required public entry point, but reduce it to at most 12 KB. Keep the fast decision table, global safety gates, compact composition rules, and discovery instructions there. Move long path explanations/examples to an optional routing reference and/or generated manifest metadata. Nuanced, ambiguous, composite, and high-risk routes load the detailed reference; obvious Light, Review, and Exploration routes do not.

The optional reference must resolve relative to the bootstrap in the source tree and be present after sync for Claude, Codex, Copilot, and Cursor whenever the bootstrap names it. Add non-executable companion `assets` metadata to manifest entries, following the existing `scripts` companion-file pattern: the generator resolves and validates repo-relative asset paths and content identity, install copies them under `.agents/<repo-path>` for every tool, and installation checks reject missing, stale, tampered, unsafe, or conflicting assets rather than checking existence alone. Store the detailed router below a nested directives reference path so it is installed with the bootstrap but is not a standalone required/always-loaded manifest entry. Cursor keeps the bootstrap rule in `.cursor/rules/` and accesses the companion reference through its stable `.agents/directives/...` path.

Alternative considered: mark the detailed reference as another `required: true` directive with conditional load metadata. Rejected because current context-audit and public documentation equate required entries with always-loaded prompt weight, which would defeat the required-bootstrap budget until a larger install/load semantic migration is complete. Alternative considered: replace the router entirely with manifest metadata. Rejected because nuanced composition and escalation rules are not safely expressible as flat tags alone. Alternative considered: retain one large file and rely on agents to stop reading. Rejected because the full required payload is still installed/loaded by many harnesses.

This decision is repository-architecture-specific: the compact-bootstrap principle is portable, while the exact manifest/install mechanism depends on this CLI's entry model.

### 7. Make verification the canonical final-gate source

`directives/verification.md` and `directives/scripts/gates.sh` own generic final test/lint/type-check/build execution and bounded output behavior. Type-driven and test-driven directives retain their phase-specific checks and replace duplicated generic full-suite prose with short handoffs to verification. Repository-specific command tables remain in project instructions.

Alternative considered: create a new quality-gates directive. Rejected because verification already owns the phase and helper script. Alternative considered: delete all repeated references. Rejected because each phase still needs a concise, local handoff that tells agents when the canonical gate applies.

### 8. Deliver in dependency-aware issue slices

Issue #77 begins independently, and #81 may run in parallel because it owns a disjoint instruction surface. #78 follows #77 because both must touch the scenario runner to establish attempt identity and deterministic fixture/instruction materialization. #82 follows #81, #80 follows #82, and #79 runs after both the eval and instruction lanes are joined. Every stacked base is pushed before a dependent PR opens and retained until dependents are retargeted or the final composed PR closes. After any base merge or retarget, the coordinator verifies the dependent diff and reruns its focused checks. Stacked branches avoid concurrent edits to the same files, and each slice includes its own focused tests/evals without opportunistically implementing sibling issues.

## Risks / Trade-offs

- **[Provider totals may include cache tokens differently]** → Preserve the provider total and component fields with provenance; never synthesize a total that double-counts cache components.
- **[Delegation can hide workflow cost]** → Require a complete per-attempt call ledger for primary, subagent, and required-review calls; keep the evaluation-only judge separate and visible.
- **[Three repetitions may still be noisy]** → Report samples and per-category values, use a median comparison, and keep the threshold configurable for later evidence-driven tightening.
- **[Small Batch could become a loophole]** → Use objective exclusions, a two-to-five-fix bound, and mandatory escalation on uncertainty or discovered coupling.
- **[Compact routing may hide required specialist triggers]** → Preserve the fast table and compact trigger metadata, add positive and negative routing scenarios, and verify all four installed targets.
- **[Optional routing detail may not be installed by noninteractive sync]** → Treat installability as an acceptance gate and choose a companion-asset or equivalent deterministic mechanism before changing paths.
- **[Variant refs or ambient configuration can invalidate pairing]** → Pin one harness, materialize and hash both immutable instruction surfaces, match the full execution cohort, and interleave repetitions deterministically.
- **[Deduplication can remove unique phase behavior]** → Canonicalize only generic final-gate prose and retain phase-specific RED, type-contract, failure, and scope requirements.
- **[Stacked PRs can obscure combined regressions]** → State PR bases/dependencies explicitly and run parent-owned integration verification on the composed branch before declaring the epic ready.

## Migration Plan

1. Add normalized token/acceptance data and backwards-compatible reporting.
2. Add paired benchmark cases and the deterministic efficiency comparison command.
3. Canonicalize gate guidance, then compact the routing surface and verify installation.
4. Add Small Batch policy on top of the canonical/compact instruction baseline.
5. Regenerate manifest metadata, apply required instruction version bumps, update decisions/docs, and run focused evals plus `npm run check`.
6. Run the paired benchmark comparison on the exact final composed commit with immutable dataset and installed-surface hashes. Issue #76 is complete only if the comparison exits successfully with complete accounting, at least a 20% corpus reduction, non-increasing aggregate TPAC, and all reliability gates passing. Otherwise keep the epic and final PR draft/open, scope results as preliminary, and revise or revert rather than lowering the guardrail silently.

Each issue-sized change is independently revertible. No data or hosted-system migration is required.

## Open Questions

None. The initial 20% target, three-attempt minimum, 12 KB router budget, acceptance definition, and Small Batch boundaries are explicit in #77-#82 and remain change-controlled through the specification.
