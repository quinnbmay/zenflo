#!/bin/bash

################################################################################
# ZenFlo Mobile OTA Deployment Script
#
# This script automates the deployment of Over-The-Air (OTA) updates for
# the ZenFlo mobile application using Expo EAS Update.
#
# USAGE:
#   ./deploy-ota.sh <channel> [message]
#
# ARGUMENTS:
#   channel   - Deployment channel: 'preview' or 'production'
#   message   - Optional deployment message (prompted if not provided)
#
# EXAMPLES:
#   ./deploy-ota.sh preview
#   ./deploy-ota.sh production "Fix voice session crash"
#
# REQUIREMENTS:
#   - All TypeScript checks must pass
#   - Git repository must be clean (no uncommitted changes)
#   - Only JS/TS/asset changes (warns if native code changed)
#   - Must be run from /mobile directory
#
# OTA UPDATE GUIDELINES:
#   - Use OTA for: Code changes, UI updates, bug fixes (sources/ directory)
#   - Use Native Build for: Native dependencies, config, permissions
#   - OTA updates propagate to users in 5-10 minutes
#   - Users receive updates on next app open
#
# EXIT CODES:
#   0 - Success
#   1 - Invalid arguments or environment
#   2 - TypeScript errors
#   3 - Git repository not clean
#   4 - Native code changes detected (warning only)
#   5 - Deployment failed
#
# Author: ZenFlo Deployment Engineer
# Date: 2025-11-10
################################################################################

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly MOBILE_DIR="$SCRIPT_DIR"

# Native code patterns to check for changes
readonly NATIVE_PATTERNS=(
    "android/"
    "ios/"
    "app.json"
    "app.config.js"
    "package.json"
    "eas.json"
)

################################################################################
# Helper Functions
################################################################################

# Print colored message
log() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

log_info() {
    log "${BLUE}ℹ " "$*"
}

log_success() {
    log "${GREEN}✓ " "$*"
}

log_warning() {
    log "${YELLOW}⚠ " "$*"
}

log_error() {
    log "${RED}✗ " "$*"
}

log_section() {
    echo
    log "${CYAN}${BOLD}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "${CYAN}${BOLD}" "$*"
    log "${CYAN}${BOLD}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Print usage information
usage() {
    log_info "Usage: ./deploy-ota.sh <channel> [message]"
    echo
    echo "  channel   - Deployment channel: 'preview' or 'production'"
    echo "  message   - Optional deployment message (prompted if not provided)"
    echo
    echo "Examples:"
    echo "  ./deploy-ota.sh preview"
    echo "  ./deploy-ota.sh production \"Fix voice session crash\""
    echo
}

# Check if running from correct directory
check_directory() {
    if [[ ! -f "$MOBILE_DIR/package.json" ]]; then
        log_error "Must be run from the mobile directory"
        log_info "Current directory: $(pwd)"
        log_info "Expected directory: $MOBILE_DIR"
        exit 1
    fi

    if ! grep -q '"name": "@zenflo/mobile"' "$MOBILE_DIR/package.json"; then
        log_error "Not in ZenFlo mobile directory"
        exit 1
    fi
}

# Validate channel argument
validate_channel() {
    local channel="$1"

    if [[ "$channel" != "preview" && "$channel" != "production" ]]; then
        log_error "Invalid channel: $channel"
        log_info "Valid channels: preview, production"
        usage
        exit 1
    fi
}

# Check for uncommitted changes
check_git_status() {
    log_section "Checking Git Status"

    if ! git diff-index --quiet HEAD --; then
        log_error "Git repository has uncommitted changes"
        log_info "Please commit or stash your changes before deploying"
        echo
        log_info "Uncommitted changes:"
        git status --short
        exit 3
    fi

    log_success "Git repository is clean"
}

# Check for native code changes
check_native_changes() {
    log_section "Checking for Native Code Changes"

    local has_native_changes=false
    local changed_files

    # Get files changed in last commit
    changed_files=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)

    if [[ -z "$changed_files" ]]; then
        log_warning "Could not determine changed files (new repository or no previous commit)"
        log_info "Proceeding with caution..."
        return 0
    fi

    # Check each native pattern
    for pattern in "${NATIVE_PATTERNS[@]}"; do
        if echo "$changed_files" | grep -q "^$pattern"; then
            log_warning "Native code changes detected: $pattern"
            has_native_changes=true
        fi
    done

    if [[ "$has_native_changes" == "true" ]]; then
        log_warning "Native code changes detected in last commit"
        log_warning "OTA updates only update JS/TS code and assets"
        log_warning "Consider creating a native build instead:"
        log_info "  - For iOS: eas build --platform ios --profile production"
        log_info "  - For Android: eas build --platform android --profile production"
        echo

        # Ask for confirmation
        read -p "$(log_warning 'Continue with OTA deployment anyway? (y/N): ')" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 4
        fi
    else
        log_success "No native code changes detected"
    fi
}

