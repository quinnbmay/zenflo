#!/bin/bash
# Git-based sync from NAS to Mac
# This pulls changes from NAS using git operations

# Configuration
NAS_HOST="nas@nas-1"
NAS_PATH="/home/nas/developer/infrastructure/Zenflo Server/zenflo"
MAC_PATH="/Users/quinnmay/developer/zenflo"
LOG_FILE="${MAC_PATH}/.logs/nas-sync.log"
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
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to sync NAS backend changes
sync_backend_from_nas() {
    log "${YELLOW}Checking for backend changes on NAS...${NC}"

    # Create temp directory for NAS backend files
    TMP_DIR="/tmp/nas-backend-sync-$$"
    mkdir -p "$TMP_DIR"

    # Copy backend directory from NAS
    scp -r "${NAS_HOST}:\"${NAS_PATH}/backend/\"" "$TMP_DIR/" >> "$LOG_FILE" 2>&1

    if [ $? -ne 0 ]; then
        log "${RED}✗ Failed to copy from NAS${NC}"
        rm -rf "$TMP_DIR"
        return 1
    fi

    # Sync backend files (excluding node_modules, build artifacts)
    rsync -av --delete \
        --exclude 'node_modules/' \
        --exclude 'dist/' \
        --exclude 'build/' \
        --exclude '.DS_Store' \
        --exclude '*.log' \
        "$TMP_DIR/backend/" "${MAC_PATH}/backend/" >> "$LOG_FILE" 2>&1

    # Cleanup
    rm -rf "$TMP_DIR"

    # Check for changes
    cd "$MAC_PATH" || return 1
    if [ -n "$(git status --porcelain backend/)" ]; then
        log "${GREEN}✓ Backend changes detected and synced${NC}"
        return 0
    else
        log "No backend changes detected"
        return 1
    fi
}

# Function to create commit for synced changes
auto_commit() {
    cd "$MAC_PATH" || return

    if [ -n "$(git status --porcelain)" ]; then
        log "${YELLOW}Creating commit for synced changes...${NC}"

        git add backend/
        git commit -m "sync: Auto-sync backend from NAS at $(date '+%Y-%m-%d %H:%M:%S')

Changes synced from production NAS server.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
via [ZenFlo](https://zenflo.app)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: ZenFlo <yesreply@zenflo.app>" >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            log "${GREEN}✓ Commit created${NC}"

            # Optionally push to remote
            # read -p "Push to remote? (y/n) " -n 1 -r
            # if [[ $REPLY =~ ^[Yy]$ ]]; then
            #     git push origin main
            # fi
        else
            log "${RED}✗ Commit failed${NC}"
        fi
    fi
}

# Trap CTRL+C
trap 'log "Stopping sync..."; exit 0' INT TERM

# Main loop
log "${GREEN}Starting NAS→Mac backend sync service${NC}"
log "Syncing every ${SYNC_INTERVAL} seconds"
log "Press CTRL+C to stop"
echo ""

# Initial sync
if sync_backend_from_nas; then
    auto_commit
fi

# Continuous sync loop
while true; do
    sleep "$SYNC_INTERVAL"
    if sync_backend_from_nas; then
        auto_commit
    fi
done
