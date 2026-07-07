## Why

Agents working in L2/L3/L4+ repo workflows can edit files, run commands, install packages, push, or continue work across longer sessions, but this repo does not yet provide a portable directive that defines execution-time permission boundaries. Adding an agent permissions directive gives supported tools a shared least-privilege vocabulary for risky files, commands, secrets, escalation, and blocked work.

## What Changes

- Add `directives/agent-permissions.md` as a reusable workflow directive for portable agent permission policy.
- Define default least-privilege behavior for reads, writes, commands, installs, network use, publishing, pushing, deployment, secrets, and destructive operations.
- Document protected file categories and risky command categories that normally require explicit approval before proceeding.
- Document deny-by-default actions such as broad deletion, unrelated history rewriting, disabling checks to pass CI, and exposing secrets.
- Define an escalation protocol that requires the agent to state the requested action, why it is needed, affected files or commands, and whether approval is required.
- Define a reporting protocol for cases where permission policy blocks or narrows the work.
- Keep this change limited to advisory directive guidance; optional deterministic enforcement artifacts are out of scope for this change.

## Capabilities

### New Capabilities

- `agent-permissions`: Defines portable read/write/command/network permission boundaries and escalation behavior for agents working in a repository.

### Modified Capabilities

None.

## Impact

- Adds a new directive under `directives/` with initial frontmatter and guidance content.
- May require manifest regeneration and documentation/template inventory updates so downstream users can discover and install the directive.
- May require a targeted routing/eval update if the directive must be conditionally loaded for protected files, risky commands, installs, deploys, secrets, CI, infra, or repo policy work.
- Does not add enforcement scripts, hooks, CI workflows, package dependencies, or agent-specific sandbox integrations.
