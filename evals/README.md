# Directive Evals

Manual, two-session evaluations that check whether a directive or skill actually
changes agent behavior. There is no automated runner — each scenario is a
prompt + checklist that you run against a clean Claude session, then hand the
output to a separate judge session.

## Layout

```
evals/
├── README.md          ← this file
├── judge-prompt.md    ← strict evaluator prompt for the judge session
├── run-scenario.sh    ← helper that loads a scenario into a temp workspace
└── scenarios/         ← one markdown file per scenario
```

## Running a scenario

```bash
npm install
npm run check
npm run eval:scenario -- root-agents-routing-presentation
npm run eval:scenario -- --print-only root-agents-routing-presentation
npm run eval:report
```

`eval:scenario` writes a deterministic run manifest under
`evals/results/runs/<timestamp>-<scenario>/manifest.json`. The manifest records
which directive/skill files were provided to the model, their SHA-256 hashes,
byte counts, the assembled prompt path, and expected loads from the scenario.
This is harness evidence; any route or loaded-file list produced by the agent is
self-report and should be judged separately.

## Paired token-efficiency benchmarks

`evals/benchmarks/corpus.json` defines four representative paired cases:
non-behavioral Light edit, one-function behavioral fix, related low-risk batch,
and cross-cutting policy change. Each variant repeats the same prompt, fixture,
outcome-only checklist, and project gates. Route and loaded-file expectations
are diagnostics only; they never determine accepted-change status.

Before an operator run, replace every `PENDING-*` cohort field plus the two
package-artifact references and SHA-256 values with exact, clean immutable
evidence. Execution readiness rejects every pending field (including cohort
fields), placeholder hashes, a dirty harness, or a `harness_version` that is
not the exact current harness commit **before** it creates a workspace,
registers an attempt, or launches a provider. The committed template remains
structurally valid for review, but intentionally cannot produce run evidence.
The cohort values are attestations of the client that actually executes the
attempt, not descriptive labels: record the exact client/model/tokenizer and
hash the effective tool configuration, ambient/global instructions, and
material inference settings supplied by that client adapter. This
provider-neutral harness does not infer provider-specific runtime settings or
usage from an interactive client. A comparison remains incomplete until its
adapter or operator supplies and verifies those actual values and the complete
usage ledger; a filled-in corpus alone is not runtime attestation.

The runner rejects escaping ancestor symlinks for fixture, artifact, and
workspace roots; symlink entries in a git tree; unsafe, duplicate, or
overlapping installed paths; hash mismatches; and identical installed surfaces.
Git-tree paths are listed NUL-safely and file bytes are copied unchanged.

Run one scheduled attempt with a recorded interleaving seed:

```bash
npm run eval:scenario -- --benchmark light-edit --variant baseline --repetition 1 --seed 781
```

Benchmark mode does not support `--print-only`: every scheduled benchmark
attempt is durably registered and must launch. Use ordinary scenario
`--print-only` previews when no benchmark registration is intended.

The benchmark mode hashes and records the exact prompt, fixture, acceptance
checklist, declared gate commands, and complete installed instruction surface.
The manifest passes that exact checklist text and hash into its judge handoff;
route and file-loading observations remain diagnostics only. One clean pinned
harness materializes both instruction variants in an external temporary root,
installs only the selected surface into the fresh fixture workspace, and removes
the paired cache before the tested agent starts.

Each fixture declares one direct `node test/<fixture>.test.mjs` acceptance gate.
The harness resolves `node` to its own `process.execPath`, so workspace PATH,
npm script-shell settings, `.npmrc`, and `node_modules/.bin` shims cannot replace
the executable. It fingerprints the fixture-owned `package.json` and complete
`test/` tree before the attempt and verifies that fingerprint immediately before
the gate. Missing, linked, rewritten, or added protected inputs fail acceptance
before test execution. Benchmark prompts therefore require the existing focused
coverage to pass and do not ask the tested agent to modify fixture-owned tests.

Use `createInterleavedSchedule` from `evals/benchmark-runner.ts` to persist the
seeded baseline/candidate order. Each scheduled entry has a one-based sequence;
the first, second, and subsequent primary registrations must follow that order,
even when retries add intervening ledger sequence numbers. Retries receive a new
attempt ID, retain the original schedule sequence, and point to the earlier
attempt. Record every started attempt before launch;
each category and variant needs at least three actual-usage attempts. Retain
failed, abandoned, and retry attempts in the registry/dataset rather than
selecting successful samples. Generated directories under `evals/results/runs/`
are local evidence and must be removed before committing unless a reviewed
baseline update explicitly includes them.

