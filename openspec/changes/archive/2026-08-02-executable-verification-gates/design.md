## Context

Currently, our agent directives specify a variety of verification checks (e.g., in `directives/verification.md` and rulesets), but these gates are described only in static markdown. Agents must read the instructions, discover the commands, and execute them manually. This process is prone to error and can result in incomplete or skipped verifications. 

See `proposal.md` for more motivation.

## Goals / Non-Goals

**Goals:**
- Provide a machine-readable schema for specifying verification checks directly in directive/ruleset frontmatter.
- Add an `agent-directives verify` command to programmatically discover and run these checks.
- Generate a standalone executable verification runner script at `.agents/bin/verify` during install/sync.
- Execute only the checks whose file filters overlap with the modified files in the repository.

**Non-Goals:**
- Creating a full-fledged external test runner. The CLI will leverage existing project-native commands (e.g. `npm run check`, `pytest`, `eslint .`) and act as a coordinator.
- Automatically fixing code failures. The tool only reports the status of each gate.

## Decisions

### 1. Frontmatter Schema Definition
We will support a `verification` mapping block in markdown frontmatter.

**Option A:** Flat list of commands under `verification:`
**Option B (Chosen):** Structured mapping with a list of `commands` containing metadata and glob filters under `verification.commands`:
```yaml
verification:
  commands:
    - name: "TypeScript Check"
      run: "npm run typecheck"
      files: ["src/**/*.ts", "tsconfig.json"]
```
*Rationale:* Structured mapping allows future extensibility (e.g., adding environment requirements, timeout, or severity levels) and keeps the commands group organized.

### 2. Matching Changed Files
We need to map verification gates to modified files so we only run checks when relevant.

*Method:*
- Use `git status --porcelain` to retrieve the list of modified/untracked files.
- Implement a lightweight, dependency-free glob matcher inside `src/` to compare file paths with the `files` array of each gate.
- If a gate lacks a `files` array, it is treated as a global gate and *always* executes.

### 3. Executable Helper Script Generation
To provide a simple, unified interface for the developer or agent, we will write an executable script `.agents/bin/verify` when syncing.

*Method:*
- In `src/install.ts`, write `# !/bin/sh \n npx agent-directives verify` to `.agents/bin/verify`.
- Use `fs.chmodSync(path, 0o755)` to ensure the script is instantly executable on Unix-based systems.

## Risks / Trade-offs

- **Risk:** Commands in directives run arbitrary shell execution.
  - **Mitigation:** Since these directives are installed and managed locally within the user's workspace, this matches standard package managers. The existing `agent-permissions` directive can warn about risky command executions.
- **Risk:** Git repository might not be present or initialized.
  - **Mitigation:** If git is missing or not a repo, the `verify` command will gracefully fall back to executing *all* verification gates (or reporting 0 changed files and warning the user).
