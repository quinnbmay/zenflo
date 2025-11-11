#!/bin/bash
# Sync ZenFlo backend changes from NAS to Mac
# This script continuously watches for changes on NAS and syncs them to Mac

# Configuration
NAS_HOST="nas@nas-1"
NAS_PATH="developer/infrastructure/Zenflo\ Server/zenflo/"
MAC_PATH="/Users/quinnmay/developer/zenflo/"
LOG_FILE="/Users/quinnmay/developer/zenflo/.logs/nas-sync.log"
SYNC_INTERVAL=30  # seconds

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to sync from NAS
sync_from_nas() {
    log "${YELLOW}Starting sync from NAS...${NC}"

    # Rsync command with options:
    # -a: archive mode (recursive, preserves permissions, times, etc.)
    # -v: verbose
    # -z: compress during transfer
    # --delete: delete files on Mac that don't exist on NAS
    # --exclude: exclude certain files/directories
    rsync -avz --delete \
        --exclude 'node_modules/' \
        --exclude '.git/' \
        --exclude 'dist/' \
        --exclude 'build/' \
        --exclude '.expo/' \
        --exclude 'ios/Pods/' \
        --exclude 'android/.gradle/' \
        --exclude '.logs/' \
        --exclude '.DS_Store' \
        --exclude '*.log' \
        "${NAS_HOST}:${NAS_PATH}" "${MAC_PATH}" >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Sync completed successfully${NC}"
        return 0
    else
        log "${RED}✗ Sync failed${NC}"
        return 1
    fi
}

# Function to check for changes and auto-commit
auto_commit() {
    cd "$MAC_PATH" || return

    # Check if there are any changes
    if [ -n "$(git status --porcelain)" ]; then
        log "${YELLOW}Changes detected, creating commit...${NC}"

        git add -A
        git commit -m "sync: Auto-sync from NAS at $(date '+%Y-%m-%d %H:%M:%S')

Changes synced from production NAS server.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
via [ZenFlo](https://zenflo.app)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: ZenFlo <yesreply@zenflo.app>" >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            log "${GREEN}✓ Auto-commit created${NC}"
        else
            log "${RED}✗ Auto-commit failed${NC}"
        fi
    fi
}

# Trap CTRL+C and cleanup
trap 'log "Stopping sync..."; exit 0' INT TERM

# Main loop
log "Starting NAS→Mac sync service"
log "Syncing every ${SYNC_INTERVAL} seconds"
log "Press CTRL+C to stop"
echo ""

# Initial sync
sync_from_nas
auto_commit

# Continuous sync loop
while true; do
    sleep "$SYNC_INTERVAL"
    sync_from_nas
    auto_commit
done
