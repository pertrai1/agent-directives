#!/usr/bin/env bash
#
# gates.sh — detect and run this project's quality gates, failures-only.
#
# Referenced by: verification.md, test-driven-development.md,
#                type-driven-development.md (the "run the project's quality-gate
#                command suite" step). Replaces re-deriving the commands and
#                pasting full logs with one capped, deterministic report.
#
# Why a script: the gate commands are re-discovered every session and the raw
# output is unbounded. This detects the stack once, runs each gate, collapses a
# passing gate to a single line, and caps a failing gate to its last N lines
# (where the actual error usually is) so a 3000-line suite can't flood context.
#
# Usage:
#   bash gates.sh [gate ...]     # gate in: lint typecheck test build (default: all detected)
#   MAX_LINES=200 bash gates.sh  # override the per-failure line cap (default 150)
#
# Exit code: 0 if every run gate passed, 1 if any failed (usable in CI/hooks).
set -uo pipefail

MAX_LINES="${MAX_LINES:-150}"
WANT=("$@")               # optional subset of gates to run
FAILED=0
RAN=0

# want <gate> → true if the user requested this gate (or requested nothing).
want() {
  [ "${#WANT[@]}" -eq 0 ] && return 0
  local g
  for g in "${WANT[@]}"; do [ "$g" = "$1" ] && return 0; done
  return 1
}

# run_check <label> <cmd...> → PASS collapses to one line; FAIL shows tail.
run_check() {
  local label="$1"; shift
  RAN=$((RAN + 1))
  printf '## %s\n```text\n' "$label"
  local output status
  output="$("$@" 2>&1)"; status=$?
  if [ "$status" -eq 0 ]; then
    echo "STATUS: PASS  ($*)"
  else
    echo "$ ${*}"
    echo "$output" | tail -n "$MAX_LINES"
    echo "STATUS: FAIL (exit $status)"
    FAILED=1
  fi
  printf '```\n\n'
}

# npm_script <name> → true if package.json defines that script.
npm_script() {
  node -e 'process.exit((require("./package.json").scripts||{})["'"$1"'"]?0:1)' 2>/dev/null
}

echo "# Quality Gates"
echo

if [ -f package.json ] && command -v npm >/dev/null 2>&1; then
  # Map conventional gate names to whatever the project actually defines.
  want lint     && { npm_script lint     && run_check "lint"     npm run lint --silent; }
  want typecheck && {
    if   npm_script typecheck  ; then run_check "typecheck" npm run typecheck --silent
    elif npm_script type-check ; then run_check "typecheck" npm run type-check --silent
    fi
  }
  want test  && { npm_script test  && run_check "test"  npm test --silent; }
  want build && { npm_script build && run_check "build" npm run build --silent; }
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  want lint      && command -v ruff   >/dev/null 2>&1 && run_check "ruff"  ruff check .
  want typecheck && command -v mypy   >/dev/null 2>&1 && run_check "mypy"  mypy .
  want test      && command -v pytest >/dev/null 2>&1 && run_check "pytest" pytest -q
fi

if [ -f go.mod ] && command -v go >/dev/null 2>&1; then
  want lint  && run_check "go vet"   go vet ./...
  want build && run_check "go build" go build ./...
  want test  && run_check "go test"  go test ./...
fi

if [ -f Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
  want lint  && run_check "clippy" cargo clippy -- -D warnings
  want test  && run_check "cargo test" cargo test
  want build && run_check "cargo build" cargo build
fi

if [ "$RAN" -eq 0 ]; then
  echo "No gates detected (no recognized package.json/pyproject/go.mod/Cargo.toml gate)."
  echo "Run your project's test/lint/build commands directly."
  exit 0
fi

echo "SUMMARY: $RAN gate(s) run, $([ "$FAILED" -eq 0 ] && echo 'all passed' || echo 'FAILURES above')."
exit "$FAILED"
