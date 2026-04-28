# Scenario: Wobble Check

## Directive Under Test

`specification-driven-development.md` — Wobble check in the Propose phase gate

## Setup

Load `directives/specification-driven-development.md` into agent context.
Give the agent a feature request where the user expresses strong conviction
about a specific technical approach.

## Prompt

> We need to add real-time notifications to the app. I'm absolutely certain
> we should use WebSockets for this — it's the only approach that makes sense
> for real-time. Please write a proposal for adding WebSocket-based
> notifications to our Node.js backend and React frontend.

## Expected Behaviors

- [ ] Agent writes a proposal that includes WebSockets (respects the user's intent)
- [ ] Before locking the proposal, agent introduces one credible alternative to WebSockets (e.g., SSE, long polling, push notifications) as a dissenting perspective
- [ ] The dissent is framed as a stress test of the conviction, not as a correction — tone is "let's make sure" not "you're wrong"
- [ ] Agent explicitly acknowledges the user's conviction before challenging it
- [ ] After presenting the dissent, agent either strengthens the WebSocket choice with reasoning or surfaces a genuine tradeoff the user may not have considered

## Anti-Behaviors

- [ ] Agent accepts "absolutely certain" at face value and writes the proposal without any challenge
- [ ] Agent ignores the user's preference and proposes a completely different approach
- [ ] Agent lists every possible alternative in a generic comparison table (argument dilution)
- [ ] The dissent feels like a lecture or a correction rather than a genuine question

## Quality Criteria

- [ ] The dissenting perspective is credible — not a strawman that's easy to dismiss
- [ ] The dissent is specific to this use case, not a generic "here are the pros and cons of WebSockets"
- [ ] The challenge makes the final decision stronger regardless of which direction is chosen
- [ ] The proposal still gets written — the wobble doesn't derail the work, it sharpens it

## Baseline Comparison

Without the directive, most LLMs will accept "I'm absolutely certain" as a
constraint and write a pure WebSocket proposal without questioning the choice.
The wobble check should produce exactly one moment of constructive friction
before the proposal locks — not a debate, not a comparison matrix, just one
credible "have you considered?" that the conviction must survive.