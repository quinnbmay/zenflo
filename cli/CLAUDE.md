# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZenFlo CLI** is a TypeScript command-line wrapper for Claude Code that enables remote session control via mobile/web apps. It's published to npm as `zenflo` and is part of the larger ZenFlo monorepo system (`@zenflo/cli` workspace).

**System Components:**
1. **CLI** (this project) - Wraps Claude Code, manages sessions, daemon
2. **Mobile/Web** - React Native + Next.js clients (`../mobile`, `../webapp`)
3. **Backend** - Fastify API server on NAS (`https://zenflo.combinedmemory.com`)

## Common Commands

```bash
# Development
yarn dev                        # Run from source (tsx)
yarn dev:local-server           # Run with local backend
yarn dev:integration-test-env   # Run with test environment

# Building
yarn build                      # TypeScript compile + pkgroll bundling
yarn typecheck                  # Type check without emit

# Testing
yarn test                       # Build + run integration tests (Vitest)

# Running
yarn start                      # Build + run from bin/zenflo.mjs
./bin/zenflo.mjs                # Direct binary execution

# Publishing
yarn release                    # Release-it workflow (version, changelog, publish)
yarn prepublishOnly             # Auto-runs: build + test
```

### Testing Single Test

```bash
# Run specific test file
yarn build && tsx --env-file .env.integration-test node_modules/.bin/vitest run src/daemon/daemon.integration.test.ts
```

### Daemon Management

```bash
# Development daemon
ZENFLO_SERVER_URL=http://localhost:3005 ./bin/zenflo.mjs daemon start

# Production daemon
./bin/zenflo.mjs daemon start
./bin/zenflo.mjs daemon stop
./bin/zenflo.mjs daemon status
./bin/zenflo.mjs daemon list        # List active sessions
```

### Environment Variables

```bash
# Core configuration
ZENFLO_SERVER_URL=https://zenflo.combinedmemory.com    # Backend API
ZENFLO_WEBAPP_URL=https://app.combinedmemory.com       # Web interface
ZENFLO_HOME_DIR=~/.happy                               # Data directory
ZENFLO_EXPERIMENTAL=false                              # Experimental features
ZENFLO_DISABLE_CAFFEINATE=false                        # Disable macOS sleep prevention

# MCP/Codex
ZENFLO_HTTP_MCP_URL=http://127.0.0.1:PORT              # MCP bridge target

# Daemon (internal)
ZENFLO_DAEMON_HTTP_TIMEOUT=60000                       # Daemon HTTP timeout
ZENFLO_DAEMON_HEARTBEAT_INTERVAL=30000                 # Heartbeat interval

# Debugging
DEBUG=zenflo:*                                         # Debug logging
DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true  # Server logging
```

## Architecture

### Entry Point Flow

`src/index.ts` → Parses subcommands → Routes to handlers:
- **`auth`** → `commands/auth.ts` - Authentication management
- **`connect`** → `commands/connect.ts` - AI vendor API keys storage
- **`codex`** → `codex/runCodex.ts` - OpenAI Codex mode
- **`notify`** → Push notifications via backend
- **`daemon`** → `daemon/run.ts` + `daemon/controlClient.ts` - Background service
- **`doctor`** → `ui/doctor.ts` - System diagnostics
- **Default** → `claude/runClaude.ts` - Main Claude Code wrapper

### Key Modules

**`/src/api/`** - Server Communication
- `api.ts` - REST API client for session management
- `apiSession.ts` - WebSocket client with RPC support (Socket.io)
- `auth.ts` - Challenge-response authentication using TweetNaCl signatures
- `encryption.ts` - End-to-end encryption (TweetNaCl secretbox)
- `types.ts` - Zod schemas for runtime validation

**`/src/claude/`** - Claude Code Integration
- `runClaude.ts` - Main orchestration (auth → daemon → session)
- `loop.ts` - Control loop managing interactive/remote modes
- `claudeSdk.ts` - `@anthropic-ai/claude-code` SDK integration
- `interactive.ts` - PTY-based interactive sessions (DEPRECATED - SDK preferred)
- `watcher.ts` - File system watcher for session files
- `mcp/startPermissionServer.ts` - MCP permission interceptor (IN PROGRESS)

**`/src/daemon/`** - Background Service
- `run.ts` - Main daemon process (HTTP server + session manager)
- `controlClient.ts` - HTTP client for daemon control
- `doctor.ts` - Process cleanup utilities
- `install.ts` / `uninstall.ts` - System service installation (WIP)

**`/src/codex/`** - OpenAI Codex Integration
- `runCodex.ts` - Codex session orchestration
- `zenfloMcpStdioBridge.ts` - STDIO MCP bridge for change_title tool

**`/src/ui/`** - User Interface
- `start.ts` - Main UI orchestration
- `logger.ts` - File-based logging system (avoids Claude UI interference)
- `qrcode.ts` - QR code generation for mobile auth
- `auth.ts` - Interactive authentication flow
- `doctor.ts` - System diagnostics output

