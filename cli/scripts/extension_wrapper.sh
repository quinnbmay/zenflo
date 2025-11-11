#!/bin/bash
# Wrapper for Claude Code extension to launch ZenFlo instead of raw Claude

# The extension passes the native binary path as first argument
NATIVE_BINARY="$1"
shift

# Export the native binary path for the launcher to use
export CLAUDE_CODE_NATIVE_BINARY="$NATIVE_BINARY"

# Launch zenflo which creates full backend sessions
# ZenFlo will spawn Claude Code with proper stdio handling
exec zenflo "$@"
