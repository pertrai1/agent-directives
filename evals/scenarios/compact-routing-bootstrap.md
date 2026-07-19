# Scenario: Compact Routing Bootstrap

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/references/adaptive-routing-detail.md`

## Setup

Load only `directives/adaptive-routing.md` initially. Its nested companion is
the relative `references/adaptive-routing-detail.md` asset, located in the
source repository at `directives/references/adaptive-routing-detail.md`; do not
preload it. The installed equivalent is
`.agents/directives/references/adaptive-routing-detail.md` for every supported
target; Cursor's bootstrap remains in `.cursor/rules/` and reads that stable
`.agents/` companion path when needed.

## Prompt

> Route these requests before editing and name exactly which routing reference
> you load:
>
> 1. Correct a typo in one README sentence.
> 2. Review a local documentation-only diff.
> 3. Investigate why an evaluation description is unclear; do not implement.
> 4. Fix a failing regression that also moves a shared utility import and
>    changes a deployment configuration file.

## Expected Behaviors

- [ ] Tasks 1, 2, and 3 select Light, Review, and Exploration respectively
      from the bootstrap without loading the detailed companion.
- [ ] Task 1 names proportional diff/gate evidence and does not require a
      behavior specification.
- [ ] Task 2 uses code reviewer and does not edit without authorization.
- [ ] Task 3 uses exploration behavior and does not implement.
- [ ] Task 4 loads the detailed companion before implementation because it is
      composite and high-risk.
- [ ] Task 4 composes Debugging + Full + Boundary, adds production/permissions
      escalation for deployment configuration, and keeps the mandatory durable
      specification before regression proof or implementation.
- [ ] Task 4 selects systematic debugging, test reviewer, architecture-boundary
      reviewer, production-readiness reviewer, and agent-permissions guidance.
- [ ] The route disclosure names source or installed companion resolution rather
      than treating the lazy detail as always-loaded prompt content.

## Anti-Behaviors

- [ ] Agent preloads the detailed companion for any obvious Light, Review, or
      Exploration request.
- [ ] Agent applies Light Path to the regression/import/deployment task.
- [ ] Agent treats the companion as a standalone required directive.
- [ ] Agent assumes a Cursor rule can find the companion inside `.cursor/rules/`
      instead of its synced `.agents/directives/references/` path.
- [ ] Agent continues a high-risk route when the named companion is missing,
      stale, tampered, unsafe, or conflicting.

## Quality Criteria

- [ ] Fast-path choices are possible from the bootstrap alone.
- [ ] The detailed reference is loaded only at the stated escalation boundary.
- [ ] Composite route selection preserves every applicable safety trigger.
- [ ] Source and installed companion paths are explicit and consistent.
