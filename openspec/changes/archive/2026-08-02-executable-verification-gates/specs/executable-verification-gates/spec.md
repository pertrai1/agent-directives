## Purpose

Defines the behavior of the executable verification gates engine, allowing directives and rulesets to declare machine-executable verification scripts and commands that are dynamically installed, validated, and run during the developer's edit/merge loop.

## ADDED Requirements

### Requirement: Verification Schema in YAML Frontmatter
The system MUST support a structured `verification` mapping inside the YAML frontmatter of directives and rules. This schema SHALL contain a list of executable commands, each specifying a human-friendly name, a terminal command string to run, and an optional list of glob files patterns indicating when that command applies.

#### Scenario: Parse valid verification metadata
- **GIVEN** a directive file with a valid verification frontmatter block containing a list of commands and glob filters
- **WHEN** the directive is parsed by the manifest generator or validator
- **THEN** the system successfully validates the YAML structure and registers the commands without errors

#### Scenario: Reject malformed verification metadata
- **GIVEN** a directive file with an invalid verification block structure (e.g., non-array command list, missing 'run' field)
- **WHEN** the directive is validated by the manifest generator or validator
- **THEN** the system reports a validation error and exits with a non-zero code

### Requirement: `agent-directives verify` CLI Command
The CLI SHALL provide a `verify` command that discovers all installed/active verification gates, matches their file-glob filters against the modified or staged files in the current repository, and programmatically executes the associated commands in sequence.

#### Scenario: Running verify command with all passing checks
- **GIVEN** active directives containing verification gates whose file filters match currently modified files
- **WHEN** running `agent-directives verify`
- **THEN** the CLI runs the matched commands, displays a successful pass report for each executed check, and exits with code 0

#### Scenario: Running verify command with a failing check
- **GIVEN** active directives containing verification gates where at least one matching check fails its execution
- **WHEN** running `agent-directives verify`
- **THEN** the CLI stops execution on failure (or logs the failure), displays a failed status report, and exits with a non-zero code

#### Scenario: Running verify with no matching modified files
- **GIVEN** active directives with verification gates, but none of their file filters match the modified file list in git
- **WHEN** running `agent-directives verify`
- **THEN** the CLI reports that 0 verification gates matched, skips execution, and exits with code 0

### Requirement: Active Verification Script Generation
When installing or synchronizing directives (via `sync` or `add` commands), the system SHALL compile all active verification gates and write a standalone, executable helper script under `.agents/bin/verify`. Running this script SHALL invoke `agent-directives verify` to validate the workspace.

#### Scenario: Generating verify script on sync
- **GIVEN** a clean project workspace syncing its required directives
- **WHEN** the sync command finishes installing the required directives
- **THEN** a standalone executable script is written to `.agents/bin/verify` with appropriate execution permissions set