# Run TypeScript type checking
run_typecheck() {
    log_section "Running TypeScript Type Check"

    cd "$MOBILE_DIR"

    if ! yarn typecheck; then
        log_error "TypeScript type check failed"
        log_info "Please fix type errors before deploying"
        exit 2
    fi

    log_success "TypeScript type check passed"
}

# Parse and update changelog
parse_changelog() {
    log_section "Parsing Changelog"

    cd "$MOBILE_DIR"

    if [[ -f "sources/scripts/parseChangelog.ts" ]]; then
        if tsx sources/scripts/parseChangelog.ts; then
            log_success "Changelog parsed successfully"
        else
            log_warning "Failed to parse changelog (continuing anyway)"
        fi
    else
        log_warning "Changelog parser not found (skipping)"
    fi
}

# Get deployment message
get_deployment_message() {
    local message="$1"

    if [[ -z "$message" ]]; then
        log_info "Enter deployment message (describe what changed):"
        read -r message

        if [[ -z "$message" ]]; then
            log_error "Deployment message is required"
            exit 1
        fi
    fi

    echo "$message"
}

# Deploy OTA update
deploy_ota() {
    local channel="$1"
    local message="$2"

    log_section "Deploying OTA Update to $channel"

    cd "$MOBILE_DIR"

    local deploy_start_time=$(date +%s)

    if [[ "$channel" == "production" ]]; then
        log_info "Channel: production"
        log_info "Command: yarn ota:production"
        log_info "Message: $message"
        echo

        # Export message as environment variable for workflow
        export OTA_MESSAGE="$message"

        if yarn ota:production; then
            local deploy_end_time=$(date +%s)
            local deploy_duration=$((deploy_end_time - deploy_start_time))

            log_success "Production OTA deployment completed in ${deploy_duration}s"
        else
            log_error "Production OTA deployment failed"
            exit 5
        fi
    else
        log_info "Channel: preview"
        log_info "Command: yarn ota"
        log_info "Message: $message"
        echo

        # Set environment variables for preview deployment
        export APP_ENV=preview
        export NODE_ENV=preview

        if eas update --branch preview --message "$message"; then
            local deploy_end_time=$(date +%s)
            local deploy_duration=$((deploy_end_time - deploy_start_time))

            log_success "Preview OTA deployment completed in ${deploy_duration}s"
        else
            log_error "Preview OTA deployment failed"
            exit 5
        fi
    fi
}

# Print deployment summary
print_summary() {
    local channel="$1"
    local message="$2"

    log_section "Deployment Summary"

    log_success "OTA update deployed successfully"
    echo
    log_info "Channel: $channel"
    log_info "Message: $message"
    echo
    log_info "Next steps:"
    log_info "  1. Updates will propagate to users in 5-10 minutes"
    log_info "  2. Users receive updates on next app open"
    log_info "  3. Monitor deployment at: https://expo.dev"
    echo

    if [[ "$channel" == "preview" ]]; then
        log_info "Preview deployment URLs:"
        log_info "  - iOS: exp://u.expo.dev/c92795a3-d883-41c0-b761-3effaa823810?channel-name=preview"
        log_info "  - Android: exp://u.expo.dev/c92795a3-d883-41c0-b761-3effaa823810?channel-name=preview"
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    local channel="${1:-}"
    local message="${2:-}"

    # Print header
    log "${CYAN}${BOLD}" ""
    log "${CYAN}${BOLD}" "╔══════════════════════════════════════════════════════════════╗"
    log "${CYAN}${BOLD}" "║                                                              ║"
    log "${CYAN}${BOLD}" "║           ZenFlo Mobile OTA Deployment Script               ║"
    log "${CYAN}${BOLD}" "║                                                              ║"
    log "${CYAN}${BOLD}" "╚══════════════════════════════════════════════════════════════╝"
    log "${CYAN}${BOLD}" ""

    # Validate arguments
    if [[ -z "$channel" ]]; then
        log_error "Channel argument is required"
        usage
        exit 1
    fi

    validate_channel "$channel"

    # Run pre-deployment checks
    check_directory
    check_git_status
    check_native_changes
    run_typecheck
    parse_changelog

    # Get deployment message
    message=$(get_deployment_message "$message")

    # Confirm deployment
    echo
    log "${YELLOW}${BOLD}" "═══════════════════════════════════════════════════════════════"
    log_warning "About to deploy OTA update:"
    log_info "  Channel: $channel"
    log_info "  Message: $message"
    log "${YELLOW}${BOLD}" "═══════════════════════════════════════════════════════════════"
    echo
    read -p "$(log_info 'Proceed with deployment? (y/N): ')" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi

    # Deploy
    deploy_ota "$channel" "$message"

    # Print summary
    print_summary "$channel" "$message"

    log_success "All done!"
}

# Run main function with all arguments
main "$@"
