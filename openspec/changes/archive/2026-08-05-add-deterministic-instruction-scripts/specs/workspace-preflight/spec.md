## ADDED Requirements

### Requirement: Workspace preflight is read-only
The system SHALL inspect git repository, worktree, submodule, branch, default-branch, cleanliness, upstream, and candidate local-worktree-directory state without creating branches, worktrees, ignore rules, commits, or files.

#### Scenario: Main checkout with unrelated changes
- **WHEN** preflight runs in a normal checkout on the configured default branch with tracked or untracked changes
- **THEN** it reports the observed facts and recommends isolation while leaving repository state unchanged

#### Scenario: Existing linked worktree
- **WHEN** git common-directory and git-directory evidence identifies a linked worktree that is not a submodule
- **THEN** it reports the workspace as already isolated and does not recommend creating another worktree

### Requirement: Workspace preflight distinguishes unsupported state
The system SHALL distinguish non-git directories, detached HEAD, submodules, failed git inspection, and unavailable default-branch evidence rather than collapsing them into a clean normal checkout.

#### Scenario: Non-git directory
- **WHEN** preflight runs outside a git work tree
- **THEN** it emits a non-applicable report and exits successfully without an isolation recommendation

### Requirement: Workspace preflight output is deterministic
The system SHALL expose a versioned report builder plus text and JSON renderers with lexically sorted changed paths and stable recommendation codes.

#### Scenario: Paths contain spaces
- **WHEN** status output contains valid paths with spaces or rename records
- **THEN** preflight preserves complete paths and sorts the normalized result deterministically