Benchmark mode creates that immutable full plan once at
`evals/results/runs/benchmark-registries/<corpus-sha256>-<seed>.json`, then
fsyncs each started-attempt record to the separate append-only
`.registrations.jsonl` ledger under an exclusive writer lock. Truncated ledgers,
conflicts, and sequence gaps are invalid. A later dataset/report must reconcile the
same cohort, minimum-repetition policy, seed, exact schedule, and registry through
`validateBenchmarkDatasetAgainstRunPlan`; it may not recreate a registry from
the manifests that happened to survive. Validation reconstructs the interleaved
order from the persisted cases, repetition policy, and seed, so a well-shaped but
rewritten schedule is invalid even when a rewritten dataset repeats it. Use
`--retry-of <attempt-id>` to append
a retry for an existing scheduled entry without overwriting the abandoned or
failed attempt.

Token evidence stores only provider usage counts and provenance. Do not put raw
prompts, credentials, secrets, or billing data into attempt manifests or
datasets.

## Comparing paired benchmark efficiency

After a benchmark has complete provider-attested evidence, compare explicit
baseline and candidate JSON manifests with:

```bash
npm run eval:efficiency -- --baseline baseline.json --candidate candidate.json
```

Each manifest contains the existing complete `dataset`, immutable `plan`, and
normalized #77 `records` call ledger. The comparison validates the persisted
plan/registry/dataset before it considers token policy. It requires matched
corpus, cases, surfaces, schedules, and complete cohort attestation; at least
three measured attempts for every category and selected variant; provider usage
for every workflow call; and at least one accepted change per category.

The default required corpus reduction is exactly `0.20`. To change only that
budget, pass a decimal or exact fraction:

```bash
npm run eval:efficiency -- --baseline baseline.json --candidate candidate.json --minimum-reduction 1/6
```

The command uses exact rational arithmetic for policy decisions and reports
compact per-category plus aggregate TPAC and acceptance rates. Its exits are
`0` for pass, `1` for a policy failure, and `2` for invalid evidence. Lowering
the threshold never bypasses registry, cohort, actual-usage, zero-acceptance,
aggregate-cost, or reliability checks. Failed and retried attempts, plus
primary, delegated, and required-reviewer calls, remain in workflow cost;
evaluator-only calls remain excluded.

The script:

1. Extracts every `AGENTS.md`, `directives/*.md`, and `skills/*/SKILL.md` path mentioned in the
   scenario file's `## Setup` section.
2. Concatenates them into `CLAUDE.md` inside a fresh `mktemp` workspace.
3. Writes `evals/results/runs/<timestamp>-<scenario>/manifest.json` and
   `assembled-prompt.md` with deterministic loaded-file metadata.
4. Prints the scenario's `## Prompt` block so you can paste it into Claude.
5. Launches `claude` in that workspace unless `--print-only` is used.

> **Note:** The `## Workspace State` section is not processed for ordinary
> scenarios. Paired benchmark scenarios instead declare a fixture in the corpus,
> which the runner copies automatically after validating it.

After an ordinary scenario session, copy the agent's full response and run the
**ordinary judge step**:

1. Open a separate LLM session — different model if possible, otherwise a fresh
   context window with no `CLAUDE.md` loaded.
2. Paste the contents of `evals/judge-prompt.md`.
3. Append the three inputs in the format the judge prompt specifies:
   - `## Rule Under Test` — the directive rule text
   - `## Agent Output` — the response you just copied
   - `## Eval Checklist` — Expected Behaviors / Anti-Behaviors / Quality Criteria
     pasted from the scenario file
4. Read the `Signal:` line of the judge's summary. That is the actionable
   revision input.
5. Record the result under `evals/results/runs/*.json` when you want it included
   in the generated health report. See `evals/results/README.md` for the schema.

For a paired benchmark, do **not** paste Expected/Anti/Quality sections from the
scenario. Use the exact `benchmark_protocol.judge_handoff.acceptance_checklist`
stored in that attempt's manifest and verify its hash against
`benchmark_protocol.acceptance_checklist.sha256`. After the tested client exits,
the harness runs each exact allowlisted direct-Node gate in
`benchmark_protocol.project_gates.values` without a shell, verifies its protected
input fingerprint, and records the gate object, protection result, exit status,
stdout, stderr, and aggregate `gates` status in the manifest. Benchmark acceptance derives only
from that outcome checklist plus recorded gate status; route/load observations
remain diagnostics.