**`/src/utils/`** - Utilities
- `spawnZenfloCLI.ts` - Spawn CLI process (handles binary vs source)
- `caffeinate.ts` - macOS sleep prevention
- `time.ts` - Exponential backoff utilities
- `inbox.ts` - Inbox message API

### Critical Files

- `configuration.ts` - Global configuration singleton with env vars
- `persistence.ts` - Local storage (settings, keys, daemon state)
- `projectPath.ts` - Detect project root from cwd

## Data Flow

### Authentication Flow
1. Generate/load TweetNaCl keypair from `~/.happy/access.key`
2. Request challenge from backend
3. Sign challenge with secret key
4. Receive auth token + session credentials

### Claude Session Flow

**Interactive Mode** (deprecated):
```
User → PTY → Claude Code → File watcher → Encrypt → Backend → Mobile
```

**Remote Mode** (preferred):
```
Mobile → Backend → Decrypt → Claude SDK → Backend → Encrypt → Mobile
```

### Daemon Architecture
- **HTTP server** on random port (stored in `daemon.state.json`)
- **RPC endpoints**: `/spawn`, `/stop-session`, `/list-sessions`, `/shutdown`
- **Heartbeat system**: Auto-restart on version mismatch
- **Session tracking**: Maps sessionId → child process

### Session Resumption (Claude --resume)

**Critical Behavior:**
- Creates NEW session file with NEW session ID
- Copies complete history from original session
- **Rewrites ALL session IDs** in history to new session ID
- Original session file remains unchanged
- Must handle session ID changes in responses

## Code Style & Conventions

### TypeScript
- **Strict mode** - No untyped code allowed
- **Functional** - Minimize classes, prefer functions
- **Explicit types** - All parameters and returns typed
- **Import paths** - Use `@/` alias for src imports
- **Exports** - Named exports preferred

### DO NOT
- Create trivial getter/setter functions
- Excessive `if` statements (prefer better design)
- **Import modules mid-code** - ALL imports at top
- Mock in tests - use real API calls

### Logging
- **File logs only** - Avoid console.log (disturbs Claude UI)
- Debug via `logger.debug()` (writes to `~/.happy/logs/`)
- User messages via `chalk` + `console.log`

### Error Handling
- Try-catch with specific error messages
- AbortControllers for cancellable operations
- Process lifecycle cleanup handlers

### Testing
- Colocated `.test.ts` files
- Integration tests with real backend
- Descriptive test names, proper async handling

## Important Notes

### Why Build Before Dev/Test?
Daemon commands execute the binary (`bin/zenflo.mjs`), not source. Build ensures daemon and dev code stay synchronized.

### Environment Files
- `.env.integration-test` - Test environment with local server
- `.env.dev-local-server` - Development with local backend
- `.env.dev` - Development configuration

### Storage Paths
- `~/.happy/` - Default home directory (still uses "happy" for backwards compatibility)
- `~/.happy/access.key` - TweetNaCl secret key (chmod 600)
- `~/.happy/settings.json` - Local settings
- `~/.happy/daemon.state.json` - Daemon PID and port
- `~/.happy/logs/` - Log files

### Encryption
- **TweetNaCl** secretbox for symmetric encryption
- **Keypair** for authentication (signatures)
- **Zero-knowledge** - Server cannot decrypt user data

### Permission System (WIP)
MCP server intercepts Claude's tool calls → sends to mobile → awaits approval → returns to Claude. Not yet fully implemented.

## Publishing Workflow

**Package:** [`zenflo`](https://www.npmjs.com/package/zenflo) (unscoped)
**Current:** v0.11.6

```bash
# Version bump
npm version patch|minor|major

# Build + test + publish
yarn release

# Manual publish
yarn build
yarn test
npm publish
git push origin main --tags
```

## Troubleshooting

### Daemon Issues
```bash
# Kill runaway processes
./bin/zenflo.mjs doctor clean

# View logs
tail -f ~/.happy/logs/*.log

# Check status
./bin/zenflo.mjs daemon status
```

### Type Errors
Always run `yarn typecheck` before committing. TypeScript is configured in strict mode - all code must be fully typed.

### Test Failures
Integration tests require local backend running:
```bash
# In backend directory
ZENFLO_HOME_DIR=~/.happy-dev-test yarn dev

# Then run tests
yarn test
```

## Dependencies

**Core:**
- `@anthropic-ai/claude-code` - Official Claude Code SDK
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `tweetnacl` - Cryptography (auth + encryption)
- `socket.io-client` - Real-time communication
- `zod` - Runtime type validation

**Build/Dev:**
- `pkgroll` - Fast bundler for libraries
- `tsx` - TypeScript execution
- `vitest` - Test runner
- `release-it` - Release automation

**Node.js:** >=20.0.0 required (for MCP SDK dependency)
