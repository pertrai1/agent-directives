#!/usr/bin/env bash
# Set up an isolated workspace for an eval scenario.
#
# Usage: evals/run-scenario.sh [--print-only] <scenario-name>
#   e.g. evals/run-scenario.sh anti-righting-reflex
#   e.g. evals/run-scenario.sh --print-only root-agents-routing-presentation
#
# Creates a temp dir, concatenates every file referenced in the scenario's
# Setup section into ./CLAUDE.md, prints the scenario's Prompt, and launches
# `claude` in that dir unless --print-only is used. The temp dir is removed when
# the script exits.

set -euo pipefail

PRINT_ONLY=0
if [[ "${1:-}" == "--print-only" ]]; then
  PRINT_ONLY=1
  shift
fi

if [[ $# -ne 1 ]]; then
  echo "usage: $0 [--print-only] <scenario-name>" >&2
  exit 2
fi

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SCENARIO_FILE="$REPO_ROOT/evals/scenarios/$1.md"

if [[ ! -f "$SCENARIO_FILE" ]]; then
  echo "scenario not found: $SCENARIO_FILE" >&2
  echo "available:" >&2
  ls "$REPO_ROOT/evals/scenarios/" | sed 's/\.md$//' | sed 's/^/  /' >&2
  exit 1
fi

# Pull every `AGENTS.md`, `directives/*.md`, or `skills/*/SKILL.md` path out of the
# Setup section only. References in checklists describe expected behavior; they
# should not become preloaded context for the agent under test.
REFS=()
while IFS= read -r line; do
  REFS+=("$line")
done < <(awk '/^## Setup/{flag=1; next} /^## /{flag=0} flag' "$SCENARIO_FILE" | grep -oE '(AGENTS\.md|directives/[a-zA-Z0-9_-]+\.md|skills/[a-zA-Z0-9_-]+/SKILL\.md)' | awk '!seen[$0]++' || true)

if [[ ${#REFS[@]} -eq 0 ]]; then
  echo "no directive/skill references found in $SCENARIO_FILE" >&2
  exit 1
fi

WORKDIR="$(mktemp -d -t "eval-$1-XXXX")"
trap 'rm -rf "$WORKDIR"' EXIT

CLAUDE_MD="$WORKDIR/CLAUDE.md"
: > "$CLAUDE_MD"
for ref in "${REFS[@]}"; do
  src="$REPO_ROOT/$ref"
  if [[ ! -f "$src" ]]; then
    echo "referenced file missing: $src" >&2
    exit 1
  fi
  printf '<!-- loaded from %s -->\n\n' "$ref" >> "$CLAUDE_MD"
  cat "$src" >> "$CLAUDE_MD"
  printf '\n\n' >> "$CLAUDE_MD"
done

echo "Workspace: $WORKDIR"
echo "Loaded into CLAUDE.md:"
printf '  - %s\n' "${REFS[@]}"
echo
echo "----- scenario prompt ($1) -----"
awk '/^## Prompt/{flag=1; next} /^## /{flag=0} flag' "$SCENARIO_FILE"
echo "----- end prompt -----"
echo

if [[ "$PRINT_ONLY" -eq 1 ]]; then
  echo "--print-only set; not launching claude."
  echo
  echo "----- CLAUDE.md preview -----"
  cat "$CLAUDE_MD"
  echo "----- end CLAUDE.md preview -----"
  exit 0
fi

echo "Launching claude in $WORKDIR. Workspace will be deleted on exit."
echo "Tip: your global ~/.claude/CLAUDE.md is still loaded — move it aside if it conflicts."
echo

cd "$WORKDIR"
claude
