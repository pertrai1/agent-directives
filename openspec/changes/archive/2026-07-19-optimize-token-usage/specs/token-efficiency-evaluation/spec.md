## ADDED Requirements

### Requirement: Eval runs record complete normalized workflow token evidence
The evaluation system SHALL accept provider-neutral actual token usage with measurement provenance in an append-only attempt call ledger, SHALL include every primary, subagent, and required-reviewer call attributable to producing and verifying the change, SHALL preserve evaluation-only judge usage separately, and SHALL keep estimated instruction tokens separate from actual usage.

#### Scenario: Delegated and required-review calls are counted
- **WHEN** a workflow delegates work or invokes a model-based review required by its route
- **THEN** each provider call has a unique call ID under the attempt and its actual usage contributes to workflow tokens per accepted change

#### Scenario: Evaluation judge is separated
- **WHEN** the harness invokes a judge solely to score a completed attempt
- **THEN** the judge usage is recorded with the evaluator role, reported separately, and excluded from the workflow optimization numerator

#### Scenario: Provider total is recorded without cache double counting
- **WHEN** a run supplies a provider-reported total plus input, output, cache-read, and cache-write components
- **THEN** the system preserves all components, uses the provider total for aggregation, and does not add cache components to that total again

#### Scenario: Component fallback is explicit
- **WHEN** a run supplies actual input and output tokens but no provider total
- **THEN** the system aggregates the non-overlapping input and output counts and reports cache components separately

#### Scenario: Estimate is not actual usage
- **WHEN** a run contains only a characters-per-token context estimate
- **THEN** the system marks actual-usage coverage incomplete and excludes the estimate from the hard efficiency metric

### Requirement: Acceptance requires behavior and gate evidence
The evaluation system SHALL treat one run as one attempt and SHALL mark it accepted only when both the judge/eval verdict and required project quality gates pass.

#### Scenario: Passing verdict and gates are accepted
- **WHEN** a run has a passing verdict and passing required quality gates
- **THEN** the run contributes one accepted change to the denominator

#### Scenario: Failed or unknown evidence is not accepted
- **WHEN** a run has a failed verdict, failed gates, or missing verdict/gate evidence
- **THEN** the run does not contribute an accepted change and missing evidence remains unknown rather than becoming a pass

### Requirement: Attempt records reconcile without double counting or survivor bias
The evaluation system SHALL assign or preserve a stable attempt ID, SHALL persist an immutable attempt registry entry before execution begins, SHALL require a dataset manifest to enumerate every started attempt in the selected cohort, and SHALL reconcile harness manifests with judged or enriched result records before aggregation.

#### Scenario: Manifest and judge result merge into one attempt
- **WHEN** a harness manifest and judged result reference the same attempt ID with compatible identity fields
- **THEN** the system combines their usage, verdict, gate, and routing evidence into one normalized attempt

#### Scenario: Conflicting records are invalid evidence
- **WHEN** two records share an attempt ID but disagree on benchmark identity, variant, repetition, or actual token evidence
- **THEN** the system rejects the complete comparison and does not double-count, silently choose one value, or recover by sampling only other attempts

#### Scenario: Legacy record remains independent
- **WHEN** a legacy record has no attempt ID
- **THEN** the system renders it independently and does not infer that it belongs to another record

#### Scenario: Interrupted attempt remains visible
- **WHEN** an attempt is registered and execution ends before actual usage can be recovered
- **THEN** the system retains the abandoned attempt and marks actual-usage coverage incomplete rather than deleting or silently omitting it

#### Scenario: Registry mismatch invalidates the comparison
- **WHEN** a dataset omits a started attempt, contains an unregistered completion, repeats an attempt/call ID, or has a registry sequence gap
- **THEN** the entire comparison is invalid even when three other valid attempts remain

### Requirement: Failed and retried attempts count toward cost
The evaluation system SHALL include actual tokens from every valid attempt in the cost numerator, including failed and retried attempts.

#### Scenario: Retry cost is retained
- **WHEN** a benchmark requires two failed attempts before one accepted attempt
- **THEN** tokens from all three attempts contribute to tokens per accepted change while only the accepted attempt contributes to the denominator

### Requirement: Reports expose tokens per accepted change
The evaluation report SHALL show attempts, accepted changes, actual-usage coverage, total actual tokens, aggregate tokens per accepted change, and per-category values using the same normalized calculation in terminal and HTML output.

#### Scenario: Complete run set is reported consistently
- **WHEN** structured results contain complete actual usage and acceptance evidence
- **THEN** terminal and HTML reports display the same aggregate attempts, accepted changes, tokens, and tokens-per-accepted-change values

#### Scenario: Incomplete run set is visible
- **WHEN** one or more included attempts lack actual token evidence
- **THEN** the report shows incomplete coverage and does not present a passing hard efficiency result

### Requirement: Legacy eval results remain readable
The evaluation system SHALL continue to parse and render result files created before token and acceptance fields existed.

#### Scenario: Legacy result has unknown efficiency evidence
- **WHEN** the report loads a legacy result without token usage or gate status
- **THEN** it renders the existing verdict/routing data and marks token and acceptance evidence unknown without failing the entire report

### Requirement: Benchmarks compare identical paired tasks and cohorts
The benchmark corpus SHALL define baseline and candidate variants with identical task prompts, starting workspaces, outcome-only acceptance checklists, project gates, providers, exact model/tokenizer identities, client and harness versions, tool configurations, cache policies, global-instruction hashes, and material inference settings for each task category. Route and file-loading expectations SHALL remain diagnostics and SHALL NOT determine accepted-change status.

