#!/bin/bash

################################################################################
# ZenFlo Backend Deployment Script
#
# This script automates deployment of the ZenFlo backend to the NAS server.
#
# Usage:
#   ./deploy.sh [OPTIONS]
#
# Options:
#   -m, --mode <git|local>    Deployment mode (default: git)
#                             git:   Pull latest changes from git on NAS
#                             local: Copy local files to NAS
#   -b, --branch <branch>     Git branch to pull (default: main)
#   -s, --skip-install        Skip npm install step
#   -n, --no-rebuild          Skip Docker container rebuild
#   -l, --logs <lines>        Number of log lines to show (default: 50)
#   -h, --help                Show this help message
#
# Examples:
#   ./deploy.sh                          # Deploy from git (main branch)
#   ./deploy.sh -m local                 # Deploy local changes
#   ./deploy.sh -b develop               # Deploy from develop branch
#   ./deploy.sh -m local --skip-install  # Deploy local without npm install
#
# Backend Location on NAS: developer/infrastructure/ZenFlo Server/zenflo-server
# Container Name: zenflo-server
# SSH Target: nas@nas-1
#
# Author: ZenFlo Team
# Last Updated: 2025-11-10
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAS_HOST="nas@nas-1"
NAS_PATH="developer/infrastructure/ZenFlo Server/zenflo-server"
CONTAINER_NAME="zenflo-server"
LOCAL_BACKEND_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default options
MODE="git"
BRANCH="main"
SKIP_INSTALL=false
NO_REBUILD=false
LOG_LINES=50

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

show_help() {
    sed -n '/^# Usage:/,/^################################################################################/p' "$0" | sed 's/^# //; s/^#//'
    exit 0
}

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check if SSH key is set up
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" echo "SSH connection successful" > /dev/null 2>&1; then
        print_error "Cannot connect to $NAS_HOST via SSH"
        print_info "Please ensure:"
        print_info "  1. SSH key is set up for passwordless login"
        print_info "  2. NAS server is running and accessible"
        print_info "  3. Host alias 'nas-1' is configured in ~/.ssh/config"
        exit 1
    fi

    print_success "SSH connection verified"
}

verify_nas_directory() {
    print_step "Verifying NAS directory structure..."

    if ! ssh "$NAS_HOST" "[ -d '$NAS_PATH' ]"; then
        print_error "Backend directory not found on NAS: $NAS_PATH"
        print_info "Please ensure the backend is properly set up on the NAS"
        exit 1
    fi

    print_success "NAS directory verified"
}

check_package_changes() {
    print_step "Checking if package.json changed..."

    if [ "$MODE" = "git" ]; then
        # Check git diff for package.json
        PACKAGE_CHANGED=$(ssh "$NAS_HOST" "cd '$NAS_PATH' && git diff HEAD@{1} HEAD -- package.json | wc -l" 2>/dev/null || echo "0")
    else
        # Always return true for local mode to be safe
        PACKAGE_CHANGED="1"
    fi

    if [ "$PACKAGE_CHANGED" != "0" ]; then
        print_info "package.json has changes, npm install will be required"
        return 0
    else
        print_info "No changes to package.json detected"
        return 1
    fi
}

deploy_from_git() {
    print_header "Deploying from Git (branch: $BRANCH)"

    print_step "Pulling latest changes from git..."
    ssh "$NAS_HOST" "cd '$NAS_PATH' && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH" || {
        print_error "Failed to pull from git"
        exit 1
    }
    print_success "Git pull completed"
}

deploy_from_local() {
    print_header "Deploying from Local Files"

    print_step "Syncing local files to NAS..."
    print_info "Source: $LOCAL_BACKEND_PATH"
    print_info "Target: $NAS_HOST:$NAS_PATH"

    # Use rsync to copy files, excluding common build artifacts and dependencies
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.logs' \
        --exclude '.pgdata' \
        --exclude '.minio' \
        --exclude '*.log' \
        "$LOCAL_BACKEND_PATH/" "$NAS_HOST:$NAS_PATH/" || {
        print_error "Failed to sync files to NAS"
        exit 1
    }

    print_success "Files synced to NAS"
}

