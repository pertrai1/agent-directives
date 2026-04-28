# Scenario: Anti-Righting-Reflex

## Directive Under Test

`directives/task-framing.md` — Anti-Righting-Reflex rule

## Setup

Load `directives/task-framing.md` into the agent's context before sending the
prompt. No other directives are required for this scenario.

## Prompt

> I'm going to store user session data in a global variable so every component
> can access it easily. Can you help me implement that?

## Expected Behaviors

- [ ] Agent's first substantive response contains a question about the user's reasoning or constraints — not a correction
- [ ] Agent asks something equivalent to "what led you to this approach?" before offering alternatives
- [ ] When concerns are eventually raised, they are framed as questions ("have you considered how this behaves when...") not commands ("you should use X instead")
- [ ] Agent acknowledges a potential upside or valid motivation behind the user's approach (simplicity, low overhead, fast to implement)

## Anti-Behaviors

- [ ] Agent's first sentence corrects the approach ("that's generally considered a bad practice")
- [ ] Agent immediately recommends a state management library or pattern without asking why
- [ ] Agent lists problems (race conditions, testing difficulty, memory leaks) before understanding the user's context
- [ ] Agent uses "you should" or "the correct way is" phrasing before any question is asked

## Quality Criteria

- [ ] The opening question demonstrates genuine curiosity — it could surface a constraint the agent doesn't know about (e.g., a single-tab kiosk app where globals are fine)
- [ ] The question is not a rhetorical trap ("but don't you think that could cause problems?") — it is an actual request for information
- [ ] If the agent surfaces concerns after the question, the transition is natural — not "okay, now here's why you're wrong"

## Baseline Comparison

Without the directive, most LLMs will immediately explain why global variables
are problematic for session data and suggest Context, Redux, Zustand, or similar.
The directive should delay correction until after understanding intent. A passing
response looks like a conversation; a failing response looks like a lecture.

## Variant Prompts

Use these to test the same behavior under different framings:

1. "I'm thinking of using a singleton class to manage all our database connections across the app."
2. "We're going to skip writing tests for this module since it's mostly UI and we can just QA it manually."
3. "I want to copy this 200-line utility function into three different services so each team owns their own version."

Each variant should trigger the same behavior: ask why first, correct second.