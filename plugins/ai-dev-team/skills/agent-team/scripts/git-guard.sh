#!/bin/sh
# Blocks git commit and push while an agent-team run is active, that is while
# .agent-team/RUNNING exists. Git itself refuses, so it works with any AI tool.
#
#   sh git-guard.sh install     add the guard to this repository's hooks
#   sh git-guard.sh uninstall   remove it again
#   sh git-guard.sh status      show whether it is installed

START='# >>> agent-team guard'
END='# <<< agent-team guard'
HOOKS='pre-commit pre-push'

guard_block() {
  cat <<'EOF'
# >>> agent-team guard
if [ -f "$(git rev-parse --show-toplevel)/.agent-team/RUNNING" ]; then
  echo "agent-team: a run is active, so commits and pushes are blocked." >&2
  echo "Commit when it finishes. If no run is active, delete .agent-team/RUNNING." >&2
  exit 1
fi
# <<< agent-team guard
EOF
}

die() {
  echo "git-guard: $*" >&2
  exit 1
}

git rev-parse --show-toplevel >/dev/null 2>&1 || die "not inside a git repository"

if [ -n "$(git config --get core.hooksPath)" ]; then
  echo "git-guard: this repository keeps its hooks in $(git config --get core.hooksPath) (for example husky)," >&2
  echo "so add these lines near the top of its pre-commit and pre-push hooks yourself:" >&2
  echo >&2
  guard_block >&2
  exit 2
fi

dir=$(git rev-parse --git-path hooks)
mkdir -p "$dir"

is_shell_hook() {
  head -n 1 "$1" | grep -Eq '^#!.*(/|env )(sh|bash|zsh|dash|ksh)([[:space:]]|$)'
}

install_hook() {
  file="$dir/$1"
  if [ -f "$file" ] && grep -qF "$START" "$file"; then
    echo "$1: already installed"
    return
  fi
  if [ ! -f "$file" ]; then
    { echo '#!/bin/sh'; guard_block; } > "$file"
  elif is_shell_hook "$file"; then
    tmp="$file.agent-team.tmp"
    { head -n 1 "$file"; guard_block; tail -n +2 "$file"; } > "$tmp" && cat "$tmp" > "$file" && rm -f "$tmp"
  else
    echo "$1: left alone; it isn't a shell script. Add the guard yourself:" >&2
    guard_block >&2
    return
  fi
  chmod +x "$file"
  echo "$1: installed"
}

uninstall_hook() {
  file="$dir/$1"
  if [ ! -f "$file" ] || ! grep -qF "$START" "$file"; then
    echo "$1: not installed"
    return
  fi
  tmp="$file.agent-team.tmp"
  awk -v s="$START" -v e="$END" '$0 == s { skip = 1; next } $0 == e { skip = 0; next } !skip' "$file" > "$tmp"
  if [ "$(grep -cv '^[[:space:]]*$' "$tmp")" -le 1 ] && head -n 1 "$tmp" | grep -q '^#!'; then
    rm -f "$file" "$tmp"
  else
    cat "$tmp" > "$file" && rm -f "$tmp"
  fi
  echo "$1: removed"
}

case "$1" in
  install)
    for hook in $HOOKS; do install_hook "$hook"; done
    ;;
  uninstall)
    for hook in $HOOKS; do uninstall_hook "$hook"; done
    ;;
  status)
    for hook in $HOOKS; do
      if [ -f "$dir/$hook" ] && grep -qF "$START" "$dir/$hook"; then
        echo "$hook: installed"
      else
        echo "$hook: not installed"
      fi
    done
    ;;
  *)
    echo "usage: sh git-guard.sh install | uninstall | status" >&2
    exit 64
    ;;
esac
