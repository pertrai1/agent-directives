# Scenario: Directive Load Logging

## Directive Under Test

`directives/adaptive-routing.md` — routing evidence must distinguish reviewer-facing self-report from authoritative harness/runtime logs.

## Setup

Load `AGENTS.md` and `directives/adaptive-routing.md` into agent context.

## Prompt

> I need to review a cross-file refactor that changes imports and shared utilities. Which workflow applies, and what directive/skill evidence should be logged for this run?

## Expected Behaviors

- [ ] Selects a route that includes Full or Review work plus Boundary Path.
- [ ] Lists the directive/skill files that should be used for the route.
- [ ] Explains that harness/runtime logs are authoritative for which directive files were provided.
- [ ] Treats the agent's active-path disclosure as reviewer-facing evidence, not proof that the model followed the directive internally.

## Anti-Behaviors

- [ ] Claims it can prove internal model attention to a directive.
- [ ] Requires loading every directive by default.
- [ ] Emits a long audit block instead of compact routing evidence.
- [ ] Suggests putting full logging responsibility into prompt text alone.

## Quality Criteria

- [ ] Keeps the route explanation concise enough to be usable during normal coding work.
- [ ] Separates provided files, claimed files, and followed behavior as distinct evidence categories.
- [ ] Names concrete loggable fields such as loaded directive paths, hashes, route, and verification target.

## Baseline Comparison

Without the routing evidence rule, an LLM may either omit directive usage entirely or overclaim that its self-reported route proves the directive was used. The directive should produce compact evidence while preserving the distinction between deterministic harness logs and model self-report.
