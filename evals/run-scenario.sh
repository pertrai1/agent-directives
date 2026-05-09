#!/usr/bin/env bash
# Set up an isolated workspace for an eval scenario.
#
# Usage: evals/run-scenario.sh [--print-only] <scenario-name>
#   e.g. evals/run-scenario.sh anti-righting-reflex
#   e.g. evals/run-scenario.sh --print-only root-agents-routing-presentation
#
# The TypeScript runner creates a workspace, assembles referenced instructions
# into CLAUDE.md, writes a run manifest under evals/results/runs/, prints the
# scenario prompt, and launches `claude` unless --print-only is used.

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -x "$REPO_ROOT/node_modules/.bin/tsx" ]]; then
  exec "$REPO_ROOT/node_modules/.bin/tsx" scripts/eval-scenario.ts "$@"
fi

exec npx --yes tsx scripts/eval-scenario.ts "$@"
