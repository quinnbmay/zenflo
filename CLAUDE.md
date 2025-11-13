# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZenFlo is an AI-powered coding platform combining Claude Code with voice intelligence, real-time collaboration, and multi-device synchronization. Built as a monorepo with React Native (Expo), Fastify backend, and MCP servers.

**Technology Stack:**
- **Frontend:** React Native 0.81, Expo SDK 54, TypeScript 5.9
- **Backend:** Fastify 5, PostgreSQL 15, Prisma ORM, Redis
- **Voice AI:** ElevenLabs Conversational AI
- **Styling:** Unistyles (cross-platform with themes)
- **Encryption:** TweetNaCl (end-to-end encryption)

## Monorepo Structure

```
zenflo/
├── mobile/         # \@zenflo/mobile - iOS/Android app
├── webapp/         # \@zenflo/webapp - Web interface
├── backend/        # \@zenflo/backend - API server (reference copy)
├── cli/            # \@zenflo/cli - CLI wrapper for Claude Code
├── zen-mcp/        # Zen Mode MCP servers (task management)
└── experimental/   # New features and prototypes
```

## Common Commands

### Workspace Management
```bash
# Install all dependencies
yarn install

# Work with specific workspace
yarn mobile <command>      # Shortcut for mobile workspace
yarn webapp <command>      # Shortcut for webapp workspace
yarn backend <command>     # Shortcut for backend workspace

# Or use full workspace names
yarn workspace \@zenflo/mobile <command>
yarn workspace \@zenflo/webapp <command>
```

### Development
```bash
# Mobile app
cd mobile/
yarn start          # Start Expo dev server
yarn ios           # Run on iOS simulator
yarn android       # Run on Android emulator
yarn typecheck     # TypeScript check (ALWAYS run after changes)

# Web app
cd webapp/
yarn start         # Start dev server
yarn web           # Same as above
yarn typecheck     # TypeScript check

# Backend (reference only - actual deployment on NAS)
cd backend/
yarn dev           # Development server
yarn build         # TypeScript compile check

# CLI
cd cli/
yarn dev           # Development mode
yarn build         # Build TypeScript
```

### Testing
```bash
# Mobile app
cd mobile/
yarn test          # Run tests with Jest

# Run across all workspaces
yarn test:all      # From root directory
```

### Type Checking
```bash
# CRITICAL: Always run typecheck after making changes
yarn typecheck:all  # Check all workspaces from root

# Or per workspace
cd mobile/ && yarn typecheck
cd webapp/ && yarn typecheck
cd backend/ && yarn build
```

### Building
```bash
# Build all workspaces
yarn build:all

# Mobile - OTA updates (JS/assets only)
cd mobile/
yarn ota                    # Deploy to preview
yarn ota:production        # Deploy to production

# Mobile - Native builds (for native code changes)
cd mobile/
eas build --platform ios --profile production
eas build --platform android --profile production

# Webapp - Build for production
cd webapp/
yarn build                 # Outputs to dist-web/
```

## Specialized Subagents

**CRITICAL:** Use specialized subagents for specific workflows. These agents enforce best practices and prevent mistakes.

### Available Subagents

Located in `.claude/agents/`:

#### **Feature Development**
- **Agent:** `feature-dev`
- **Use For:** ANY new feature addition to ZenFlo
- **Purpose:** Safely add experimental features using feature flag system
- **Mandatory:** NEVER add features manually - ALWAYS use this agent
- **What it handles:**
  - Settings schema updates
  - UI toggles in Settings → Features
  - Translations for all languages (en, es, pl, ru)
  - Feature code implementation
  - Safety checks and testing
  - Documentation updates

**How to invoke:**
```
Use the feature-dev agent to add [feature description]
```

#### **Deployment**
- **Agent:** `deploy-webapp` - Deploy webapp to NAS with Cloudflare Tunnel
- **Agent:** `deploy-mobile` - Deploy mobile OTA updates (preview or production)
- **Agent:** `deploy-backend` - Deploy backend to NAS with Docker rebuild

**How to invoke:**
```
Use deploy-webapp to deploy the webapp
Use deploy-mobile to deploy to production
```

**How to use subagents:**
```
Ask Claude Code to invoke a subagent:
"Use deploy-webapp to deploy the webapp"
"Use deploy-mobile to deploy to production"
"Use deploy-backend in local mode to test my changes"
```

Subagents will:
- ✅ Execute deployment scripts strictly
- ✅ Validate prerequisites
- ✅ Report detailed results
- ✅ Provide troubleshooting guidance
- ❌ Never modify source code
- ❌ Never skip validation steps

