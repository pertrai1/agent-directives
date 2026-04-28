#!/usr/bin/env bash
# Set up an isolated workspace for an eval scenario.
#
# Usage: evals/run-scenario.sh <scenario-name>
#   e.g. evals/run-scenario.sh anti-righting-reflex
#
# Creates a temp dir, concatenates every file referenced in the scenario's
# Setup section into ./CLAUDE.md, prints the scenario's Prompt, and launches
# `claude` in that dir. The temp dir is removed when claude exits.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <scenario-name>" >&2
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

# Pull every `directives/*.md` or `skills/*/SKILL.md` path out of the file.
# Use a read loop instead of mapfile for bash 3.2 compatibility (macOS).
REFS=()
while IFS= read -r line; do
  REFS+=("$line")
done < <(grep -oE '(directives/[a-zA-Z0-9_-]+\.md|skills/[a-zA-Z0-9_-]+/SKILL\.md)' "$SCENARIO_FILE" | awk '!seen[$0]++')

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
echo "Launching claude in $WORKDIR. Workspace will be deleted on exit."
echo "Tip: your global ~/.claude/CLAUDE.md is still loaded — move it aside if it conflicts."
echo

cd "$WORKDIR"
claude
