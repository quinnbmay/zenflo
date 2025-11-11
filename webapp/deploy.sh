#!/bin/bash

################################################################################
# ZenFlo Webapp Deployment Script
#
# This script automates the complete deployment workflow for the ZenFlo webapp
# from local build to NAS container deployment with Cloudflare cache purging.
#
# Prerequisites:
#   - SSH access to nas@nas-1 configured
#   - Docker running on NAS with zenflo-webapp container
#   - Cloudflare credentials configured below
#   - Node.js/npm/expo-cli installed locally
#
# Usage:
#   ./deploy.sh [options]
#
# Options:
#   --skip-build     Skip the local build step (use existing dist-railway/)
#   --skip-cache     Skip Cloudflare cache purge
#   --help           Show this help message
#
# Exit Codes:
#   0 - Success
#   1 - General error
#   2 - Build failed
#   3 - Package/transfer failed
#   4 - NAS deployment failed
#   5 - Cloudflare cache purge failed
#
# Last Updated: 2025-11-10 PST
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color output codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# Configuration
readonly CLOUDFLARE_ZONE_ID="d19ff1e79dd2b5d7f5137779ad47a5e6"
readonly CLOUDFLARE_API_KEY="7fe8f008072ea9c62d6fa3904fa08f29e4c15"
readonly CLOUDFLARE_EMAIL="quinn@maymarketingseo.com"
readonly NAS_HOST="nas@nas-1"
readonly CONTAINER_NAME="zenflo-webapp"
readonly NAS_PATH="developer/infrastructure/Zenflo Server/zenflo/webapp"
readonly WEBAPP_DIR="/Users/quinnmay/developer/zenflo/webapp"
readonly ARCHIVE_PATH="/tmp/webapp-deploy.tar.gz"
readonly DIST_DIR="dist-railway"

# Parse command line arguments
SKIP_BUILD=false
SKIP_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-cache)
            SKIP_CACHE=true
            shift
            ;;
        --help|-h)
            head -n 40 "$0" | tail -n 35
            exit 0
            ;;
        *)
            echo -e "${RED}${BOLD}Error:${NC} Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}${BOLD}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}${BOLD}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$1${NC}"
}

cleanup() {
    if [[ -f "$ARCHIVE_PATH" ]]; then
        log_info "Cleaning up temporary files..."
        rm -f "$ARCHIVE_PATH"
    fi
}

trap cleanup EXIT

# Validation functions
validate_prerequisites() {
    log_step "Validating prerequisites"

    # Check if we're in the right directory
    if [[ ! -f "$WEBAPP_DIR/package.json" ]]; then
        log_error "Not in webapp directory. Expected: $WEBAPP_DIR"
        exit 1
    fi

    # Check for npx/expo
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js"
        exit 1
    fi

    # Check SSH access to NAS
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$NAS_HOST" true 2>/dev/null; then
        log_error "Cannot connect to NAS ($NAS_HOST). Check SSH configuration"
        exit 1
    fi

    # Check if container exists on NAS
    if ! ssh "$NAS_HOST" "sudo docker ps -a --format '{{.Names}}' | grep -q '^${CONTAINER_NAME}\$'"; then
        log_error "Container '$CONTAINER_NAME' not found on NAS"
        exit 4
    fi

    log_success "All prerequisites validated"
}

build_webapp() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warning "Skipping build step (--skip-build flag)"

        # Verify dist-railway exists
        if [[ ! -d "$WEBAPP_DIR/$DIST_DIR" ]]; then
            log_error "$DIST_DIR directory not found. Cannot skip build"
            exit 2
        fi

        return 0
    fi

    log_step "Building webapp locally"

    cd "$WEBAPP_DIR"

    # Remove old dist directories
    if [[ -d "dist" ]]; then
        log_info "Removing old dist directory..."
        rm -rf dist
    fi

    if [[ -d "$DIST_DIR" ]]; then
        log_info "Removing old $DIST_DIR directory..."
        rm -rf "$DIST_DIR"
    fi

    # Build with expo
    log_info "Running: npx expo export --platform web"
    if ! npx expo export --platform web; then
        log_error "Build failed"
        exit 2
    fi

    # Rename dist to dist-railway
    if [[ ! -d "dist" ]]; then
        log_error "Build succeeded but dist directory not found"
        exit 2
    fi

    log_info "Renaming dist to $DIST_DIR..."
    mv dist "$DIST_DIR"

    log_success "Build completed successfully"
}

package_and_transfer() {
    log_step "Packaging and transferring to NAS"

    cd "$WEBAPP_DIR"

    # Verify dist-railway exists
    if [[ ! -d "$DIST_DIR" ]]; then
        log_error "$DIST_DIR directory not found"
        exit 3
    fi

    # Create archive
    log_info "Creating tar.gz archive..."
    if ! tar -czf "$ARCHIVE_PATH" "$DIST_DIR/"; then
        log_error "Failed to create archive"
        exit 3
    fi

    # Get archive size for logging
    local archive_size
    archive_size=$(du -h "$ARCHIVE_PATH" | cut -f1)
    log_info "Archive size: $archive_size"

    # Transfer to NAS
    log_info "Transferring to NAS ($NAS_HOST)..."
    if ! scp "$ARCHIVE_PATH" "$NAS_HOST:/tmp/"; then
        log_error "Failed to transfer archive to NAS"
        exit 3
    fi

    log_success "Package transferred successfully"
}