### Mobile App (iOS/Android)
**Location:** `mobile/`
**Platform:** EAS Build + OTA Updates
**Subagent:** `deploy-mobile`

**Automated deployment:**
```bash
cd mobile/
./deploy-ota.sh production   # Deploy OTA to production
./deploy-ota.sh preview      # Deploy OTA to preview
```

**Manual commands:**
- **OTA Updates:** `yarn ota:production` (JS/TS/assets only, ~5-10 min propagation)
- **Native Builds:** Merge to `main` → GitHub workflows trigger EAS builds
- **Manual Builds:** `eas build --platform ios --profile production`
- **Submission:** `eas submit --platform ios`

**Documentation:** `mobile/OTA-QUICKSTART.md`, `mobile/DEPLOYMENT.md`

### Webapp
**Location:** `webapp/`
**Platform:** NAS with Cloudflare Tunnel
**URL:** https://app.combinedmemory.com
**Subagent:** `deploy-webapp`

**Automated deployment:**
```bash
cd webapp/
./deploy.sh                  # Full deployment
./deploy.sh --skip-build     # Redeploy existing build
./deploy.sh --skip-cache     # Deploy without cache purge
```

**Infrastructure:**
- Container: `zenflo-webapp` (nginx:alpine)
- Port: 8080:80
- Served via Cloudflare Tunnel

**Documentation:** `webapp/DEPLOY.md`, `webapp/DEPLOY-QUICKREF.md`

### Backend
**Location:** Backend source is reference only
**Deployed On:** NAS at nas-1
**URL:** https://happy.combinedmemory.com
**Subagent:** `deploy-backend`

**GitHub Webhook Auto-Deployment (Recommended):**
```bash
# Just push to main - deployment happens automatically!
git push origin main
```

The GitHub webhook will:
1. Receive notification from GitHub
2. Pull latest changes
3. Install dependencies (if needed)
4. Rebuild Docker container
5. Verify deployment

**Monitor deployment:**
```bash
# Watch webhook logs
ssh nas@nas-1 "sudo journalctl -u github-webhook -f"

# Watch deployment logs
ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"
```

**Manual deployment script (fallback):**
```bash
cd backend/
./deploy.sh                     # Production (git mode)
./deploy.sh --mode local        # Development (local changes)
./deploy.sh --skip-install      # Skip npm install
./deploy.sh --branch develop    # Deploy specific branch
```

**SSH deployment (for debugging):**
```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo/backend'
git pull origin main
sudo docker compose up -d --build zenflo-server
sudo docker logs zenflo-server --tail 50
```

**Infrastructure:**
- Container: `zenflo-server`
- Port: 3000:3005
- Services: PostgreSQL, Redis, MinIO
- Webhook: `https://webhook.combinedmemory.com/github-webhook`

**Documentation:** `backend/DEPLOYMENT.md`, `WEBHOOK-SETUP.md`

### Deployment Best Practices

1. **Always use subagents** for deployments - they enforce best practices
2. **Always run typecheck** before deploying (scripts do this automatically)
3. **Test in development** before deploying to production
4. **Check documentation** if deployment fails (`**/DEPLOY*.md` files)
5. **Never skip validation** steps in deployment scripts

## Architecture Highlights

### Monorepo Patterns
- **Yarn Workspaces** for unified dependency management
- **Independent deployments** - each workspace deploys separately
- **No cross-workspace imports** - each workspace is self-contained
- **Shared conventions** - common patterns across mobile/webapp

### Platform-Specific Code Pattern

When features require different implementations for web vs native:

1. **File naming:**
   - Native (iOS/Android): `ComponentName.tsx`
   - Web: `ComponentName.web.tsx`

2. **Metro/Webpack automatically selects** the correct file based on platform

3. **Example:**
   ```
   sources/realtime/
   ├── RealtimeVoiceSession.tsx      # Native implementation
   └── RealtimeVoiceSession.web.tsx  # Web implementation
   ```

### Voice AI (ElevenLabs)

