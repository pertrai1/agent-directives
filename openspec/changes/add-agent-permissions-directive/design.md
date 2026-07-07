## Context

The repository already ships portable workflow directives, root templates, a manifest, and eval scenarios. Existing safety guidance covers route selection, task framing, workspace isolation, verification, and review, but there is no standalone directive that tells an agent what it may read, write, run, install, push, deploy, or escalate while work is underway.

This change adds one advisory directive, `directives/agent-permissions.md`, for repos that want shared permission vocabulary across Claude, Codex, Copilot, Cursor, and similar agents. It must remain portable and instructional rather than assuming a specific IDE, sandbox, hook framework, or CI implementation.

## Goals / Non-Goals

**Goals:**

- Add a self-contained workflow directive with frontmatter consistent with existing `directives/*.md` files.
- Define default least-privilege behavior for file access, command execution, network use, package operations, git operations, publishing, deployment, and secrets.
- Categorize actions into allowed-by-default, approval-required, and denied-unless-explicitly-requested behavior without pretending the directive can enforce tool permissions by itself.
- Provide a compact escalation and blocked-work reporting protocol that agents can apply during implementation, debugging, review, and policy-change work.
- Keep routing and inventory updates minimal and consistent with existing directive discovery patterns.

**Non-Goals:**

- Do not add enforcement scripts, hooks, GitHub Actions workflows, CODEOWNERS files, policy YAML templates, or CLI install profile changes in this change.
- Do not hard-code rules for one downstream repository or one agent harness.
- Do not make `agent-permissions` always-loaded by default.
- Do not claim deterministic blocking of risky commands; actual enforcement remains the responsibility of the user, harness, CI, or future enforcement artifacts.

## Decisions

### Decision 1: Add a standalone conditional directive

Implement `agent-permissions` as `directives/agent-permissions.md` with `required: false`, `category: workflow`, and conditional routing metadata.

Alternative considered: fold permission rules into `adaptive-routing.md`. Rejected because adaptive routing is always loaded and should stay compact; detailed permission categories would bloat every task's context.

Alternative considered: fold permission rules into `workspace-isolation.md`. Rejected because workspace isolation protects where edits happen, while permissions govern what actions are allowed or require escalation.

### Decision 2: Use policy categories, not exhaustive command allowlists

The directive should name common protected file patterns and risky command families, then require escalation for project-specific policy or tool permission requirements.

Alternative considered: maintain a comprehensive allow/deny command table. Rejected because command names vary across ecosystems and an incomplete list can create false confidence.

Alternative considered: avoid examples and only describe principles. Rejected because agents need concrete triggers such as `.env*`, lockfiles, CI workflows, deploy scripts, `npm install`, `git reset --hard`, force pushes, cloud CLI commands, and commands that transmit repo data externally.

### Decision 3: Separate advisory guidance from deterministic enforcement

The directive should explicitly state that it does not replace IDE, harness, sandbox, or CI permissions. It should teach the agent when to pause, ask, refuse, or narrow work, while leaving enforcement artifacts for a follow-up change.

Alternative considered: include enforcement templates now. Rejected because the proposal scopes item 1 to the directive only, and enforcement introduces separate design questions around policy schema, CLI install behavior, CI overrides, and target-repo file ownership.

### Decision 4: Route by risky surface area

`adaptive-routing.md` should conditionally load `agent-permissions` when a task touches protected files, risky commands, package manager operations, deployment, infra, secrets, CI, or repo policy. Route output may also mention whether approval is required when that is known.

Alternative considered: rely on users to request the directive explicitly. Rejected because the highest-value permission checks are needed before risky actions, including when the user did not know to ask for them.

## Risks / Trade-offs

- Over-broad permission language could cause agents to ask for approval too often -> Mitigation: frame approval requirements around risky file categories, command families, denied actions, and project policy rather than every edit.
- Under-specific guidance could fail to stop risky behavior -> Mitigation: include concrete protected files, risky commands, denied actions, and an explicit escalation protocol.
- Routing updates can create context bloat if the directive loads too often -> Mitigation: keep routing conditional and tied to protected surfaces or risky actions.
- Advisory guidance can be mistaken for enforcement -> Mitigation: state the limitation directly in the directive and keep future enforcement artifacts out of scope.
- Documentation, templates, manifest, and evals may drift if only the directive is added -> Mitigation: include discovery and routing updates in the implementation tasks, and run manifest/validation checks after editing.

## Migration Plan

Add the directive and update routing, inventories, templates, manifest, and targeted eval coverage in one small policy change. Existing users are not broken because the new directive is optional and conditionally loaded.

Rollback is straightforward: remove the new directive and revert related routing, inventory, manifest, and eval updates before release. No data migrations, package installs, or runtime deploys are involved.

## Open Questions

- Should `agent-permissions` be listed in every root template by default, or only in templates that already include the full directive inventory?
- Should route output add a distinct `Permission mode` field now, or is listing the directive plus confirmation requirement enough for the first pass?
- Which eval scenario gives the tightest coverage for item 1: editing `.env`, modifying CI, installing a dependency, or running a deploy command?
