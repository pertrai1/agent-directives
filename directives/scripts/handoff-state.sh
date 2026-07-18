#!/usr/bin/env bash
#
# handoff-state.sh — one-shot, read-only snapshot of working state.
#
# Referenced by: context-handoff.md (and the compaction step in
#                codebase-navigation.md / session-decisions.md).
#
# Why a script: a handoff/compaction currently costs several separate git
# round-trips (status, branch, log, diff --stat, stash). This collapses them
# into one capped call. Read-only — it never mutates the repo.
#
# Invoke on demand at handoff time. Do NOT cache the output to a file and reuse
# it later: a stale snapshot is worse than none.
#
# Usage:
#   bash handoff-state.sh
set -uo pipefail

MAX_COMMITS="${MAX_COMMITS:-10}"
MAX_STAT="${MAX_STAT:-40}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git work tree."
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo '(no upstream)')"

echo "# Working State Snapshot"
echo
echo "Branch:   $branch"
echo "Upstream: $upstream"
if [ "$upstream" != "(no upstream)" ]; then
  counts="$(git rev-list --left-right --count "${upstream}...HEAD" 2>/dev/null || echo '? ?')"
  echo "Ahead/behind (behind<-->ahead vs upstream): $counts"
fi
echo

echo "## Staged"
git diff --cached --name-status | head -n "$MAX_STAT"
git diff --cached --name-status | tail -n +$((MAX_STAT + 1)) | grep -q . && echo "... (more staged files omitted) ..."
echo

echo "## Unstaged (tracked)"
git diff --name-status | head -n "$MAX_STAT"
git diff --name-status | tail -n +$((MAX_STAT + 1)) | grep -q . && echo "... (more unstaged files omitted) ..."
echo

echo "## Untracked"
untracked="$(git ls-files --others --exclude-standard)"
if [ -n "$untracked" ]; then
  echo "$untracked" | head -n "$MAX_STAT"
  n="$(echo "$untracked" | wc -l | tr -d ' ')"
  [ "$n" -gt "$MAX_STAT" ] && echo "... ($((n - MAX_STAT)) more untracked files) ..."
else
  echo "(none)"
fi
echo

echo "## Diffstat (uncommitted)"
git diff --stat | head -n "$MAX_STAT"
echo

echo "## Recent commits (last $MAX_COMMITS)"
git log --oneline -n "$MAX_COMMITS" 2>/dev/null
echo

echo "## Stash"
stash="$(git stash list 2>/dev/null)"
[ -n "$stash" ] && echo "$stash" | head -n 10 || echo "(empty)"
