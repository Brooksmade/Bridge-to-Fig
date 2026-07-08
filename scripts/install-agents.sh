#!/usr/bin/env bash
# install-agents.sh — sync this repo's agents, commands, prompts, and the fig CLI to ~/.claude
# so any project (and any subagent-capable LLM) can use Bridge to Fig globally.
#
# The REPO is the canonical source. Existing global copies are backed up to
# ~/.claude/backup-bridge-to-fig-<timestamp>/ before anything is changed.
#
# Usage: ./scripts/install-agents.sh [--dry-run]

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="${HOME}/.claude"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${CLAUDE_DIR}/backup-bridge-to-fig-${STAMP}"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

run() { if $DRY_RUN; then echo "[dry-run] $*"; else eval "$*"; fi; }

echo "Bridge to Fig — global install"
echo "  repo:   $REPO_DIR"
echo "  target: $CLAUDE_DIR"
$DRY_RUN && echo "  (dry run — nothing will change)"

# ---------------------------------------------------------------------------
# 1. Backup current global state (agents + commands + prompts)
# ---------------------------------------------------------------------------
run "mkdir -p '$BACKUP_DIR'"
for d in agents commands prompts/bridge-to-fig; do
  if [ -d "$CLAUDE_DIR/$d" ]; then
    run "mkdir -p '$BACKUP_DIR/$(dirname "$d")'"
    run "cp -R '$CLAUDE_DIR/$d' '$BACKUP_DIR/$d'"
  fi
done
echo "→ backup at $BACKUP_DIR"

# ---------------------------------------------------------------------------
# 2. Remove agents this repo has RETIRED (merged/archived) from ~/.claude/agents.
#    Only filenames listed in agents-archive/ are touched — other global agents are left alone.
# ---------------------------------------------------------------------------
if [ -d "$REPO_DIR/agents-archive" ]; then
  removed=0
  for f in "$REPO_DIR"/agents-archive/*.md; do
    base="$(basename "$f")"
    if [ -f "$CLAUDE_DIR/agents/$base" ]; then
      run "rm '$CLAUDE_DIR/agents/$base'"
      removed=$((removed + 1))
    fi
  done
  echo "→ removed $removed retired agent(s) from ~/.claude/agents"
fi

# ---------------------------------------------------------------------------
# 3. Install current agents, commands, prompts
# ---------------------------------------------------------------------------
run "mkdir -p '$CLAUDE_DIR/agents' '$CLAUDE_DIR/commands' '$CLAUDE_DIR/prompts/bridge-to-fig' '$CLAUDE_DIR/bin'"

run "cp '$REPO_DIR'/.claude/agents/*.md '$CLAUDE_DIR/agents/'"
echo "→ installed $(ls "$REPO_DIR"/.claude/agents/*.md | wc -l | tr -d ' ') agents"

if compgen -G "$REPO_DIR/.claude/commands/*.md" > /dev/null; then
  run "cp '$REPO_DIR'/.claude/commands/*.md '$CLAUDE_DIR/commands/'"
  echo "→ installed $(ls "$REPO_DIR"/.claude/commands/*.md | wc -l | tr -d ' ') commands"
fi

run "cp '$REPO_DIR'/prompts/*.md '$CLAUDE_DIR/prompts/bridge-to-fig/'"
if [ -f "$REPO_DIR/.claude/prompts/figma-layout.md" ]; then
  run "cp '$REPO_DIR/.claude/prompts/figma-layout.md' '$CLAUDE_DIR/prompts/bridge-to-fig/figma-layout.md'"
fi
echo "→ installed prompts (incl. task-recipes.md, quick-ref.md, figma-layout.md)"

# ---------------------------------------------------------------------------
# 4. Install the fig CLI globally
# ---------------------------------------------------------------------------
run "cp '$REPO_DIR/scripts/fig' '$CLAUDE_DIR/bin/fig'"
run "chmod +x '$CLAUDE_DIR/bin/fig'"
echo "→ installed fig CLI at ~/.claude/bin/fig"

echo ""
echo "Done. Global Bridge to Fig assets now mirror the repo."
echo "Rollback: cp -R $BACKUP_DIR/* $CLAUDE_DIR/"
