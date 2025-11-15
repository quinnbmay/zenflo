#!/bin/bash

# ZenFlo Shell Profile Environment Variable Updater
# Updates .zshrc, .bashrc, and .bash_profile with new zenflo.dev domains
# Generated: 2025-11-15

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ZenFlo environment variables configuration
ZENFLO_ENV_CONFIG="
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ZenFlo Environment Configuration
# Updated: $(date '+%Y-%m-%d %H:%M:%S %Z')
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Backend API Server
export ZENFLO_SERVER_URL=\"https://api.zenflo.dev\"

# Web Application
export ZENFLO_WEBAPP_URL=\"https://app.zenflo.dev\"

# Mobile App (Expo)
export EXPO_PUBLIC_ZENFLO_SERVER_URL=\"https://api.zenflo.dev\"

# Legacy support (deprecated - will be removed in future versions)
# export EXPO_PUBLIC_HAPPY_SERVER_URL=\"https://zenflo.combinedmemory.com\"

# GitHub OAuth (for backend server)
# export GITHUB_REDIRECT_URL=\"https://api.zenflo.dev/v1/connect/github/callback\"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"

backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        local backup="${file}.backup-$(date +%Y%m%d-%H%M%S)"
        cp "$file" "$backup"
        print_success "Backed up to: $backup"
    fi
}

update_profile() {
    local profile_file=$1
    local profile_name=$2

    print_step "Updating $profile_name..."

    if [ ! -f "$profile_file" ]; then
        print_info "$profile_name does not exist, creating..."
        touch "$profile_file"
    fi

    # Backup existing file
    backup_file "$profile_file"

    # Remove old ZenFlo configuration block if it exists
    if grep -q "# ZenFlo Environment Configuration" "$profile_file"; then
        print_info "Removing old ZenFlo configuration..."
        # Create temp file without the old block
        awk '
            /# ━━━━.*ZenFlo Environment Configuration/ {skip=1}
            skip && /# ━━━━/ && NR > 1 {skip=0; next}
            !skip {print}
        ' "$profile_file" > "${profile_file}.tmp"
        mv "${profile_file}.tmp" "$profile_file"
    fi

    # Remove legacy combinedmemory.com environment variables
    if grep -q "combinedmemory.com" "$profile_file"; then
        print_info "Removing legacy combinedmemory.com variables..."
        sed -i.bak '/combinedmemory\.com/d' "$profile_file"
        rm -f "${profile_file}.bak"
    fi

    # Append new configuration
    echo "$ZENFLO_ENV_CONFIG" >> "$profile_file"

    print_success "$profile_name updated"
}

main() {
    print_header "ZenFlo Shell Profile Environment Variable Updater"

    print_step "Updating shell profiles in $HOME..."

    # Update .zshrc (macOS default)
    if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
        update_profile "$HOME/.zshrc" ".zshrc"
    fi

    # Update .bashrc (Linux default, macOS if bash is used)
    if [ -f "$HOME/.bashrc" ] || [ -n "$BASH_VERSION" ]; then
        update_profile "$HOME/.bashrc" ".bashrc"
    fi

    # Update .bash_profile (macOS bash login shell)
    if [ -f "$HOME/.bash_profile" ]; then
        update_profile "$HOME/.bash_profile" ".bash_profile"
    fi

    # Update .profile (universal fallback)
    if [ -f "$HOME/.profile" ]; then
        update_profile "$HOME/.profile" ".profile"
    fi

    print_header "Update Summary"

    print_success "Environment variables configured:"
    echo ""
    echo "  ZENFLO_SERVER_URL              = https://api.zenflo.dev"
    echo "  ZENFLO_WEBAPP_URL              = https://app.zenflo.dev"
    echo "  EXPO_PUBLIC_ZENFLO_SERVER_URL  = https://api.zenflo.dev"
    echo ""

    print_warning "Next steps:"
    echo ""
    echo "  1. Reload your shell configuration:"
    echo "     ${CYAN}source ~/.zshrc${NC}  (or ~/.bashrc, ~/.bash_profile)"
    echo ""
    echo "  2. Verify environment variables:"
    echo "     ${CYAN}echo \$ZENFLO_SERVER_URL${NC}"
    echo ""
    echo "  3. Restart any running ZenFlo services:"
    echo "     ${CYAN}# CLI daemon${NC}"
    echo "     ${CYAN}zenflo daemon stop && zenflo daemon start${NC}"
    echo ""

    print_success "Shell profiles updated successfully!"
}

main "$@"
