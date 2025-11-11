#!/bin/bash
# One-time sync from NAS to Mac
# Usage: ./scripts/sync-once.sh

# Configuration
NAS_HOST="nas@nas-1"
NAS_PATH="developer/infrastructure/Zenflo\ Server/zenflo/"
MAC_PATH="/Users/quinnmay/developer/zenflo/"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Syncing from NAS to Mac...${NC}"

# Rsync with dry-run first to show what would change
echo -e "${YELLOW}Dry run - showing changes:${NC}"
rsync -avzn --delete \
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
    "${NAS_HOST}:${NAS_PATH}" "${MAC_PATH}"

echo ""
read -p "Proceed with sync? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
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
        "${NAS_HOST}:${NAS_PATH}" "${MAC_PATH}"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Sync completed successfully${NC}"
    else
        echo -e "${RED}✗ Sync failed${NC}"
        exit 1
    fi
else
    echo "Sync cancelled"
    exit 0
fi
