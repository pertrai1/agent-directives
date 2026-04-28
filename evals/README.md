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
evals/run-scenario.sh <scenario-name>      # e.g. anti-righting-reflex
```

The script:

1. Finds every `directives/*.md` and `skills/*/SKILL.md` path mentioned in the
   scenario file.
2. Concatenates them into `CLAUDE.md` inside a fresh `mktemp` workspace.
3. Prints the scenario's `## Prompt` block so you can paste it into Claude.
4. Launches `claude` in that workspace.
5. Deletes the workspace when claude exits.

After the session, copy the agent's full response and run the **judge step**:

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

Your global `~/.claude/CLAUDE.md` is still loaded inside the temp workspace. For
most scenarios that is fine. If a scenario tests behavior that conflicts with
your global instructions, move it aside for the run:

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
<Any preamble: a prior task to complete, a feature request to send first, etc.>

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

## Baseline Comparison

<One paragraph describing what an LLM does *without* this directive loaded. The
gap between baseline and Expected Behaviors is what the directive is supposed
to close.>
```

### Authoring guidelines

- **Reference loadable files explicitly.** Write `directives/foo.md` or
  `skills/foo/SKILL.md` in the Setup section. The helper script greps for those
  path patterns to decide what to load — anything else won't be picked up.
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
