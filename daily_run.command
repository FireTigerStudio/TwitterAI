#!/bin/bash
# TwitterAI Daily Run — double-click to execute

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load environment (.env for API keys, .zshrc for proxy)
source ~/.zshrc 2>/dev/null
set -a; source "$PROJECT_DIR/.env"; set +a

PYTHON="$PROJECT_DIR/.venv/bin/python"

echo "==============================="
echo "  TwitterAI Daily Run"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "==============================="
echo ""

# Step 1: Sync accounts from Twitter following list
echo "[1/3] Syncing accounts..."
$PYTHON scripts/sync_accounts.py
echo ""

# Step 2: Run full pipeline (scrape → AI summary → Excel)
echo "[2/3] Running pipeline..."
$PYTHON scripts/main.py
echo ""

# Step 3: Commit & push
echo "[3/3] Pushing to GitHub..."
git add data/ output/ accounts.json
if git diff --staged --quiet; then
    echo "No new data to commit."
else
    git commit -m "Daily scrape: $(date '+%Y-%m-%d %H:%M') local"
    git pull --rebase || true
    git push
    echo "Pushed to GitHub!"
fi

echo ""
echo "==============================="
echo "  Done! You can close this window."
echo "==============================="
read -n 1 -s -r -p "Press any key to close..."
