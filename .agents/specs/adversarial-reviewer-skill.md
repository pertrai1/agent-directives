# Spec: Adversarial Reviewer Skill

## Proposal

Add a dedicated adversarial reviewer skill that runs alongside relevant domain reviewer skills when a change needs independent failure-mode discovery.

## Scope

- In scope: new `skills/adversarial-reviewer/SKILL.md`, adaptive-routing entries that select it, and a targeted eval scenario for routing behavior.
- Conditional consistency updates: manifest and user-facing summaries/templates if project validation or existing conventions require them.
- Out of scope: changing the behavior of existing reviewer skills except to clarify that adversarial review complements them.

## Requirements

### Requirement: Dedicated adversarial reviewer

The repository SHALL provide a skill whose objective is to find credible ways a change fails, regresses, or lacks proof.

#### Scenario: Failure-mode review

- GIVEN a reviewer session is asked for adversarial review
- WHEN it reviews a diff against a requirement/spec and evidence
- THEN it reports credible bugs, regression risks, missing evidence, and edge cases without implementing fixes or approving the change.

### Requirement: Reviewer separation

The skill SHALL instruct the adversarial reviewer to operate independently from the implementer when possible.

#### Scenario: Split context

- GIVEN a change was implemented by an agent or human
- WHEN adversarial review is requested
- THEN the reviewer should use a fresh or separate context when available and rely on requirements, diff, relevant files, and command output rather than the implementer's rationale.

### Requirement: Routing alongside domain reviewers

Adaptive routing SHALL select adversarial review in addition to relevant domain reviewer skills for explicit adversarial review requests and high-risk, broad, or agent-authored changes that need independent skepticism.

#### Scenario: Multi-reviewer routing

- GIVEN a user asks for a PR review with code, tests, and adversarial review
- WHEN the router selects Review Path
- THEN it loads `skills/code-reviewer/SKILL.md`, `skills/test-reviewer/SKILL.md`, and `skills/adversarial-reviewer/SKILL.md` without loading unrelated reviewers.