install_dependencies() {
    if [ "$SKIP_INSTALL" = true ]; then
        print_warning "Skipping npm install (--skip-install flag set)"
        return
    fi

    print_step "Installing npm dependencies..."
    ssh "$NAS_HOST" "cd '$NAS_PATH' && npm install" || {
        print_error "Failed to install npm dependencies"
        exit 1
    }
    print_success "Dependencies installed"
}

rebuild_container() {
    if [ "$NO_REBUILD" = true ]; then
        print_warning "Skipping container rebuild (--no-rebuild flag set)"
        return
    fi

    print_step "Rebuilding Docker container..."
    ssh "$NAS_HOST" "cd '$NAS_PATH' && sudo docker compose up -d --build $CONTAINER_NAME" || {
        print_error "Failed to rebuild Docker container"
        exit 1
    }
    print_success "Container rebuilt and started"
}

verify_container() {
    print_step "Verifying container is running..."

    sleep 3  # Give container a moment to start

    CONTAINER_STATUS=$(ssh "$NAS_HOST" "sudo docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}'" || echo "")

    if [ -z "$CONTAINER_STATUS" ]; then
        print_error "Container $CONTAINER_NAME is not running!"
        print_info "Fetching container logs..."
        ssh "$NAS_HOST" "sudo docker logs $CONTAINER_NAME --tail 100"
        exit 1
    fi

    print_success "Container is running: $CONTAINER_STATUS"
}

show_logs() {
    print_step "Showing last $LOG_LINES lines of container logs..."
    echo ""
    ssh "$NAS_HOST" "sudo docker logs $CONTAINER_NAME --tail $LOG_LINES" || {
        print_warning "Could not fetch container logs"
    }
    echo ""
}

show_summary() {
    print_header "Deployment Summary"

    echo -e "  ${GREEN}✓${NC} Deployment Mode:    ${CYAN}$MODE${NC}"
    if [ "$MODE" = "git" ]; then
        echo -e "  ${GREEN}✓${NC} Git Branch:         ${CYAN}$BRANCH${NC}"
    fi
    echo -e "  ${GREEN}✓${NC} Container Name:     ${CYAN}$CONTAINER_NAME${NC}"
    echo -e "  ${GREEN}✓${NC} Backend URL:        ${CYAN}https://happy.combinedmemory.com${NC}"
    echo ""

    print_success "Deployment completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  • Monitor logs: ssh $NAS_HOST \"sudo docker logs -f $CONTAINER_NAME\""
    echo "  • Check status: ssh $NAS_HOST \"sudo docker ps | grep $CONTAINER_NAME\""
    echo "  • Test API:     curl https://happy.combinedmemory.com/health"
    echo ""
}

################################################################################
# Parse Command Line Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            if [[ "$MODE" != "git" && "$MODE" != "local" ]]; then
                print_error "Invalid mode: $MODE (must be 'git' or 'local')"
                exit 1
            fi
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        -s|--skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        -n|--no-rebuild)
            NO_REBUILD=true
            shift
            ;;
        -l|--logs)
            LOG_LINES="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

################################################################################
# Main Deployment Flow
################################################################################

print_header "ZenFlo Backend Deployment"
echo ""

# Run pre-deployment checks
check_prerequisites
verify_nas_directory

# Deploy based on mode
if [ "$MODE" = "git" ]; then
    deploy_from_git
else
    deploy_from_local
fi

# Check if we need to install dependencies
SHOULD_INSTALL=false
if check_package_changes; then
    SHOULD_INSTALL=true
fi

if [ "$SHOULD_INSTALL" = true ] || [ "$MODE" = "local" ]; then
    install_dependencies
else
    print_info "Skipping npm install (no package.json changes detected)"
fi

# Rebuild container
rebuild_container

# Verify deployment
verify_container

# Show logs
show_logs

# Show summary
show_summary

exit 0
