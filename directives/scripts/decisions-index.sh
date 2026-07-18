#!/usr/bin/env bash
#
# decisions-index.sh — compact index of decision-log frontmatter.
#
# Referenced by: session-decisions.md, task-framing.md, codebase-navigation.md,
#                adaptive-routing.md, self-audit (the "scan frontmatter to find
#                relevant decisions without reading everything" step).
#
# Why a script: those directives promise agents can locate relevant decisions by
# scanning frontmatter, but doing it inline means reading N files. This emits one
# capped table (date | kind | scope | status | domain | triggers) so the agent
# reads the full record only for the row it needs.
#
# Usage:
#   bash decisions-index.sh [dir]     # default dir: docs/decisions
#   bash decisions-index.sh --active  # only status: active
set -uo pipefail

DIR="docs/decisions"
ACTIVE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --active) ACTIVE_ONLY=1 ;;
    *) DIR="$arg" ;;
  esac
done

if [ ! -d "$DIR" ]; then
  echo "No decision log directory at '$DIR'."
  echo "Create decision records under docs/decisions/YYYY-MM-DD-<topic>.md to build an index."
  exit 0
fi

# Parse the YAML frontmatter block (between the first two --- lines) of each file
# and print one tab-separated row. Newest first (filenames are date-prefixed).
{
  printf 'DATE\tKIND\tSCOPE\tSTATUS\tDOMAIN\tFILE\tTRIGGERS\n'
  find "$DIR" -maxdepth 1 -type f -name '*.md' | sort -r | while IFS= read -r file; do
    awk -v fname="$file" -v active_only="$ACTIVE_ONLY" '
      BEGIN { infm=0; seen=0; date=""; kind=""; scope=""; status=""; domain=""; intrig=0; trig="" }
      NR==1 && $0=="---" { infm=1; seen=1; next }
      infm && $0=="---" { infm=0 }
      infm {
        if ($0 ~ /^triggers:/) { intrig=1; next }
        if (intrig) {
          if ($0 ~ /^[[:space:]]*-[[:space:]]*/) {
            v=$0; sub(/^[[:space:]]*-[[:space:]]*/,"",v)
            trig = (trig=="" ? v : trig "; " v)
            next
          } else if ($0 ~ /^[^[:space:]]/) { intrig=0 }
        }
        if ($0 ~ /^date:/)   { v=$0; sub(/^date:[[:space:]]*/,"",v);   date=v }
        if ($0 ~ /^kind:/)   { v=$0; sub(/^kind:[[:space:]]*/,"",v);   kind=v }
        if ($0 ~ /^scope:/)  { v=$0; sub(/^scope:[[:space:]]*/,"",v);  scope=v }
        if ($0 ~ /^status:/) { v=$0; sub(/^status:[[:space:]]*/,"",v); status=v }
        if ($0 ~ /^domain:/) { v=$0; sub(/^domain:[[:space:]]*/,"",v); domain=v }
      }
      END {
        if (!seen) next_ok=0
        if (active_only=="1" && status!="active") exit 0
        base=fname; sub(/.*\//,"",base)
        if (length(trig) > 80) trig=substr(trig,1,77) "..."
        printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
          (date=="" ? "?" : date), (kind=="" ? "?" : kind), (scope=="" ? "?" : scope),
          (status=="" ? "?" : status), (domain=="" ? "?" : domain), base, trig
      }
    ' "$file"
  done
} | column -t -s "$(printf '\t')" 2>/dev/null || cat
