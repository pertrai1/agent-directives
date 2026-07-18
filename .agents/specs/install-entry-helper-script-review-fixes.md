# Spec: Install Entry Helper-Script Review Fixes

## Proposal

Resolve the five material review findings on helper-script installation and the
installed shell helpers without changing the manifest schema or adding package
dependencies.

## Scope

- In scope: working-tree diff completeness, quality-gate detection and failure
  status, helper-aware installation checks, atomic per-entry installation, the
  decision-index formatting fallback, focused regression tests, and targeted
  eval coverage.
- Out of scope: redesigning the CLI, changing target-tool layouts, adding new
  helper scripts, or broad shell portability work unrelated to the findings.

## Design

- Shell-helper behavior is exercised through real temporary repositories and
  processes rather than mocked command calls.
- `--working` combines the tracked diff from `HEAD` with explicit untracked-file
  patches, without mutating the index.
- Default npm gate discovery prefers the aggregate `verify` or `check` script;
  otherwise it runs conventional individual gates. An explicitly requested gate
  that cannot be resolved fails visibly and returns nonzero.
- Installation builds a complete file plan before writing. Any unforced conflict
  returns a conflict result and applies none of the entry's planned writes.
- Entry health requires both the tool-specific owning file and every declared
  helper under `.agents/`.
- Decision indexing tests for `column` before formatting and otherwise emits the
  generated tab-separated table unchanged.

## Requirements

### Requirement: Complete working diff

The review helper SHALL include staged, unstaged, and untracked files when run in
`--working` mode.

#### Scenario: Mixed working tree

- GIVEN a repository has staged, unstaged, and untracked changes
- WHEN `diff.sh --working` runs
- THEN every changed path and its content appears in the review output.

### Requirement: Honest gate status

The gate helper SHALL run a repository-level npm `verify` or `check` command by
default when available and SHALL return nonzero when an explicitly requested gate
cannot be resolved.

#### Scenario: Missing requested test gate

- GIVEN an npm project has no recognized `test` script
- WHEN `gates.sh test` runs
- THEN it reports the unavailable gate and exits nonzero.

#### Scenario: Aggregate npm check

- GIVEN an npm project defines a `check` script
- WHEN `gates.sh` runs without a subset
- THEN it executes that aggregate check once.

### Requirement: Complete installation health

The CLI `check` command SHALL consider an entry missing when its owning file exists
but any declared helper script is absent.

#### Scenario: Deleted required helper

- GIVEN required entries were synchronized successfully
- WHEN a required helper script is deleted and `check` runs
- THEN `check` exits nonzero and names the owning entry as missing.

### Requirement: Atomic entry installation

Installing one entry SHALL make no filesystem changes when any owning file or
declared helper has an unforced conflict.

#### Scenario: Helper conflict

- GIVEN a customized helper conflicts and the owning directive is absent
- WHEN `add` runs without `--force`
- THEN the command exits nonzero, preserves the helper, and does not install the
  owning directive.

### Requirement: Portable decision-index output

The decision-index helper SHALL emit its table when `column` is unavailable.

#### Scenario: Minimal command path

- GIVEN the script can access its required parsing utilities but not `column`
- WHEN it indexes an active decision record
- THEN it exits successfully and outputs the header and record.
