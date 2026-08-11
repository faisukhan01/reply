#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# ReplyAI — Push to GitHub helper
# ─────────────────────────────────────────────────────────────
# Usage:
#   bash push-to-github.sh <your-github-token>
#
# Or set GITHUB_TOKEN env var first:
#   export GITHUB_TOKEN=ghp_xxxxx
#   bash push-to-github.sh
#
# The token needs `repo` scope (or `contents:write` for fine-grained).
# Create one at: https://github.com/settings/tokens
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO="faisukhan01/reply"
BRANCH="main"

TOKEN="${1:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "Error: No GitHub token provided."
  echo ""
  echo "Usage:"
  echo "  bash push-to-github.sh <token>"
  echo "  GITHUB_TOKEN=<token> bash push-to-github.sh"
  echo ""
  echo "Create a token at: https://github.com/settings/tokens"
  exit 1
fi

echo "→ Configuring remote with token..."
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/${REPO}.git"

echo "→ Pushing to ${BRANCH}..."
if git push -u origin "$BRANCH" 2>&1; then
  echo ""
  echo "✓ Push successful!"
  echo "  View at: https://github.com/${REPO}"
  echo ""
  echo "→ Cleaning up token from remote URL..."
  git remote set-url origin "https://github.com/${REPO}.git"
  echo "✓ Done. Token has been removed from git config."
else
  echo ""
  echo "✗ Push failed. Check the error above."
  echo "  Common issues:"
  echo "  - Token doesn't have 'repo' scope"
  echo "  - Repository doesn't exist or you don't have write access"
  echo "  - Branch protection rules on main"
  echo ""
  echo "→ Cleaning up token from remote URL..."
  git remote set-url origin "https://github.com/${REPO}.git"
  exit 1
fi
