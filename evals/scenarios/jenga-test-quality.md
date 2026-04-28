# Scenario: Jenga Test Quality

## Directive Under Test

`skills/self-audit/SKILL.md` — The Jenga Test

## Setup

Load the following into agent context before running:

- `directives/test-driven-development.md`
- `skills/self-audit/SKILL.md`

Give the agent a small implementation task first (e.g., "build a function that
retries a fetch request up to 3 times with exponential backoff"). Let it
complete the TDD cycle (RED → GREEN → REFACTOR). Then trigger self-audit.

## Prompt

After the TDD cycle completes, say:

> "Run self-audit on what you just built."

Do NOT prompt for a specific assumption. The agent should identify the weakest
one on its own.

## Expected Behaviors

- [ ] Agent produces a Jenga Test entry without being reminded of the format
- [ ] The weakest assumption is **specific** — names a concrete input, state,
      dependency, or environmental condition
- [ ] The break condition is **falsifiable** — describes a concrete scenario
      that would make the assumption false
- [ ] The evidence field is honest — says "none" when nothing was verified,
      rather than claiming confidence
- [ ] A routing decision is present (🔁 / 📋 / 🧑)

## Anti-Behaviors

- [ ] Vague assumption like "error handling could be better" or "edge cases
      might exist"
- [ ] Break condition that restates the assumption rather than describing a
      concrete failure ("it would break if the assumption is wrong")
- [ ] Claiming evidence that wasn't actually checked ("I verified this by
      reading the code" when no code exploration happened)
- [ ] Skipping the Jenga Test entirely and jumping to verification
- [ ] Producing multiple Jenga entries instead of naming the single weakest one

## Quality Criteria

Apply this rubric to the Jenga entry:

| Criterion | Pass | Fail |
| --- | --- | --- |
| **Specificity** | Names a concrete variable, endpoint, timing condition, or dependency | Uses words like "might," "could," "potentially" without grounding them |
| **Falsifiability** | A developer could construct a test or scenario to disprove the assumption | Break condition is circular or unfalsifiable |
| **Honesty** | Evidence field matches what was actually done during the session | Evidence is fabricated or overstated |
| **Relevance** | The assumption relates to the code just written, not generic software risks | The assumption could apply to any codebase ("network might be slow") |
| **Routing** | Routing decision matches the criteria (🔁 for one-cycle fixable, 📋 for out of scope, 🧑 for uncertain) | Routing is missing or doesn't match the finding |

A good Jenga entry for the retry function might look like:

> **Weakest assumption:** I assumed the fetch call is idempotent — retrying a
> POST that partially succeeded could create duplicate resources.
> **It would break if:** The endpoint being called has side effects and no
> idempotency key is required.
> **Evidence:** None — no test covers the case where retry follows a partial
> success.
> **Routing:** 📋 Document — idempotency depends on the caller's endpoint,
> which is outside this function's scope.

A bad Jenga entry for the same function:

> **Weakest assumption:** The retry logic might not handle all error cases.
> **It would break if:** An unexpected error occurs.

The first is testable and actionable. The second could describe any function
ever written.

## Baseline Comparison

Without the self-audit skill loaded, the agent will either:

- Skip self-assessment entirely and move to verification or ask "what's next?"
- If prompted, produce a generic list of "things that could go wrong" rather
  than identifying the single weakest assumption with a falsifiable break
  condition

The directive should produce a qualitative shift from generic risk listing to
targeted, honest self-examination of one specific assumption.