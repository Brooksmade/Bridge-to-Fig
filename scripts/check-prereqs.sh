#!/usr/bin/env bash
# Preflight check: verifies Node.js and pnpm are installed before pnpm runs.
# Runs as a `predev` hook from the root package.json, and can be run standalone.

set -e

MIN_NODE_MAJOR=18
RED=$'\033[0;31m'
YELLOW=$'\033[0;33m'
GREEN=$'\033[0;32m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

fail() {
  echo "${RED}${BOLD}error:${RESET} $1" >&2
}

hint() {
  echo "${YELLOW}hint:${RESET}  $1" >&2
}

ok() {
  echo "${GREEN}ok:${RESET}    $1"
}

missing=0

# ── Node.js ──────────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed (or not in PATH)."
  hint "Install from https://nodejs.org/ (LTS .pkg installer on macOS),"
  hint "or via Homebrew: brew install node"
  hint "If you just installed Homebrew, you may need to add it to your PATH:"
  hint "  echo 'eval \"\$(/opt/homebrew/bin/brew shellenv)\"' >> ~/.zprofile && exec zsh -l"
  missing=1
else
  node_version="$(node --version 2>/dev/null | sed 's/^v//')"
  node_major="${node_version%%.*}"
  if [ -z "$node_major" ] || [ "$node_major" -lt "$MIN_NODE_MAJOR" ] 2>/dev/null; then
    fail "Node.js v${node_version} is too old (need v${MIN_NODE_MAJOR}+)."
    hint "Upgrade from https://nodejs.org/ or 'brew upgrade node'."
    missing=1
  else
    ok "Node.js v${node_version}"
  fi
fi

# ── pnpm ─────────────────────────────────────────────────────────────────────
if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm is not installed (or not in PATH)."
  hint "Enable via Corepack (ships with Node 16.13+):"
  hint "  corepack enable && corepack prepare pnpm@latest --activate"
  hint "Or install directly: brew install pnpm"
  missing=1
else
  pnpm_version="$(pnpm --version 2>/dev/null)"
  ok "pnpm v${pnpm_version}"
fi

if [ "$missing" -eq 1 ]; then
  echo "" >&2
  fail "Bridge to Fig requires Node.js v${MIN_NODE_MAJOR}+ and pnpm. Install the missing tools above, then re-run."
  exit 1
fi

exit 0
