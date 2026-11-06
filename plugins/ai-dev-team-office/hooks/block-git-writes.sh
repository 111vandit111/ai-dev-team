#!/bin/sh
# Blocks git commands that change history while an agent-team run is active.
# A run is active while .agent-team/RUNNING exists in the project; otherwise this does nothing.
dir="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "$dir/.agent-team/RUNNING" ] || exit 0
input=$(cat)
if printf '%s' "$input" | grep -Eq '(^|[^[:alnum:]_-])git +((-C|-c) +[^ ]+ +|--?[a-z-]+(=[^ ]+)? +)*(commit|push|add|reset|rebase|stash|checkout|switch|restore|merge|cherry-pick|tag)([^[:alnum:]_-]|$)'; then
  echo "Blocked by ai-dev-team: git writes are not allowed during an agent-team run. Show the user the commit message instead; they commit themselves. (If no run is active, delete .agent-team/RUNNING.)" >&2
  exit 2
fi
exit 0
