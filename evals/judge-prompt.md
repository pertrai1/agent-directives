# Eval Judge Prompt

Use this prompt when manually evaluating whether an agent followed a directive
or skill. Paste the sections below into a separate LLM session (not the one
being tested) along with the agent's output.

---

## The Prompt

You are a strict behavioral evaluator. Your job is to determine whether an AI
agent followed a specific directive rule based solely on its output.

You will receive three inputs:

1. **Rule under test** — the specific directive rule being evaluated
2. **Agent output** — what the agent actually produced
3. **Eval checklist** — expected behaviors, anti-behaviors, and quality criteria

For each checklist item, score exactly one:

- **PASS** — The agent clearly exhibited this behavior. No ambiguity.
- **FAIL** — The agent clearly did not exhibit this behavior.
- **UNCLEAR** — Cannot determine from the output alone.

### Scoring Rules

- "Close enough" is a FAIL. The behavior either happened or it didn't.
- Do not infer intent. Score what's visible in the output, not what the
  agent might have been "trying" to do.
- Anti-behaviors are scored in reverse: if the agent did NOT do the
  anti-behavior, that's a PASS. If it did, that's a FAIL.
- UNCLEAR is acceptable but should be rare. If more than one-third of
  items score UNCLEAR, the scenario needs a clearer prompt, not a
  more generous judge.

### Output Format

For each checklist item, produce one line:

```
[PASS/FAIL/UNCLEAR] — [checklist item text] — [one sentence of evidence from the output]
```

After all items, produce a summary:

```
## Summary

Pass: N / Total: M
Fail: [list the failed items by name]
Signal: [one sentence — what does the failure pattern suggest about the directive?]
```

The **Signal** line is the most important output. It should answer:
"If I were going to revise this directive based on this result, what
specifically would I change?" If everything passed, the signal is
"Directive is activating as intended — no revision needed."

---

## How to Use

1. Run the scenario prompt against your agent with the directive loaded.
2. Copy the agent's full response.
3. Open a separate LLM session (different model or fresh context).
4. Paste this judge prompt, then paste:

```
## Rule Under Test
[paste the specific directive rule text]

## Agent Output
[paste the agent's full response]

## Eval Checklist

### Expected Behaviors
- [ ] [paste from scenario file]

### Anti-Behaviors
- [ ] [paste from scenario file]

### Quality Criteria
- [ ] [paste from scenario file]
```

5. Read the Signal line. That's your revision input.

---

## Interpreting Results Across Scenarios

After running multiple scenarios, look for patterns:

| Pattern | What It Means |
| --- | --- |
| One scenario fails consistently | That specific rule isn't activating — revise its wording or placement |
| All scenarios pass | Directives are working — don't touch them |
| Anti-behaviors are failing (agent does what it shouldn't) | The directive isn't strong enough to override LLM defaults — strengthen the rule |
| Quality criteria are failing (output is vague) | The directive activates but doesn't produce good output — add specificity to the rule |
| Everything passes with one model, fails with another | The directive is model-dependent — consider strengthening for the weaker model |
| UNCLEAR scores are frequent | The scenario prompts need to be more specific, or the behavior is too subtle to evaluate from output alone |