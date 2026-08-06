---
name: context-handoff
description: Compresses task state at directive or session boundaries so later phases can continue from a compact, current-state handoff instead of drifting through accumulated chat history.
version: 1.4.0
scripts:
  - scripts/handoff-state.sh
required: false
category: workflow
tools:
  - claude
  - codex
triggers:
  - directive-boundary
  - session-handoff
  - context-compaction
  - long-running-task
  - multi-phase-workflow
routing:
  load: conditional
  applies_to:
    - implementation
    - debugging
    - review
    - exploration
    - policy-change
---

# Context Handoff Directive

## Purpose

Use a handoff at major phase/session boundaries, before another agent continues,
when pausing long work, or when stale context could distort the next step. A
handoff is a compact current-state capsule, not a transcript and not proof by
itself.

Markdown cannot erase active model context. A fresh session should start from
the user's current request, the latest capsule, routed project instructions, and
fresh repository evidence.

Light Path one-step work usually does not need a handoff unless requested.

## Command-First Scaffold

At handoff time, generate a fresh read-only repository snapshot and scaffold:

```bash
agent-directives agent-state handoff --format text > .agents/handoff.md
```

Use `--format json` when another tool will compose the capsule. The report
collects branch, upstream, ahead/behind, staged/unstaged/untracked paths,
diffstat, recent commits, stash, and bounded diagnostics in stable order.

The scaffold intentionally contains unresolved judgment prompts. Fill them with
current intent, decisions, evidence, risks, rejected context, and the exact next
directive input. Then validate:

```bash
agent-directives agent-state handoff validate .agents/handoff.md --format json
```

Exit `1` means required sections or placeholders remain. Do not call the capsule
complete until validation passes and the facts still match the live repository.

### Compact Fallback

If the CLI is unavailable, run
`.agents/directives/scripts/handoff-state.sh` when installed. Otherwise collect
`git status --short`, branch/upstream, recent commits, diffstat, and stash
directly. Never reuse a cached snapshot; repository facts go stale silently.

## Judgment the Command Cannot Supply

Complete these sections concisely:

- **Intent:** the user's current outcome in one to three sentences.
- **Current state:** implementation/review status and relevant branch/PR.
- **Decisions:** only choices that still constrain later work.
- **Evidence:** command/check plus result and why it matters.
- **Files/surfaces:** changed or important paths and their roles.
- **Risks/unknowns:** missing proof, uncertainty, or required authority.
- **Rejected context:** obsolete plans, old failures, and approaches not to reopen.
- **Next input:** exact next action, directive, and evidence it needs.

Do not prefill intent or judgment from repository heuristics.

## Storage and Update Semantics

Use the first available location:

1. `.agents/handoff.md` for local file access;
2. the user response when file storage is unavailable;
3. one PR body/comment for reviewer handoff.

Rewrite the active capsule rather than appending indefinitely. If history is
required, keep `.agents/handoff-log.md` as non-authoritative history. Do not
commit session-state files unless the user requests it or project policy says so.

Before resuming, inspect the configured agent-state directory for existing
handoff, verification, blocked-choice, risky-choice, or cleanup artifacts.

## Phase and Review Handoffs

Before a major phase switch:

1. regenerate facts;
2. retire stale plans and evidence;
3. name the next phase/directive;
4. provide the precise input it requires;
5. validate the capsule.

For PR/review handoffs, include route, changed surfaces, verification evidence,
known risks/skips, and requested review focus. Do not post one comment per phase.

## Cleanup Review

At final handoff or after merge, identify—but do not automatically delete—safe
temporary-file removals, duplicated docs, dead config paths, and repeated agent
instructions. Separate safe cleanup from risky candidates requiring a decision.
In autonomous work, store suggestions in `.agents/cleanup-suggestions.md`; do not
perform unrequested pruning.

## Forbidden Patterns

| Pattern | Why forbidden |
| --- | --- |
| Treating the generated scaffold as complete | Intent and risk fields are deliberate placeholders |
| Reusing an old state report | Repository facts may be stale |
| Appending forever to the active capsule | Reintroduces context drift |
| Carrying assumptions absent from the capsule | Defeats compaction |
| Treating a handoff as verification proof | It summarizes, not replaces, evidence |
| Committing session state by default | Pollutes project history |
| Hiding unresolved risk to make validation pass | Misleads the next phase |

The command replaces git-state collection and placeholder detection. This
directive still owns selection, compaction, judgment, storage, and handoff truth.