**Agent ID:** `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (hardcoded, same across all environments)

**Platform Differences:**
- **Native:** Uses `@elevenlabs/react-native` package
- **Web:** Uses `@elevenlabs/react` package with WebRTC connection type

**Implementation Files:**
- Native: `mobile/sources/realtime/RealtimeVoiceSession.tsx`
- Web: `webapp/sources/realtime/RealtimeVoiceSession.web.tsx`

**Voice Context Management:**
- Real-time context updates sent to Max (voice assistant) via WebSocket
- History window: Last 50 messages (use negative slice: `messages.slice(-50)`)
- Context formatters: `sources/realtime/hooks/contextFormatters.ts`
- Event hooks: `sources/realtime/hooks/voiceHooks.ts`

### Authentication
- **QR code-based** challenge-response authentication
- **No passwords** - uses public key cryptography (TweetNaCl)
- **End-to-end encryption** - server has zero knowledge of decrypted data

### Real-Time Sync
- **WebSocket** via Socket.io for real-time updates
- **Encrypted** data before transmission
- **State management** via custom reducer in `sources/sync/`

## Development Guidelines

### Code Style
- **4 spaces** for indentation (not 2)
- **TypeScript strict mode** - no untyped code
- **Functional components** with hooks (avoid classes)
- **Named exports** preferred over default exports
- **Path alias:** `@/` maps to `./sources/`

### File Organization
- ✅ Group by feature/module, use nested folders (max 3-4 levels)
- ✅ Platform-specific code uses `.web.tsx` suffix
- ❌ NO temp files in root
- ❌ NO test scripts outside of proper test files
- ❌ NEVER create documentation files unless explicitly requested

### Internationalization (i18n)

**CRITICAL: Always use `t()` for ALL user-visible strings**

```typescript
import { t } from '@/text';

// Simple usage
t('common.cancel')              // "Cancel"
t('settings.title')             // "Settings"

// With parameters
t('common.welcome', { name: 'Steve' })  // "Welcome, Steve!"

// When adding new strings:
// 1. Check if it exists in `common` first
// 2. Add to ALL language files (en, es, pl, ru)
// 3. Use descriptive key names like `newSession.machineOffline`
```

**Language Configuration:**
- Centralized in `sources/text/_all.ts`
- Supported: EN, ES, PL, RU
- Translation files: `sources/text/translations/[lang].ts`

### Styling with Unistyles

**Always use Unistyles for styling, NOT plain StyleSheet:**

```typescript
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: runtime.insets.top,
    }
}))

// Usage in component
<View style={styles.container}>
```

**Special Cases:**
- **Expo Image:** Size props (`width`, `height`) must be inline styles, not in stylesheet
- **tintColor:** Must be set directly on component, not in style prop

### Important Rules

1. **NEVER use Alert** from React Native - use `Modal` from `@/modal/` instead
2. **NEVER use TodoWrite** - use Zen Mode MCP (`mcp__zen-mode__*` tools) instead
3. **Always run `yarn typecheck`** after making changes
4. **Always apply layout width constraints** from `@/components/layout` to full-screen ScrollViews
5. **Store temp scripts** in `sources/trash/` folder
6. **Set screen parameters** in `_layout.tsx` when possible (avoids layout shifts)
7. **Use `useHappyAction`** from `@/hooks/useHappyAction.ts` for async operations (handles errors automatically)

### Custom Header Component

Use `NavigationHeader` from `@/components/Header` for consistent headers:

```tsx
import { NavigationHeader } from '@/components/Header';

<Stack
    screenOptions={{
        header: NavigationHeader,
        headerTitle: 'Settings',
        headerSubtitle: 'Manage preferences', // Custom extension
    }}
/>
```

### Hooks Pattern

For non-trivial hooks:
1. Create dedicated hook file in `hooks/` folder
2. Add JSDoc comment explaining logic
3. Place styles at end of component/page file
4. Always wrap pages in `memo`

### Web-Specific Notes

- **Primary target:** Modern browsers (Chrome, Safari, Firefox, Edge)
- **PWA support:** Install as app on desktop/mobile
- **WebRTC:** For low-latency voice (web only)
- **Performance:** Use React.lazy() for code splitting, React.memo() for expensive components

## Git Workflow

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
test: Adding tests
chore: Maintenance tasks
```

### Commit Messages

Always include ZenFlo branding in commit footer:

```
<main commit message>

Generated with [Claude Code](https://claude.ai/code)
via [ZenFlo](https://zenflo.app)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: ZenFlo <yesreply@zenflo.app>
```

### Branch Strategy
- **main** - Production branch (triggers auto-deploy for webapp)
- Feature branches: `feature/description`
- Push to `origin` (NEVER `upstream`)

## Key Files to Know

### Mobile/Webapp (Shared)
- `sources/sync/types.ts` - Core sync protocol types
- `sources/sync/reducer.ts` - State management for sync
- `sources/auth/AuthContext.tsx` - Authentication state
- `sources/app/_layout.tsx` - Root navigation structure
- `sources/realtime/RealtimeVoiceSession.tsx` - Voice AI (native)
- `sources/realtime/RealtimeVoiceSession.web.tsx` - Voice AI (web)
- `sources/realtime/hooks/voiceHooks.ts` - Voice context event handlers
- `sources/realtime/hooks/contextFormatters.ts` - Message formatting for Max
- `sources/text/index.ts` - i18n translation system
- `sources/text/_all.ts` - Language configuration

