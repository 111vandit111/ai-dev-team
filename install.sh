#!/usr/bin/env bash
# Installs the ai-dev-team skills (agent-team, research and recruiter) for your AI coding tools.
#
#   ./install.sh               ~/.agents/skills: read by Codex, Gemini CLI, Cursor,
#                              OpenCode, GitHub Copilot and other Agent Skills tools
#   ./install.sh --project     ./.agents/skills in the current project instead
#   ./install.sh --dir PATH    any other skills folder (e.g. ~/.kiro/skills)
#   ./install.sh --claude      also install the three Claude Code plugins (needs the claude CLI)
#   ./install.sh --link        symlink instead of copying (for development)
#   ./install.sh --uninstall   remove them (use the same location flags)
#
# From anywhere, without cloning:
#   curl -fsSL https://raw.githubusercontent.com/111vandit111/ai-dev-team/main/install.sh | bash

set -euo pipefail

REPO_URL="https://github.com/111vandit111/ai-dev-team"
# Each skill is self-contained; all three are still installed together.
SKILLS="agent-team research recruiter"

# plugin_of <skill>: the plugin folder that holds the skill
plugin_of() {
  case "$1" in
    agent-team) echo ai-dev-team ;;
    research) echo research-team ;;
    recruiter) echo recruiter-panel ;;
    *) echo "install.sh: unknown skill $1" >&2; exit 1 ;;
  esac
}

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
    for skill in $SKILLS; do
      claude plugin uninstall "$(plugin_of "$skill")@ai-dev-team" || true
    done
  fi
  exit "$rc"
fi

# Use the copy next to this script when there is one; otherwise fetch the repository.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$script_dir" ] && [ -f "$script_dir/plugins/ai-dev-team/skills/agent-team/SKILL.md" ]; then
  src_root="$script_dir"
else
  home="${AI_DEV_TEAM_HOME:-$HOME/.ai-dev-team}"
  command -v git >/dev/null 2>&1 || { echo "install.sh: git is required" >&2; exit 1; }
  if [ -d "$home/.git" ]; then
    git -C "$home" pull --ff-only --quiet
  else
    git clone --depth 1 --quiet "$REPO_URL" "$home"
  fi
  src_root="$home"
fi

# Check everything first so we never leave a half install.
for skill in $SKILLS; do
  dest="$target/$skill"
  src="$src_root/plugins/$(plugin_of "$skill")/skills/$skill"
  [ -f "$src/SKILL.md" ] || { echo "install.sh: $src/SKILL.md not found" >&2; exit 1; }
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    is_ours "$dest" "$skill" || { echo "install.sh: $dest exists and isn't $skill; left alone" >&2; exit 1; }
  fi
done

mkdir -p "$target"
for skill in $SKILLS; do
  src="$src_root/plugins/$(plugin_of "$skill")/skills/$skill"
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
  for skill in $SKILLS; do
    claude plugin install "$(plugin_of "$skill")@ai-dev-team"
  done
elif command -v claude >/dev/null 2>&1; then
  echo "Claude Code found: add --claude to also install the plugins (effort-level workers, live office pane, git-write block)."
fi

command -v graphify >/dev/null 2>&1 || echo "Next: install graphify (pip install graphifyy); the team needs a knowledge graph of your project."
echo "Restart your AI tool, then ask it to build something. The skill starts on its own."
