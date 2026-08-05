## MODIFIED Requirements

### Requirement: `agent-directives verify` CLI Command
The CLI SHALL provide a `verify` command that discovers all installed/active verification gates, matches their file-glob filters against the modified or staged files in the current repository, programmatically executes the associated commands in sequence, and exposes structured results that the verification-report capability can consume without parsing console text.

#### Scenario: Running verify command with all passing checks
- **GIVEN** active directives containing verification gates whose file filters match currently modified files
- **WHEN** running `agent-directives verify`
- **THEN** the CLI runs the matched commands, displays a successful pass report for each executed check, exposes equivalent structured results, and exits with code 0

#### Scenario: Running verify command with a failing check
- **GIVEN** active directives containing verification gates where at least one matching check fails its execution
- **WHEN** running `agent-directives verify`
- **THEN** the CLI displays a failed status report, exposes the failed structured result, and exits with a non-zero code

#### Scenario: Running verify with no matching modified files
- **GIVEN** active directives with verification gates, but none of their file filters match the modified file list in git
- **WHEN** running `agent-directives verify`
- **THEN** the CLI reports that 0 verification gates matched, skips execution, exposes an empty successful structured result, and exits with code 0
