#!/bin/bash
# ============================================
# TwitterAI - Local Daily Runner
# Runs the full pipeline and pushes to GitHub
# ============================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"
LOG_FILE="$PROJECT_DIR/scrape_$(date +%Y-%m-%d).log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ---- Load environment ----
if [ ! -f "$ENV_FILE" ]; then
    echo "No .env file found. Let's set it up."
    echo ""
    read -rp "Enter your GEMINI_API_KEY: " gemini_key
    echo "GEMINI_API_KEY=$gemini_key" > "$ENV_FILE"
    echo ".env file created at $ENV_FILE"
fi

set -a
source "$ENV_FILE"
set +a

# ---- Verify prerequisites ----
if [ ! -d "$VENV_DIR" ]; then
    log "ERROR: Virtual environment not found at $VENV_DIR"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/.twitter_cookies.json" ]; then
    log "ERROR: Cookie file not found at $PROJECT_DIR/.twitter_cookies.json"
    exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
    log "ERROR: GEMINI_API_KEY not set. Check $ENV_FILE"
    exit 1
fi

# ---- Run pipeline ----
log "Starting TwitterAI pipeline..."

cd "$PROJECT_DIR/scripts"
"$VENV_DIR/bin/python" main.py 2>&1 | tee -a "$LOG_FILE"
exit_code=${PIPESTATUS[0]}

if [ $exit_code -ne 0 ]; then
    log "ERROR: Pipeline failed with exit code $exit_code"
    exit $exit_code
fi

# ---- Git commit and push ----
log "Committing and pushing results..."

cd "$PROJECT_DIR"
git add data/*.json output/*.xlsx

if git diff --staged --quiet; then
    log "No new data to commit."
else
    git commit -m "Daily scrape: $(date +'%Y-%m-%d %H:%M') local"
    git pull --rebase || true
    git push
    log "Pushed to GitHub successfully."
fi

log "Done!"
rm -f "$LOG_FILE"
