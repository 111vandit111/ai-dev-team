#!/usr/bin/env bash
# Builds the downloadable recruiter packs into dist/ (git-ignored):
#   dist/recruiter-skill.zip    the skill folder (recruiter/) for chat apps that upload skills
#   dist/recruiter-gpt-gem.zip  instructions.md + 7 knowledge files for a Custom GPT or Gem
#
#   ./scripts/package-recruiter.sh

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

SKILL_DIR="$ROOT/plugins/ai-dev-team/skills/recruiter"
PACK_DIR="$ROOT/packaging/recruiter-gpt-gem"
DIST="$ROOT/dist"
SKILL_ZIP="$DIST/recruiter-skill.zip"
GEM_ZIP="$DIST/recruiter-gpt-gem.zip"

MAX_DESCRIPTION=1024
MAX_INSTRUCTIONS=8000

# knowledge file -> path inside the skill folder
KNOWLEDGE="references/panel.md references/scoring.md references/report.md references/rebuild.md roles/recruiter.md roles/interviewer.md scripts/score.py"

fail() { echo "package-recruiter.sh: $*" >&2; exit 1; }

# count_chars <file>: characters, not bytes
count_chars() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import sys; print(len(open(sys.argv[1], encoding="utf-8").read()))' "$1"
  else
    LC_ALL="${LC_ALL:-en_US.UTF-8}" wc -m < "$1" | tr -d ' '
  fi
}

# make_zip <output zip> <folder to run in> <entries...>
make_zip() {
  local out="$1" dir="$2"
  shift 2
  if command -v zip >/dev/null 2>&1; then
    (cd "$dir" && zip -qr "$out" "$@")
  elif command -v python3 >/dev/null 2>&1; then
    (cd "$dir" && python3 -m zipfile -c "$out" "$@")
  else
    fail "need either zip or python3 to build the archives"
  fi
}

# --- validate ---
[ -f "$SKILL_DIR/SKILL.md" ] || fail "missing $SKILL_DIR/SKILL.md"
[ "$(awk '/^---[[:space:]]*$/ {n++; next} n==1 && /^name:/ {sub(/^name:[[:space:]]*/, ""); print; exit}' "$SKILL_DIR/SKILL.md" | tr -d '"'"'"'[:space:]')" = "recruiter" ] \
  || fail "SKILL.md frontmatter must contain 'name: recruiter'"

description="$(awk '/^---[[:space:]]*$/ {n++; next} n==1 && /^description:/ {sub(/^description:[[:space:]]*/, ""); print; exit}' "$SKILL_DIR/SKILL.md")"
[ -n "$description" ] || fail "SKILL.md frontmatter has no one-line description"
desc_file="$(mktemp)"
printf '%s' "$description" > "$desc_file"
desc_len="$(count_chars "$desc_file")"
rm -f "$desc_file"
[ "$desc_len" -le "$MAX_DESCRIPTION" ] \
  || fail "SKILL.md description is $desc_len characters; the limit is $MAX_DESCRIPTION"

[ -f "$PACK_DIR/instructions.md" ] || fail "missing $PACK_DIR/instructions.md"
instr_len="$(count_chars "$PACK_DIR/instructions.md")"
[ "$instr_len" -le "$MAX_INSTRUCTIONS" ] \
  || fail "instructions.md is $instr_len characters; the GPT limit is $MAX_INSTRUCTIONS"

for f in $KNOWLEDGE; do
  [ -f "$SKILL_DIR/$f" ] || fail "missing source file $SKILL_DIR/$f"
done
for d in roles references scripts; do
  [ -d "$SKILL_DIR/$d" ] || fail "missing folder $SKILL_DIR/$d"
done

# --- stage ---
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/skill/recruiter" "$stage/gem"
cp "$SKILL_DIR/SKILL.md" "$stage/skill/recruiter/SKILL.md"
for d in roles references scripts; do
  mkdir -p "$stage/skill/recruiter/$d"
  find "$SKILL_DIR/$d" -type f ! -name '*.pyc' ! -name '.DS_Store' ! -path '*/__pycache__/*' -print0 |
    while IFS= read -r -d '' src; do
      rel="${src#"$SKILL_DIR"/}"
      mkdir -p "$stage/skill/recruiter/$(dirname "$rel")"
      cp "$src" "$stage/skill/recruiter/$rel"
    done
done

cp "$PACK_DIR/instructions.md" "$stage/gem/instructions.md"
for f in $KNOWLEDGE; do
  cp "$SKILL_DIR/$f" "$stage/gem/${f##*/}"
done

# --- build ---
mkdir -p "$DIST"
rm -f "$SKILL_ZIP" "$GEM_ZIP"
make_zip "$SKILL_ZIP" "$stage/skill" recruiter
gem_files=(instructions.md)
for f in $KNOWLEDGE; do gem_files+=("${f##*/}"); done
make_zip "$GEM_ZIP" "$stage/gem" "${gem_files[@]}"

# --- report ---
for z in "$SKILL_ZIP" "$GEM_ZIP"; do
  size="$(wc -c < "$z" | tr -d ' ')"
  echo "$z ($size bytes)"
done
