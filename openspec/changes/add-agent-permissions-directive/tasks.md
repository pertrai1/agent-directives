## 1. Directive Authoring

- [x] 1.1 Add `directives/agent-permissions.md` with frontmatter for a non-required workflow directive covering Claude, Copilot, Codex, and Cursor.
- [x] 1.2 Define the least-privilege posture for reading, writing, running commands, installing packages, network use, publishing, pushing, deploying, and transmitting repository data.
- [x] 1.3 Document protected file categories that normally require approval, including `.env*`, lockfiles, package manager config, CI workflows, deploy scripts, infra/IaC, migrations, and auth or security-sensitive config.
- [x] 1.4 Document risky command categories that normally require approval, including dependency installation, publishing, deploys, destructive git operations, force pushes, cloud/infra commands, and commands that send repo data externally.
- [x] 1.5 Document denied-until-explicit actions, including broad deletion, unrelated history rewriting, disabling checks to pass CI, and exposing or printing secrets.
- [x] 1.6 Add escalation and blocked-work reporting protocols that tell agents what to state, when to pause, and how to report safe alternatives.
- [x] 1.7 State the advisory boundary: the directive does not replace IDE permissions, harness permissions, sandboxing, CI, or future enforcement artifacts.

## 2. Routing And Discovery

- [x] 2.1 Update `directives/adaptive-routing.md` to conditionally load `directives/agent-permissions.md` for protected files, risky commands, package manager operations, deployment, infrastructure, secrets, CI, and repo policy work.
- [x] 2.2 Bump the `directives/adaptive-routing.md` frontmatter version according to the repo instruction version policy.
- [x] 2.3 Update root templates that list available directives so downstream installs can discover `agent-permissions`.
- [x] 2.4 Update the README directive inventory with the new directive and its purpose.

## 3. Eval Coverage

- [x] 3.1 Add or update a targeted eval scenario that verifies `agent-permissions` loads for a risky permission surface.
- [x] 3.2 Ensure the scenario expects escalation or refusal behavior when the task involves approval-required or denied actions.
- [x] 3.3 Run the relevant scenario print-only check if a scenario file is added or changed.

## 4. Manifest And Verification

- [x] 4.1 Regenerate `manifest.json` so the new directive is discoverable.
- [x] 4.2 Run `npm run check` for type-checking, validation, manifest, CLI, package, and version-bump gates.
- [x] 4.3 Run `git diff --check` to catch whitespace issues.
- [x] 4.4 Review the final diff to confirm the change stays scoped to the advisory agent permissions directive and related routing/discovery/eval updates.
