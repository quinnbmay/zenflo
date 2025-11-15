#!/bin/bash

################################################################################
# ZenFlo Web Deployment Script
#
# This script automates deployment of the ZenFlo web app to the NAS server.
#
# Usage:
#   ./deploy-web.sh [OPTIONS]
#
# Options:
#   -s, --skip-build          Skip yarn web:build step (use existing build)
#   -c, --skip-cache          Skip Cloudflare cache purge
#   -l, --logs <lines>        Number of log lines to show (default: 50)
#   -h, --help                Show this help message
#
# Examples:
#   ./deploy-web.sh                  # Build and deploy web app
#   ./deploy-web.sh --skip-build     # Deploy existing build
#   ./deploy-web.sh --skip-cache     # Deploy without purging CDN cache
#
# Web App Location on NAS: developer/infrastructure/ZenFlo Web
# Container Name: zenflo-webapp
# SSH Target: nas@nas-1
# URL: https://app.combinedmemory.com
#
# Author: ZenFlo Team
# Last Updated: 2025-11-15
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
NAS_REPO_PATH="developer/infrastructure/Zenflo Server/zenflo"
NAS_UI_PATH="$NAS_REPO_PATH/UI"
CONTAINER_NAME="zenflo-webapp"
LOCAL_UI_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_OUTPUT_DIR="dist"

# Default options
SKIP_BUILD=false
SKIP_CACHE=false
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

    # Check if we're in the UI directory
    if [ ! -f "package.json" ] || [ ! -d "sources" ]; then
        print_error "This script must be run from the UI directory"
        exit 1
    fi

    print_success "UI directory verified"
}

verify_nas_directory() {
    print_step "Verifying NAS directory structure..."

    # Pull latest code on NAS to get restructured repo
    print_info "Pulling latest code structure on NAS..."
    ssh "$NAS_HOST" "cd \"$NAS_REPO_PATH\" && git pull origin main" || {
        print_warning "Could not pull latest code (continuing with existing structure)"
    }

    # Verify UI directory exists
    if ! ssh "$NAS_HOST" "[ -d \"$NAS_UI_PATH\" ]"; then
        print_error "UI directory not found on NAS: $NAS_UI_PATH"
        print_info "This might mean the restructure hasn't been synced yet"
        exit 1
    fi

    print_success "NAS directory ready"
}

build_webapp() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build (--skip-build flag set)"

        # Verify build exists
        if [ ! -d "$BUILD_OUTPUT_DIR" ]; then
            print_error "Build directory not found: $BUILD_OUTPUT_DIR"
            print_info "Run without --skip-build to create a new build"
            exit 1
        fi

        return
    fi

    print_step "Building web app..."
    print_info "Running: yarn web:build"

    # Run typecheck first
    print_step "Running TypeScript check..."
    yarn typecheck || {
        print_error "TypeScript check failed"
        print_info "Fix type errors before deploying"
        exit 1
    }
    print_success "TypeScript check passed"

    # Build the web app
    yarn web:build || {
        print_error "Build failed"
        exit 1
    }

    # Verify build output exists
    if [ ! -d "$BUILD_OUTPUT_DIR" ]; then
        print_error "Build output directory not found: $BUILD_OUTPUT_DIR"
        exit 1
    fi

    print_success "Web app built successfully"
}

deploy_to_nas() {
    print_header "Deploying to NAS"

    print_step "Syncing build files to NAS..."
    print_info "Source: $LOCAL_UI_PATH/$BUILD_OUTPUT_DIR"
    print_info "Target: $NAS_HOST:$NAS_UI_PATH/$BUILD_OUTPUT_DIR/"

    # Remove old dist directory on NAS
    ssh "$NAS_HOST" "rm -rf '$NAS_UI_PATH/$BUILD_OUTPUT_DIR'" || {
        print_warning "Could not remove old build directory"
    }

    # Create dist directory on NAS
    ssh "$NAS_HOST" "mkdir -p '$NAS_UI_PATH/$BUILD_OUTPUT_DIR'" || {
        print_error "Failed to create dist directory on NAS"
        exit 1
    }

    # Use tar over SSH to copy built files (reliable for paths with spaces)
    cd "$LOCAL_UI_PATH/$BUILD_OUTPUT_DIR" && \
    tar czf - . 2>/dev/null | \
    ssh "$NAS_HOST" "cd '$NAS_UI_PATH/$BUILD_OUTPUT_DIR' && tar xzf - 2>/dev/null" || {
        print_error "Failed to sync files to NAS"
        exit 1
    }
    cd "$LOCAL_UI_PATH" # Return to UI directory

    print_success "Files synced to NAS"
}

