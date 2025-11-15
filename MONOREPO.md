# ZenFlo Monorepo Documentation

## Structure

```
zenflo/
├── mobile/        # @zenflo/mobile - iOS/Android app (React Native + Expo)
├── webapp/        # @zenflo/webapp - Web interface (Expo Web)
├── backend/       # @zenflo/backend - API server (Fastify + PostgreSQL)
├── zen-mcp/       # Zen Mode MCP servers (3 variants)
└── experimental/  # New features (voice-agents, etc.)
```

## Workspace Commands

```bash
# Install all dependencies
yarn install

# Work with specific workspace
yarn workspace @zenflo/mobile <command>
yarn workspace @zenflo/webapp <command>
yarn workspace @zenflo/backend <command>

# Shortcuts (defined in root package.json)
yarn mobile <command>
yarn webapp <command>
yarn backend <command>

# Run commands across all workspaces
yarn build:all      # Build all projects
yarn test:all       # Test all projects
yarn typecheck:all  # Typecheck all projects
```

## Development

### Mobile App
```bash
cd mobile/
yarn start          # Start Expo dev server
yarn ios           # Run on iOS
yarn android       # Run on Android
yarn typecheck     # TypeScript check
```

### Webapp
```bash
cd webapp/
yarn start         # Start Expo web dev server
yarn web           # Same as above
yarn typecheck     # TypeScript check
```

### Backend
```bash
cd backend/
yarn dev           # Run development server
yarn build         # TypeScript compile check
yarn test          # Run tests
```

### Zen MCP Servers
```bash
cd zen-mcp/zen-mode-mcp-server/
npm run build      # Build MCP server
npm start          # Run MCP server
```

## Deployment

### Mobile App (iOS/Android)
**Location:** `mobile/`
**Platform:** EAS Build + OTA Updates

```bash
cd mobile/
yarn ota:production   # OTA update (JS/TS only)
eas build --profile production --platform ios    # Full build
eas submit --platform ios                        # Submit to App Store
```

**Auto-deployment:** None (manual trigger)

### Webapp
**Location:** `webapp/`
**Platform:** Railway
**URL:** https://app.zenflo.dev

```bash
cd webapp/
git push origin main   # Triggers Railway deployment
```

**Auto-deployment:** Yes (on push to main)

### Backend
**Location:** `backend/` (source code reference)
**Deployed on:** NAS at nas-1
**URL:** https://api.zenflo.dev
**WebSocket:** ws://api.zenflo.dev

```bash
# SSH to NAS
ssh nas@nas-1

# Navigate to deployed location
cd ~/developer/infrastructure/Happy\ Server/happy-server/

# Rebuild and restart
sudo docker compose up -d --build happy-server
```

**Note:** Backend code in monorepo is for reference. Actual deployment happens on NAS.

### Zen MCP Servers
**Location:** `zen-mcp/`
**Platform:** npm packages

```bash
# Publish to npm (if needed)
cd zen-mcp/zen-mode-mcp-server/
npm publish
```

## Migration Notes

### From Separate Repos to Monorepo (Nov 2025)

**Migrated repos:**
- `happy/happy-mobile` → `zenflo/mobile/`
- `happy/happy-webapp` → `zenflo/webapp/`
- `happy/zen-mode-mcp-server` → `zenflo/zen-mcp/zen-mode-mcp-server/`
- NAS `happy-server` → `zenflo/backend/` (copy for reference)

**Git history:** Preserved via subtree merge for mobile and webapp

**Package names updated:**
- `zenflo-mobile` → `@zenflo/mobile`
- `zenflo-webapp` → `@zenflo/webapp`
- `zenflo-server` → `@zenflo/backend`

### Why Monorepo?

✅ **Benefits:**
- Single `git clone` for entire project
- Unified versioning and releases
- Easier cross-project refactoring
- Shared dependencies via yarn workspaces
- Clear project organization
- Better coordination

✅ **Preserved:**
- Independent deployments
- Separate build processes
- Individual package.json files
- No forced coupling

## Architecture

### Mobile & Webapp
- Built with React Native + Expo
- Share Expo configuration
- Deploy independently (EAS vs Railway)
- Both connect to same backend

### Backend
- Fastify API server
- PostgreSQL + Redis + MinIO stack
- Docker deployment on NAS
- Serves both mobile and webapp

### Zen MCP
- Model Context Protocol servers
- Integrate with Claude Code
- Multiple deployment variants:
  - Standard (stdio)
  - HTTP server
  - Cloudflare Workers

## Common Tasks

### Add Dependency to Workspace
```bash
# Mobile
yarn workspace @zenflo/mobile add <package>

# Webapp
yarn workspace @zenflo/webapp add <package>

# Backend
yarn workspace @zenflo/backend add <package>
```

### Run TypeScript Check Across All
```bash
yarn typecheck:all
```

### Clean All node_modules
```bash
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
yarn install
```

### Update All Dependencies
```bash
yarn upgrade-interactive --latest
```

## Troubleshooting

**Issue:** Workspace not found
**Fix:** Run `yarn install` at root

**Issue:** "Workspaces can only be enabled in private projects"
**Fix:** Root package.json has `"private": true` - this is correct

**Issue:** Import paths broken
**Fix:** Each workspace is independent, no cross-workspace imports needed

**Issue:** Deployment fails
**Fix:** Check workspace-specific deployment docs above

## Links

- Mobile README: `mobile/README.md`
- Webapp README: `webapp/README.md`
- Backend README: `backend/README.md`
- Zen MCP README: `zen-mcp/zen-mode-mcp-server/README.md`
