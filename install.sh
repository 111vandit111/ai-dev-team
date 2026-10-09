#!/usr/bin/env bash
# Installs the ai-dev-team skills (agent-team and research) for your AI coding tools.
#
#   ./install.sh               ~/.agents/skills: read by Codex, Gemini CLI, Cursor,
#                              OpenCode, GitHub Copilot and other Agent Skills tools
#   ./install.sh --project     ./.agents/skills in the current project instead
#   ./install.sh --dir PATH    any other skills folder (e.g. ~/.kiro/skills)
#   ./install.sh --claude      also install the Claude Code plugin (needs the claude CLI)
#   ./install.sh --link        symlink instead of copying (for development)
#   ./install.sh --uninstall   remove them (use the same location flags)
#
# From anywhere, without cloning:
#   curl -fsSL https://raw.githubusercontent.com/111vandit111/ai-dev-team/main/install.sh | bash

set -euo pipefail

REPO_URL="https://github.com/111vandit111/ai-dev-team"
# The research skill points at ../agent-team, so both are always installed together.
SKILLS="agent-team research"
SKILLS_PATH="plugins/ai-dev-team/skills"

target="$HOME/.agents/skills"
link=0
uninstall=0
claude=0

while [ $# -gt 0 ]; do
  case "$1" in
    --project) target="$PWD/.agents/skills" ;;
    --dir) shift; target="${1:?--dir needs a path}" ;;
    --link) link=1 ;;
    --claude) claude=1 ;;
    --uninstall) uninstall=1 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "install.sh: unknown option $1 (try --help)" >&2; exit 64 ;;
  esac
  shift
done

# is_ours <dir> <skill name>
is_ours() {
  [ -L "$1" ] || grep -qs "^name: $2\$" "$1/SKILL.md"
}

if [ "$uninstall" = 1 ]; then
  rc=0
  for skill in $SKILLS; do
    dest="$target/$skill"
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      is_ours "$dest" "$skill" || { echo "install.sh: $dest isn't $skill; left alone" >&2; rc=1; continue; }
      rm -rf "$dest"
      echo "Removed $dest"
    else
      echo "Nothing installed at $dest"
    fi
  done
  if [ "$claude" = 1 ] && command -v claude >/dev/null 2>&1; then
    claude plugin uninstall ai-dev-team@ai-dev-team || true
  fi
  exit "$rc"
fi

# Use the copy next to this script when there is one; otherwise fetch the repository.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$script_dir" ] && [ -f "$script_dir/$SKILLS_PATH/agent-team/SKILL.md" ]; then
  src_root="$script_dir/$SKILLS_PATH"
else
  home="${AI_DEV_TEAM_HOME:-$HOME/.ai-dev-team}"
  command -v git >/dev/null 2>&1 || { echo "install.sh: git is required" >&2; exit 1; }
  if [ -d "$home/.git" ]; then
    git -C "$home" pull --ff-only --quiet
  else
    git clone --depth 1 --quiet "$REPO_URL" "$home"
  fi
  src_root="$home/$SKILLS_PATH"
fi

# Check everything first so we never leave a half install.
for skill in $SKILLS; do
  dest="$target/$skill"
  [ -f "$src_root/$skill/SKILL.md" ] || { echo "install.sh: $src_root/$skill/SKILL.md not found" >&2; exit 1; }
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    is_ours "$dest" "$skill" || { echo "install.sh: $dest exists and isn't $skill; left alone" >&2; exit 1; }
  fi
done

mkdir -p "$target"
for skill in $SKILLS; do
  src="$src_root/$skill"
  dest="$target/$skill"
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    rm -rf "$dest"
  fi
  if [ "$link" = 1 ]; then
    ln -s "$src" "$dest"
    echo "Linked $dest -> $src"
  else
    cp -R "$src" "$dest"
    echo "Installed $dest"
  fi
done

if [ "$target" = "$HOME/.agents/skills" ]; then
  echo "Codex, Gemini CLI, Cursor, OpenCode and GitHub Copilot will find them there."
fi

for skill in $SKILLS; do
  if [ -e "$HOME/.claude/skills/$skill" ] && [ "$target" != "$HOME/.claude/skills" ]; then
    echo "Note: ~/.claude/skills/$skill also exists. Cursor, OpenCode and Copilot read both folders and will list the skill twice; remove one copy." >&2
  fi
done

if [ "$claude" = 1 ]; then
  command -v claude >/dev/null 2>&1 || { echo "install.sh: the claude CLI isn't installed" >&2; exit 1; }
  claude plugin marketplace add 111vandit111/ai-dev-team
  claude plugin install ai-dev-team@ai-dev-team
elif command -v claude >/dev/null 2>&1; then
  echo "Claude Code found: add --claude to also install the plugin (effort-level workers, live office pane, git-write block)."
fi

command -v graphify >/dev/null 2>&1 || echo "Next: install graphify (pip install graphifyy); the team needs a knowledge graph of your project."
echo "Restart your AI tool, then ask it to build something. The skill starts on its own."