## Viewing result health

Generate a static HTML dashboard from structured JSON runs and legacy Markdown
results:

```bash
npm run eval:report
```

The script writes `evals/results/report.html` and prints a terminal summary. The
report groups results by directive/skill target, verdict, failure tags, and any
structured routing evidence present in JSON runs.

Interpret percentages as **covered-scenario telemetry**, not global directive or
skill accuracy:

- Pass rate means passing runs divided by covered runs.
- Routing recall means true expected loads divided by expected loads.
- Routing precision means true expected loads divided by actual loads.
- Always inspect the displayed `n` counts before drawing conclusions.

Your global `~/.claude/CLAUDE.md` is still loaded inside the temp workspace. For
most scenarios that is fine. If a scenario tests behavior that conflicts with
your global instructions, move it aside for the run:

For paired benchmarks, do not change this ambient state between attempts: its
exact effective content must match the recorded `global_instruction_hash` for
the selected cohort, or the resulting evidence is incompatible.

```bash
mv ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak
# run the scenario
mv ~/.claude/CLAUDE.md.bak ~/.claude/CLAUDE.md
```

## Creating a scenario

Add a new file under `evals/scenarios/<name>.md`. Use this structure — the
helper script and the judge prompt both rely on these section headings.

```markdown
# Scenario: <Title>

## Directive Under Test

`directives/<file>.md` — <which specific rule inside it>

## Setup

Load `directives/<file>.md` into agent context.

## Hidden Context

<Context about the project state, environment, or the persona of the user. This is knowledge the evaluator has, but isn't explicitly in the prompt, so the agent has to discover or infer it if necessary.>

## Workspace State

**`path/to/mock/file.ext`**
\```language
content here
\```
<Any initial files that must exist in the temporary workspace before the agent starts. (Can be ignored if no mock files are needed.)>

## Prompt

> <The exact prompt to send to the agent. Use blockquote so it's easy to copy.>

## Expected Behaviors

- [ ] <Concrete, observable behavior #1>
- [ ] <Concrete, observable behavior #2>

## Anti-Behaviors

- [ ] <Behavior the agent should NOT exhibit #1>
- [ ] <Behavior the agent should NOT exhibit #2>

## Quality Criteria

- [ ] <Qualitative bar #1 — how good the passing behavior has to be>
- [ ] <Qualitative bar #2>

## Scoring

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors. (Adjust threshold if needed, e.g., "Meets at least 1 Expected Behavior").

## Baseline Comparison

<One paragraph describing what an LLM does *without* this directive loaded. The
gap between baseline and Expected Behaviors is what the directive is supposed
to close.>
```

### Authoring guidelines

- **Reference loadable files explicitly.** Write `AGENTS.md`, `directives/foo.md`, or
  `skills/foo/SKILL.md` in the Setup section. The helper script greps for those
  path patterns in `## Setup` to decide what to load — references in checklists
  are evaluation criteria, not automatically loaded context.
- **Pick prompts that activate the rule.** A good scenario triggers the
  directive's intended behavior on the first message. If the rule only fires
  mid-task, document the lead-in in Setup (see `jenga-test-quality.md`).
- **Make checklist items binary.** Each item should be answerable PASS / FAIL /
  UNCLEAR by reading the agent's output. Avoid items that require reading the
  agent's mind ("agent considered X").
- **Anti-behaviors are reverse-scored.** "Did NOT do X" is a PASS. Phrase them
  as the bad behavior, not its negation.
- **Keep it to one rule.** If a scenario tests two rules, you can't tell which
  one failed. Write two scenarios.
- **Add variant prompts when useful.** A `## Variant Prompts` section listing
  alternate phrasings of the same situation (see `anti-righting-reflex.md`)
  helps confirm the directive isn't pattern-matching on a single wording.

## Interpreting results across runs

After running multiple scenarios, look for patterns:

| Pattern | What it means |
| --- | --- |
| One scenario fails consistently | That rule isn't activating — revise its wording or placement |
| All scenarios pass | Directives are working — leave them alone |
| Anti-behaviors fail (agent does what it shouldn't) | The rule isn't strong enough to override LLM defaults — strengthen it |
| Quality criteria fail (output is vague) | The rule activates but doesn't produce good output — add specificity |
| Passes on one model, fails on another | The directive is model-dependent — strengthen for the weaker model |
| UNCLEAR scores are frequent | The scenario prompt is ambiguous, not the judge — rewrite the prompt |
