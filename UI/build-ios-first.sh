#!/bin/bash
# Build iOS first (fast), then optionally Android (slow)
# Usage: ./build-ios-first.sh [--skip-android]

set -e

PROFILE="${PROFILE:-production}"
SKIP_ANDROID=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-android)
            SKIP_ANDROID=true
            shift
            ;;
        --profile=*)
            PROFILE="${arg#*=}"
            shift
            ;;
    esac
done

echo "🍏 Building iOS (profile: $PROFILE)..."
eas build --platform ios --profile "$PROFILE" --non-interactive

if [ "$SKIP_ANDROID" = false ]; then
    echo ""
    echo "🤖 Building Android (profile: $PROFILE)..."
    echo "⚠️  This will take ~1 hour. Press Ctrl+C to cancel."
    sleep 3
    eas build --platform android --profile "$PROFILE" --non-interactive
else
    echo ""
    echo "✅ iOS build complete. Skipping Android (--skip-android flag)"
fi