### Backend
- `sources/app/api/routes/` - API endpoints
- `sources/app/kv/` - Key-value storage (encrypted)
- `sources/app/session/` - Session management
- `sources/storage/db.ts` - Prisma client
- `prisma/schema.prisma` - Database schema

### CLI
- `src/claude/loop.ts` - Main control loop
- `src/claude/claudeSdk.ts` - SDK integration
- `src/api/apiSession.ts` - WebSocket session client
- `src/api/auth.ts` - Authentication flow

## Zen Mode MCP (Task Management)

**CRITICAL: Always use Zen Mode MCP for task management, NEVER TodoWrite**

At the start of every session:
1. `mcp__zen-mode__list_tasks` - See existing tasks
2. `mcp__zen-mode__create_task` - Create tasks for session
3. `mcp__zen-mode__update_task` - Update status as you work

**Available Tools:**
- `mcp__zen-mode__list_tasks` - List TODO and IN_PROGRESS tasks (paginated, 5 per page, filterable by project_path)
- `mcp__zen-mode__create_task` - Create new task
- `mcp__zen-mode__get_task` - Get task details
- `mcp__zen-mode__update_task` - Update status/priority/title/description/project context
- `mcp__zen-mode__delete_task` - Delete task

**Task Properties:**
- **Status:** TODO, IN_PROGRESS, DONE, CANCELLED
- **Priority:** LOW, MEDIUM, HIGH, URGENT
- **Fields:** title, description, createdAt, updatedAt, linkedSessions

**Backend:** Tasks sync to ZenFlo mobile app at `/zen` route via WebSocket real-time updates

## Troubleshooting

### Metro Bundler Issues
```bash
cd mobile/
yarn start -c  # Clear cache
```

### iOS Build Issues
```bash
cd mobile/
rm -rf ios && npx expo prebuild --platform ios
```

### Android Build Issues
```bash
cd mobile/android
./gradlew clean
```

### Webapp Deployment Issues
- Verify build ran successfully: `cd webapp && yarn build`
- Check deployment logs: `ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 100"`
- Verify Cloudflare Tunnel is running: `ssh nas@nas-1 "sudo docker ps | grep cloudflared"`
- Test locally before deploying: Check `webapp/DEPLOY.md` for troubleshooting

### Backend Changes Not Reflecting
```bash
ssh nas@nas-1
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'
sudo docker compose up -d --build zenflo-server
sudo docker logs zenflo-server --tail 100
```

### Type Errors
- Always run `yarn typecheck` after changes
- Check all workspaces: `yarn typecheck:all` from root
- Fix TypeScript errors before committing

## Additional Documentation

- **Mobile Development:** `mobile/README.md`, `mobile/CLAUDE.md`
- **Web Development:** `webapp/README.md`, `webapp/CLAUDE.md`
- **Backend Development:** `backend/README.md`, `backend/CLAUDE.md`
- **CLI Development:** `cli/README.md`, `cli/CLAUDE.md`
- **Monorepo Guide:** `MONOREPO.md`
- **Zen MCP Servers:** `zen-mcp/zen-mode-mcp-server/README.md`

## Important Reminders

1. **It's 2025, not 2024**
2. **You have FULL permission to SSH into servers** - ALWAYS do this when modifying backend code
3. **NEVER work around SSH access** - make changes directly on servers when needed
4. **Webapp and backend BOTH deploy on NAS** (NOT Railway)
5. **Always use Zen Mode MCP** for task management, never TodoWrite
6. **🚨 MANDATORY: Use feature-dev agent for ALL new features** - Never add features manually, always invoke the feature-dev agent
7. **Always run typecheck** before committing
8. **Use 4 spaces** for indentation
9. **Platform-specific code** uses `.web.tsx` suffix
10. **All user-facing strings** must use `t()` translation function
11. **Backend is deployed on NAS** - monorepo copy is reference only
12. Only launch production on xcode when local and eas when i ask if i am remote
13. claude-code-mcp has memory, meaning use multiple in parallel it help keep context low and continue working on main tasks
14. Always store important findings to memory with timestamp
- expo-dev
description: React Native Expo specialist. Use PROACTIVELY for all mobile app development, Expo Go testing, React Native components, and TypeScript mobile code. MUST BE USED when working with .tsx/.ts files in mobile projects.