#### Scenario: Initial corpus covers representative workflow shapes
- **WHEN** the token-efficiency benchmark suite is listed
- **THEN** it includes a non-behavioral Light Path edit, a one-function behavioral fix, a related low-risk fix batch, and a cross-cutting policy change

#### Scenario: Repetitions retain all attempts
- **WHEN** a benchmark pair is executed
- **THEN** each benchmark category and variant records at least three valid actual-usage attempts and retains abandoned, failed, and retry attempts rather than selecting only the best run

#### Scenario: Fixture workspace is materialized deterministically
- **WHEN** a benchmark scenario starts a baseline or candidate attempt
- **THEN** the runner copies the same declared immutable fixture into the temporary workspace before installing the variant instruction surface

#### Scenario: Incompatible execution cohorts are invalid
- **WHEN** paired datasets differ in provider, exact model/tokenizer identity, client or harness version, tool configuration, cache policy, global-instruction hash, or a material inference setting
- **THEN** the comparison rejects the evidence or reports it as a separate cohort rather than treating token counts as directly comparable

#### Scenario: Route diagnostics do not bias outcome acceptance
- **WHEN** baseline and candidate variants legitimately use different routes to produce the same required repository outcome
- **THEN** the unchanged behavior/checklist/gate contract determines acceptance while variant-specific route conformance is reported only as a diagnostic

### Requirement: Benchmarks pin and verify instruction surfaces
The benchmark harness SHALL execute both variants from one immutable harness version, SHALL materialize each instruction surface from an explicit clean immutable commit or package artifact, and SHALL record a hash of the complete installed instruction surface.

#### Scenario: Distinct immutable surfaces are installed
- **WHEN** a paired benchmark starts
- **THEN** the pinned harness installs the declared baseline and candidate surfaces, verifies their hashes, and rejects dirty, unresolvable, or unexpectedly identical variants

#### Scenario: Execution order is controlled
- **WHEN** repeated baseline and candidate attempts are scheduled
- **THEN** the runner interleaves them using a recorded deterministic seed rather than executing every sample of one variant first

### Requirement: Efficiency comparison preserves reliability
The efficiency gate SHALL compare explicitly selected compatible baseline and candidate datasets and SHALL require at least a configurable corpus reduction, calculated as `1 - (median(candidate category TPAC) / median(baseline category TPAC))`, non-increasing aggregate TPAC, and no reliability regression. For an even category count, the median SHALL be the arithmetic mean of the two middle exact values; policy comparisons SHALL use unrounded values.

#### Scenario: Default budget passes
- **WHEN** the corpus reduction equation is at least 20%, aggregate TPAC does not increase, no category moves from passing to failing, and neither any per-category nor the aggregate accepted-change rate decreases
- **THEN** the efficiency comparison exits successfully and reports per-category plus aggregate evidence

#### Scenario: Token win with reliability loss fails
- **WHEN** the candidate meets the token-reduction target but a benchmark category regresses from passing to failing, any per-category accepted-change rate decreases, or aggregate accepted-change rate decreases
- **THEN** the efficiency comparison exits non-zero with the reliability regression identified

#### Scenario: Compensating category gains do not hide a regression
- **WHEN** one candidate category has a lower accepted-change rate than baseline while another improves enough to keep the aggregate rate unchanged
- **THEN** the efficiency comparison exits non-zero and identifies the regressed category

#### Scenario: Reduction formula is deterministic
- **WHEN** a dataset would produce different outcomes for the median-of-ratios equation and the median of paired percentage reductions
- **THEN** the comparison uses exact, unrounded values in `1 - (median(candidate category TPAC) / median(baseline category TPAC))` and applies the defined even-count median rule

#### Scenario: Median win cannot hide aggregate cost growth
- **WHEN** the candidate meets the median reduction target but aggregate TPAC exceeds baseline
- **THEN** the efficiency comparison exits non-zero with the aggregate-cost regression identified

#### Scenario: Category pass status is observable
- **WHEN** a category has repeated attempts under an unchanged checklist and gate contract
- **THEN** the category is passing only when at least one attempt is accepted, while per-category and aggregate accepted-change rates remain visible for regression comparison

#### Scenario: Insufficient evidence is invalid
- **WHEN** either variant has fewer than three valid attempts per category, missing actual usage, zero accepted changes, or an incompatible comparison cohort
- **THEN** the comparison exits non-zero as invalid evidence rather than passing or silently dropping the category

### Requirement: Efficiency evidence avoids sensitive prompt collection
The evaluation system SHALL record usage metadata without requiring raw prompts, credentials, secrets, or provider billing data beyond token counts and provenance.

#### Scenario: Usage can be recorded without prompt content
- **WHEN** an operator records provider-reported token usage for a run
- **THEN** the structured record contains counts and provenance while prompt content and credentials remain outside the token-evidence fields

### Requirement: Framework delivery does not imply an empirical result
The benchmark framework SHALL be independently deliverable without configured provider credentials or a completed live cohort, SHALL reject placeholder or incomplete evidence for hard efficiency claims, and SHALL preserve the full accounting, compatibility, sample, cost, and reliability requirements for any later provider-attested execution.

#### Scenario: Unconfigured provider cohort remains an invalid result
- **WHEN** the benchmark framework is released with placeholder provider, model, cohort, surface, or usage evidence
- **THEN** deterministic validation and comparison reject that evidence while the framework implementation remains usable for a separately configured live run

#### Scenario: Deferred execution preserves the efficiency threshold
- **WHEN** a later follow-up configures a provider/model cohort and executes the corpus
- **THEN** it must satisfy the same complete evidence, minimum sample, 20% default reduction, aggregate-cost, and reliability gates rather than treating framework delivery as a prior pass