deploy_on_nas() {
    log_step "Deploying on NAS"

    # Extract files on NAS
    log_info "Extracting archive on NAS..."
    if ! ssh "$NAS_HOST" "cd '$NAS_PATH' && rm -rf $DIST_DIR && tar -xzf /tmp/webapp-deploy.tar.gz"; then
        log_error "Failed to extract archive on NAS"
        exit 4
    fi

    # Verify extraction
    if ! ssh "$NAS_HOST" "test -d '$NAS_PATH/$DIST_DIR'"; then
        log_error "$DIST_DIR not found on NAS after extraction"
        exit 4
    fi

    # Check if container is running
    log_info "Checking container status..."
    if ! ssh "$NAS_HOST" "sudo docker ps --format '{{.Names}}' | grep -q '^${CONTAINER_NAME}\$'"; then
        log_warning "Container '$CONTAINER_NAME' is not running. Attempting to start..."
        if ! ssh "$NAS_HOST" "cd '$NAS_PATH' && sudo docker compose up -d $CONTAINER_NAME"; then
            log_error "Failed to start container"
            exit 4
        fi
        sleep 3
    fi

    # Copy files into container
    log_info "Copying files into container..."
    if ! ssh "$NAS_HOST" "sudo docker cp '$NAS_PATH/$DIST_DIR/.' $CONTAINER_NAME:/usr/share/nginx/html/"; then
        log_error "Failed to copy files into container"
        exit 4
    fi

    # Fix permissions (CRITICAL!)
    log_info "Fixing permissions in container..."
    if ! ssh "$NAS_HOST" "sudo docker exec $CONTAINER_NAME chmod -R 755 /usr/share/nginx/html"; then
        log_error "Failed to set permissions"
        exit 4
    fi

    if ! ssh "$NAS_HOST" "sudo docker exec $CONTAINER_NAME chown -R nginx:nginx /usr/share/nginx/html"; then
        log_error "Failed to set ownership"
        exit 4
    fi

    # Verify deployment
    log_info "Verifying deployment..."
    if ! ssh "$NAS_HOST" "sudo docker exec $CONTAINER_NAME test -f /usr/share/nginx/html/index.html"; then
        log_error "index.html not found in container after deployment"
        exit 4
    fi

    # Clean up NAS temp files
    log_info "Cleaning up NAS temporary files..."
    ssh "$NAS_HOST" "rm -f /tmp/webapp-deploy.tar.gz" || true

    log_success "Deployment completed successfully"
}

purge_cloudflare_cache() {
    if [[ "$SKIP_CACHE" == true ]]; then
        log_warning "Skipping Cloudflare cache purge (--skip-cache flag)"
        return 0
    fi

    log_step "Purging Cloudflare cache"

    local response
    local http_code

    # Make API request and capture response
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
        -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
        -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')

    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n-1)

    # Check HTTP status code
    if [[ "$http_code" != "200" ]]; then
        log_error "Cloudflare API returned HTTP $http_code"
        log_error "Response: $response_body"
        exit 5
    fi

    # Check for success in JSON response
    if ! echo "$response_body" | grep -q '"success":true'; then
        log_error "Cloudflare cache purge failed"
        log_error "Response: $response_body"
        exit 5
    fi

    log_success "Cloudflare cache purged successfully"
}

print_summary() {
    echo -e "\n${GREEN}${BOLD}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║                                            ║${NC}"
    echo -e "${GREEN}${BOLD}║     🚀  Deployment Completed Successfully  ║${NC}"
    echo -e "${GREEN}${BOLD}║                                            ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════╝${NC}\n"

    echo -e "${BOLD}Deployment Summary:${NC}"
    echo -e "  ${CYAN}•${NC} Container: ${BOLD}$CONTAINER_NAME${NC}"
    echo -e "  ${CYAN}•${NC} NAS Host: ${BOLD}$NAS_HOST${NC}"
    echo -e "  ${CYAN}•${NC} URL: ${BOLD}https://app.combinedmemory.com${NC}"

    if [[ "$SKIP_CACHE" == false ]]; then
        echo -e "\n${YELLOW}Note:${NC} Cloudflare cache has been purged. Changes should be live immediately."
    else
        echo -e "\n${YELLOW}Warning:${NC} Cloudflare cache was NOT purged. Changes may take time to propagate."
    fi

    echo -e "\n${BOLD}Next Steps:${NC}"
    echo -e "  1. Visit ${CYAN}https://app.combinedmemory.com${NC} to verify deployment"
    echo -e "  2. Check browser console for any errors"
    echo -e "  3. Test critical user flows"

    if [[ "$SKIP_BUILD" == false ]]; then
        echo -e "\n${BOLD}Reminder:${NC} Commit the updated $DIST_DIR directory:"
        echo -e "  ${CYAN}git add webapp/$DIST_DIR${NC}"
        echo -e "  ${CYAN}git commit -m \"webapp: Deploy <description>\"${NC}"
    fi
}

# Main execution
main() {
    local start_time
    start_time=$(date +%s)

    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║          ZenFlo Webapp Deployment Script             ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    log_info "Starting deployment at $(date '+%Y-%m-%d %H:%M:%S')"

    # Execute deployment steps
    validate_prerequisites
    build_webapp
    package_and_transfer
    deploy_on_nas
    purge_cloudflare_cache

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_summary

    echo -e "\n${GREEN}${BOLD}Total deployment time: ${duration}s${NC}\n"
}

# Run main function
main "$@"
