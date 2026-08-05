---
name: workspace-isolation
description: Keeps mutable work in an isolated workspace by detecting existing isolation first, preferring native tools, and falling back to git worktrees only when needed.
version: 1.1.0
required: false
category: workflow
tools:
  - claude
  - codex
triggers:
  - isolated-workspace
  - worktree
  - branch-isolation
  - feature-work
routing:
  load: conditional
  applies_to:
    - implementation
    - debugging
---

# Workspace Isolation Directive

**When to load:** Before implementation or invasive debugging in a git-backed
repository when the current checkout may be shared, protected, dirty, or not
isolated.

## Non-Negotiable Policy

1. Detect existing isolation before creating anything.
2. Prefer a platform-native workspace mechanism over manual `git worktree`.
3. Ask before creating a workspace when neither the user nor project instructions
   already authorize isolation.
4. Treat protected/default branches and checkouts with unrelated changes as
   isolation candidates.
5. Run setup and baseline checks in the workspace where edits will occur.

## Command-First Preflight

When the installed CLI is available, run this read-only inspection first:

```bash
agent-directives workspace-preflight --format json
```

The report deterministically collects repository, branch, default-branch,
worktree, submodule, cleanliness, upstream, and candidate-directory facts.
Interpret its recommendation code as follows:

| Code | Meaning | Next action |
| --- | --- | --- |
| `already-isolated` | A linked worktree is already active and is not a submodule | Reuse it |
| `isolation-recommended` | The checkout is shared/protected or has local changes | Decide whether to isolate; exit `1` is a recommendation, not an inspection failure |
| `in-place-clean` | A normal clean checkout was observed | Continue in place only when policy/user intent allows |
| `non-git` | The directive does not apply | Continue with the routed workflow |
| `needs-human` | Detached HEAD or required evidence is unavailable | Resolve the named uncertainty before mutation |

Exit `2` means inspection failed or required evidence was unavailable. Do not
silently reinterpret it as a clean checkout.

The report supplies facts and a stable recommendation. It does not authorize
creating a branch, worktree, directory, or ignore rule.

### Compact Fallback

If the CLI is unavailable, collect only the equivalent evidence:

```bash
git rev-parse --is-inside-work-tree
git rev-parse --git-dir
git rev-parse --git-common-dir
git rev-parse --show-superproject-working-tree
git branch --show-current
git status --short
```

Different git/common directories indicate a linked worktree only when the
checkout is not a submodule. State missing or failed evidence explicitly.

## Choose the Isolation Mechanism

Use this order:

1. Explicit user/project preference
2. Native workspace support supplied by the platform
3. Existing ignored `.worktrees/` or `worktrees/`
4. An outside-repository worktree location
5. A new project-local directory only with explicit approval and ignore proof

For a project-local fallback, verify the selected directory—not a guessed one:

```bash
git check-ignore -q "<chosen-directory>"
git worktree add "<path>" -b "<branch-name>"
```

Do not modify `.gitignore` silently. Prefer an existing ignored path,
`.git/info/exclude`, or an outside-repository location. If creation is blocked,
report the failure and continue in place only with explicit justification.

## Baseline in the Active Workspace

After entering or choosing the workspace:

- confirm path and branch;
- run only documented setup needed for the task;
- rerun `git status --short`;
- run the smallest relevant baseline check;
- identify pre-existing changes or failures before editing.

Do not use evidence collected in a different checkout.

## Forbidden Patterns

| Pattern | Why forbidden |
| --- | --- |
| Creating a worktree before preflight | Risks duplicate or nested isolation |
| Bypassing a native workspace tool without cause | Fights harness lifecycle management |
| Editing a protected/default or dirty shared checkout without considering isolation | Risks unrelated work |
| Creating a project-local directory without ignore proof | Pollutes status and commits |
| Treating a submodule as an isolated worktree | Misclassifies repository ownership |
| Treating failed inspection as non-git or clean | Hides required evidence |
| Baseline in one checkout, edits in another | Makes evidence irrelevant |

The command replaces mechanical git probing. This directive still owns consent,
mechanism selection, fallback judgment, and baseline policy.
