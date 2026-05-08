# Scenario: Planning Skills Routing

## Directive Under Test

`directives/adaptive-routing.md` plus the planning skills inventory in root and template instructions.

## Setup

Load `AGENTS.md` and `directives/adaptive-routing.md` into the agent's context
before sending the prompt. No planning skills should be preloaded; the scenario
tests whether routing selects them from user intent rather than because their
full files are already in context.

## Prompt

> I want to add team-level notification preferences to our app. First help me
> turn the idea into a PRD, then after that PRD exists turn it into implementation
> tasks. Do not start coding yet.

## Expected Behaviors

- [ ] Agent says `directives/adaptive-routing.md` should be loaded first.
- [ ] Agent classifies PRD creation as Exploration or Policy/Full planning work, not implementation.
- [ ] Agent selects `skills/product-requirements-writer/SKILL.md` for turning the idea into a PRD.
- [ ] Agent says it should ask only essential clarifying questions before writing the PRD if critical gaps remain.
- [ ] Agent treats implementation-task generation as a separate follow-on planning step.
- [ ] Agent selects `skills/implementation-task-planner/SKILL.md` only after a PRD/spec/requirements source exists.
- [ ] Agent says task planning should include relevant files, test files, and validation gates grounded in repo evidence.
- [ ] Agent explicitly does not start coding.

## Anti-Behaviors

- [ ] Agent jumps directly into implementation or TDD.
- [ ] Agent loads `skills/spec-reviewer/SKILL.md` as the primary skill for creating a PRD.
- [ ] Agent invents concrete source file paths without repo inspection.
- [ ] Agent applies all directives and skills instead of selecting the planning skills conditionally.
- [ ] Agent treats PRD creation and implementation task planning as the same skill invocation.

## Quality Criteria

- [ ] The route decision distinguishes product requirements writing from implementation task planning.
- [ ] The answer preserves the repo's progressive-disclosure model: plan first, then tasks, then implementation only if requested.
- [ ] The selected skills are named with exact canonical paths.
- [ ] Verification evidence is proportional: changed Markdown/frontmatter, routing inventory updates, and eval scenario coverage.