setup_nginx_config() {
    print_step "Setting up nginx configuration..."

    # Create nginx.conf in UI directory on NAS
    ssh "$NAS_HOST" "cat > \"$NAS_UI_PATH/nginx.conf\" << 'NGINX_EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # No cache for index.html
    location = /index.html {
        add_header Cache-Control \"no-cache, no-store, must-revalidate\";
    }
}
NGINX_EOF
" || {
        print_error "Failed to create nginx configuration"
        exit 1
    }

    print_success "nginx configuration created"
}

setup_docker_compose() {
    print_step "Setting up Docker Compose configuration..."

    # Create docker-compose.yml in UI directory on NAS
    ssh "$NAS_HOST" "cat > \"$NAS_UI_PATH/docker-compose.yml\" << 'COMPOSE_EOF'
version: '3.8'

services:
  zenflo-webapp:
    image: nginx:alpine
    container_name: zenflo-webapp
    restart: unless-stopped
    ports:
      - \"8080:80\"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - zenflo-network

networks:
  zenflo-network:
    external: true
COMPOSE_EOF
" || {
        print_error "Failed to create docker-compose.yml"
        exit 1
    }

    print_success "Docker Compose configuration created"
}

restart_container() {
    print_step "Restarting Docker container..."

    ssh "$NAS_HOST" "cd \"$NAS_UI_PATH\" && sudo docker compose up -d --force-recreate $CONTAINER_NAME" || {
        print_error "Failed to restart Docker container"
        exit 1
    }

    print_success "Container restarted"
}

verify_container() {
    print_step "Verifying container is running..."

    sleep 2  # Give container a moment to start

    CONTAINER_STATUS=$(ssh "$NAS_HOST" "sudo docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}'" || echo "")

    if [ -z "$CONTAINER_STATUS" ]; then
        print_error "Container $CONTAINER_NAME is not running!"
        print_info "Fetching container logs..."
        ssh "$NAS_HOST" "sudo docker logs $CONTAINER_NAME --tail 100"
        exit 1
    fi

    print_success "Container is running: $CONTAINER_STATUS"
}

purge_cloudflare_cache() {
    if [ "$SKIP_CACHE" = true ]; then
        print_warning "Skipping Cloudflare cache purge (--skip-cache flag set)"
        return
    fi

    print_step "Purging Cloudflare cache..."
    print_warning "Manual cache purge required via Cloudflare dashboard"
    print_info "Visit: https://dash.cloudflare.com"
    print_info "Navigate to: Caching → Configuration → Purge Cache"
    print_info "URL: https://app.combinedmemory.com"
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

    echo -e "  ${GREEN}✓${NC} Container Name:     ${CYAN}$CONTAINER_NAME${NC}"
    echo -e "  ${GREEN}✓${NC} Web App URL:        ${CYAN}https://app.combinedmemory.com${NC}"
    echo -e "  ${GREEN}✓${NC} Build Size:         ${CYAN}$(du -sh "$BUILD_OUTPUT_DIR" | cut -f1)${NC}"
    echo ""

    print_success "Deployment completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  • Visit app:    https://app.combinedmemory.com"
    echo "  • Monitor logs: ssh $NAS_HOST \"sudo docker logs -f $CONTAINER_NAME\""
    echo "  • Check status: ssh $NAS_HOST \"sudo docker ps | grep $CONTAINER_NAME\""
    echo ""
}

################################################################################
# Parse Command Line Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -c|--skip-cache)
            SKIP_CACHE=true
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

print_header "ZenFlo Web Deployment"
echo ""

# Run pre-deployment checks
check_prerequisites
verify_nas_directory

# Build the web app
build_webapp

# Deploy to NAS
deploy_to_nas

# Setup configurations
setup_nginx_config
setup_docker_compose

# Restart container
restart_container

# Verify deployment
verify_container

# Purge CDN cache
purge_cloudflare_cache

# Show logs
show_logs

# Show summary
show_summary

exit 0
