#!/usr/bin/env bash
# Copies the shared skill files from their source of truth (plugins/ai-dev-team/skills/agent-team/)
# into the research-team and recruiter-panel plugins.
#
#   ./scripts/sync-shared.sh           copy
#   ./scripts/sync-shared.sh --check   write nothing; list copies that differ or are missing (exit 1)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SRC="plugins/ai-dev-team/skills/agent-team"
RESEARCH="plugins/research-team/skills/research"
RECRUITER="plugins/recruiter-panel/skills/recruiter"

CHECK=0
case "${1:-}" in
  "") ;;
  --check) CHECK=1 ;;
  -h|--help) sed -n '2,6p' "${BASH_SOURCE[0]}"; exit 0 ;;
  *) echo "sync-shared.sh: unknown option: $1" >&2; exit 64 ;;
esac
[ "$#" -le 1 ] || { echo "sync-shared.sh: too many arguments" >&2; exit 64; }

# source<TAB>destination pairs
PAIRS=("$SRC/roles/researcher.md|$RESEARCH/roles/researcher.md")
for f in "$SRC"/references/platforms/*.md; do
  b="$(basename "$f")"
  PAIRS+=("$f|$RESEARCH/references/platforms/$b" "$f|$RECRUITER/references/platforms/$b")
done

bad=0
for pair in "${PAIRS[@]}"; do
  from="${pair%%|*}"
  to="${pair#*|}"
  if [ "$CHECK" -eq 1 ]; then
    if [ ! -f "$to" ]; then echo "missing: $to"; bad=1
    elif ! cmp -s "$from" "$to"; then echo "differs: $to"; bad=1
    fi
  else
    mkdir -p "$(dirname "$to")"
    cp "$from" "$to"
  fi
done
exit "$bad"
