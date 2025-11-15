# ZenFlo Domain Migration Checklist

**Date:** 2025-11-15 PST
**Migration:** combinedmemory.com → zenflo.dev
**Status:** 🟡 IN PROGRESS
**Monorepo:** ZenFlo (UI + server + cli + integrations)

---

## Table of Contents

1. [Overview](#overview)
2. [All Files Modified](#all-files-modified)
3. [Environment Variables](#environment-variables)
4. [External Services Reconfiguration](#external-services-reconfiguration)
5. [Testing Checklist](#testing-checklist)
6. [Deployment Order](#deployment-order)
7. [Rollback Plan](#rollback-plan)
8. [DNS & Cloudflare Verification](#dns--cloudflare-verification)
9. [Post-Migration Tasks](#post-migration-tasks)

---

## Overview

### Domain Changes

| Component | Old Domain | New Domain |
|-----------|-----------|------------|
| Backend API | `https://happy.combinedmemory.com` | `https://api.zenflo.dev` |
| Web App | `https://app.combinedmemory.com` | `https://app.zenflo.dev` |
| GitHub Webhook | N/A (Railway) | `https://webhook.zenflo.dev/github-webhook` |
| Zen MCP HTTP | N/A | `https://zenmcp.zenflo.dev` |

### Migration Strategy

- ✅ **Backward Compatibility:** Maintained for both old and new domains
- ✅ **Zero Downtime:** Both domains work simultaneously
- ✅ **Gradual Rollout:** Users can migrate at their own pace
- ⏳ **Deprecation Timeline:** Old domain support can be removed after full migration

### Key Changes

1. **Backend Server (NAS)**
   - CORS configuration updated to allow both domains
   - GitHub OAuth redirects point to new domain
   - WebSocket connections accept both origins

2. **Mobile/Web Apps (UI)**
   - Default server URL changed to `https://api.zenflo.dev`
   - Environment variable support for legacy server

3. **CLI**
   - Default server URL changed to `https://api.zenflo.dev`
   - Environment variable support for legacy server

4. **Infrastructure**
   - Webhook endpoint deployed: `https://webhook.zenflo.dev/github-webhook`
   - Auto-deployment configured for main branch pushes

---

## All Files Modified

### Backend (server/)

**Source Code:**
```
server/sources/app/api/
├── api.ts                      # CORS origins updated
├── socket.ts                   # WebSocket CORS updated
└── routes/connectRoutes.ts     # GitHub OAuth redirects updated
```

**Configuration:**
```
server/
├── .env.example                # NEW - Environment template with new domains
├── deploy.sh                   # Backend URL references updated
├── README.md                   # Documentation URLs updated
└── DEPLOY_QUICKREF.md         # Health check URLs updated
```

**Documentation:**
```
server/
├── DOMAIN-MIGRATION-2025-11-15.md   # Migration summary (server-specific)
└── verify-domain-migration.sh       # NEW - Migration verification script
```

### Frontend (UI/)

**Configuration:**
```
UI/
├── sources/sync/serverConfig.ts    # Default server URL updated
├── deploy-web.sh                   # Deployment script URLs updated
└── app.config.js                   # (May need update for web deployment)
```

**Documentation:**
```
UI/
├── DEPLOY-WEB.md              # Deployment URLs updated
├── DEPLOYMENT.md              # Documentation URLs updated
├── PRIVACY.md                 # References updated
├── RAILWAY_DEPLOYMENT.md      # Legacy Railway references updated
├── README.md                  # Main documentation URLs updated
├── README.SAFETY.md           # Safety documentation updated
└── TERMS.md                   # Terms of service updated
```

### CLI (cli/)

**Source Code:**
```
cli/src/
├── configuration.ts           # Default server URL updated
└── commands/connect.ts        # Server URL logic updated
```

**Documentation:**
```
cli/
├── CLAUDE.md                  # Development documentation updated
└── README.md                  # User documentation updated
```

### Integrations (integrations/)

**n8n Integration:**
```
integrations/n8n-nodes-zenflo/
├── package.json                                    # Package metadata updated
├── README.md                                       # Documentation updated
└── src/credentials/ZenFloApi.credentials.ts       # Default API URL updated
```

### Zen MCP Servers (zen-mcp/)

**Zen Mode MCP Server:**
```
zen-mcp/zen-mode-mcp-server/
└── README.md                  # Backend URL references updated
```

**Zen Mode MCP HTTP:**
```
zen-mcp/zen-mode-mcp-server-http/
└── README.md                  # Backend URL references updated
```

**Zen Mode MCP Cloudflare:**
```
zen-mcp/zen-mode-mcp-cloudflare/
├── README.md                  # Documentation updated
└── src/index.ts               # Backend URL updated
```

### VSCode Extension (vscode-extension/)

**Source Code:**
```
vscode-extension/
├── package.json                    # Package metadata updated
└── src/views/ChatViewProvider.ts   # ZenFlo branding updated
```

### Root Documentation

**Monorepo Documentation:**
```
.
├── CLAUDE.md                  # Main developer documentation updated
├── DEPLOYMENT.md              # Deployment guide updated
├── MONOREPO.md                # Monorepo structure updated
├── RAILWAY.md                 # Legacy Railway documentation updated
├── README.md                  # Main README updated
├── WEBHOOK-SETUP.md          # Webhook configuration updated
└── DOMAIN-MIGRATION-2025-11-15.md  # THIS FILE
```

**Deployment Agents:**
```
.claude/agents/
└── deploy-backend.md          # Deployment agent instructions updated
```

### Total Files Changed

- **Server:** 7 files
- **UI:** 11 files
- **CLI:** 4 files
- **Integrations:** 3 files
- **Zen MCP:** 4 files
- **VSCode Extension:** 2 files
- **Documentation:** 8 files
- **Total:** 39+ files across monorepo

---

## Environment Variables

### Backend (.env.production on NAS)

**Location:** `/home/nas/developer/infrastructure/Zenflo Server/zenflo/.env.production`

**Required Updates:**

```bash
# GitHub OAuth Configuration
GITHUB_REDIRECT_URL=https://api.zenflo.dev/v1/connect/github/callback

# CORS Origins (if explicitly configured)
# Note: Code now handles both domains automatically
ALLOWED_ORIGINS=https://app.zenflo.dev,https://api.zenflo.dev,https://app.combinedmemory.com,https://happy.combinedmemory.com

# Database (should remain unchanged)
DATABASE_URL=<your-postgresql-url>
REDIS_URL=<your-redis-url>

# Security (should remain unchanged)
JWT_SECRET=<your-jwt-secret>
ENCRYPTION_KEY=<your-encryption-key>
```

**Backward Compatibility:**
- Keep `EXPO_PUBLIC_HAPPY_SERVER_URL` for legacy support
- Add `EXPO_PUBLIC_ZENFLO_SERVER_URL` for new domain

### UI (React Native / Expo)

**For local development (.env.local):**
```bash
EXPO_PUBLIC_ZENFLO_SERVER_URL=https://api.zenflo.dev
EXPO_PUBLIC_ZENFLO_WEBAPP_URL=https://app.zenflo.dev

# Legacy support (optional)
EXPO_PUBLIC_HAPPY_SERVER_URL=https://happy.combinedmemory.com
```

**For production builds:**
- No environment variables needed - defaults to `api.zenflo.dev`
- Users can override via in-app settings (Settings → Developer → Server URL)

### CLI

**For local development (.env):**
```bash
ZENFLO_SERVER_URL=https://api.zenflo.dev
ZENFLO_WEBAPP_URL=https://app.zenflo.dev

# Legacy support (optional)
HAPPY_SERVER_URL=https://happy.combinedmemory.com
```

**For production:**
- No environment variables needed - defaults to `api.zenflo.dev`
- Users can override via CLI flags or environment

### n8n Integration

**Credential Configuration:**
```json
{
  "apiUrl": "https://api.zenflo.dev",
  "apiKey": "<your-api-key>"
}
```

**Note:** n8n credentials are user-configured, not environment-based.

### Zen MCP Servers

**Local MCP Configuration (~/.mcp.json or project .mcp.json):**

```json
{
  "mcpServers": {
    "zen-mode": {
      "command": "npx",
      "args": ["-y", "@zenflo/zen-mode-mcp-server"],
      "env": {
        "ZENFLO_API_URL": "https://api.zenflo.dev",
        "ZENFLO_USER_ID": "<your-user-id>",
        "ZENFLO_AUTH_TOKEN": "<your-auth-token>"
      }
    }
  }
}
```

---

## External Services Reconfiguration

### 1. GitHub OAuth App

**⚠️ CRITICAL - Must be updated before production deployment**

**Steps:**

1. Go to: https://github.com/settings/developers
2. Select your ZenFlo OAuth App (or create new one)
3. Update **Authorization callback URL** to:
   ```
   https://api.zenflo.dev/v1/connect/github/callback
   ```
4. Save changes
5. Copy Client ID and Client Secret
6. Update `.env.production` on NAS:
   ```bash
   GITHUB_CLIENT_ID=<your-client-id>
   GITHUB_CLIENT_SECRET=<your-client-secret>
   GITHUB_REDIRECT_URL=https://api.zenflo.dev/v1/connect/github/callback
   ```

**Testing OAuth Flow:**
1. Navigate to: https://app.zenflo.dev
2. Go to Settings → Integrations → Connect GitHub
3. Authorize on GitHub
4. Verify redirect back to app with success message
5. Check that GitHub connection appears in settings

**Rollback Plan:**
- Keep old OAuth app with `happy.combinedmemory.com` callback URL
- Switch back in `.env.production` if issues arise

### 2. GitHub Repository Webhook

**✅ ALREADY CONFIGURED**

**Current Configuration:**
- **Webhook ID:** 580316577
- **Payload URL:** `https://webhook.zenflo.dev/github-webhook`
- **Content Type:** `application/json`
- **Secret:** `zenflo-7b8b9ff97a77e0e1a66016b40c1ade51`
- **Events:** Push (filtered to main branch in webhook server)
- **Status:** Active

**Verification:**
1. Go to: https://github.com/quinnbmay/zenflo/settings/hooks/580316577
2. Check "Recent Deliveries" tab
3. Verify successful deliveries after push to main

**Testing:**
```bash
# Push to main and watch deployment
git push origin main

# Monitor webhook
ssh nas@nas-1 "sudo journalctl -u github-webhook -f"

# Monitor deployment
ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"
```

### 3. Cloudflare DNS

**Required DNS Records:**

| Subdomain | Type | Target | Proxy Status |
|-----------|------|--------|--------------|
| api | CNAME | Cloudflare Tunnel | Proxied |
| app | CNAME | Cloudflare Tunnel | Proxied |
| webhook | CNAME | Cloudflare Tunnel | Proxied |
| zenmcp | CNAME | Cloudflare Tunnel | Proxied |

**Cloudflare Tunnel Configuration:**

Tunnel: `happy-server` (or `nas-tunnel`)

**Public Hostnames:**
```
api.zenflo.dev → http://localhost:3000
app.zenflo.dev → http://localhost:3001
webhook.zenflo.dev → http://localhost:8877/github-webhook
zenmcp.zenflo.dev → http://localhost:3002 (if applicable)
```

**Verification Steps:** See [DNS & Cloudflare Verification](#dns--cloudflare-verification) section

### 4. ElevenLabs Conversational AI

**Agent Configuration:**
- **Agent ID:** `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (hardcoded, no changes needed)
- **Environment:** Production (same across all environments)

**No changes required** - Agent ID is hardcoded in source code.

### 5. Expo Application Services (EAS)

**Project Configuration:**
- **Project ID:** `c92795a3-d883-41c0-b761-3effaa823810`
- **Account:** `combinedmemory`
- **Updates URL:** `https://u.expo.dev/c92795a3-d883-41c0-b761-3effaa823810`

**No immediate changes required** - EAS configuration is project-based, not domain-based.

**Future consideration:**
- May want to update account name from `combinedmemory` to `zenflo` (requires Expo support)

### 6. Docker / NAS Infrastructure

**Docker Compose Configuration:**

Location: `/home/nas/developer/infrastructure/Zenflo Server/zenflo/docker-compose.yml`

**Services:**
- `zenflo-server` - Main backend (port 3000:3005)
- `postgres` - PostgreSQL database
- `redis` - Redis cache/pubsub
- `minio` - Object storage (if applicable)

**No configuration changes required** - Services are localhost-based.

**Verification:**
```bash
ssh nas@nas-1 "sudo docker ps | grep zenflo"
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 50"
```

### 7. Mobile App Store Listings (Future)

**Apple App Store:**
- Update app description with new domain references
- Update privacy policy URL: `https://zenflo.dev/privacy`
- Update terms of service URL: `https://zenflo.dev/terms`
- Update support URL: `https://zenflo.dev/support` (when available)

**Google Play Store:**
- Update app description with new domain references
- Update privacy policy URL: `https://zenflo.dev/privacy`
- Update terms of service URL: `https://zenflo.dev/terms`
- Update support URL: `https://zenflo.dev/support` (when available)

**Note:** Not critical for initial migration since mobile apps use configurable server URLs.

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] **1. TypeScript Compilation**
  ```bash
  cd /Users/quinnmay/developer/zenflo
  yarn typecheck:all
  ```

- [ ] **2. Backend Unit Tests** (if available)
  ```bash
  cd server/
  yarn test
  ```

- [ ] **3. Frontend Unit Tests** (if available)
  ```bash
  cd UI/
  yarn test
  ```

### Backend API Testing

- [ ] **1. Health Checks - New Domain**
  ```bash
  # Primary health check
  curl https://api.zenflo.dev/health
  # Expected: {"status":"ok"}

  # Auth health check
  curl https://api.zenflo.dev/v1/auth/health
  # Expected: {"status":"ok"}
  ```

- [ ] **2. Health Checks - Legacy Domain (Backward Compatibility)**
  ```bash
  curl https://happy.combinedmemory.com/health
  curl https://happy.combinedmemory.com/v1/auth/health
  # Both should return {"status":"ok"}
  ```

- [ ] **3. CORS Testing - New Domain**
  ```bash
  curl -H "Origin: https://app.zenflo.dev" \
       -H "Access-Control-Request-Method: POST" \
       -H "Access-Control-Request-Headers: Content-Type" \
       -X OPTIONS \
       https://api.zenflo.dev/v1/auth/request
  # Expected: Access-Control-Allow-Origin: https://app.zenflo.dev
  ```

- [ ] **4. CORS Testing - Legacy Domain**
  ```bash
  curl -H "Origin: https://app.combinedmemory.com" \
       -H "Access-Control-Request-Method: POST" \
       -H "Access-Control-Request-Headers: Content-Type" \
       -X OPTIONS \
       https://api.zenflo.dev/v1/auth/request
  # Expected: Access-Control-Allow-Origin: https://app.combinedmemory.com
  ```

- [ ] **5. WebSocket Connection - New Domain**
  - Open browser console at `https://app.zenflo.dev`
  - Check WebSocket connection establishes successfully
  - Verify real-time updates work

- [ ] **6. WebSocket Connection - Legacy Domain**
  - Open browser console at `https://app.combinedmemory.com`
  - Check WebSocket connection establishes successfully
  - Verify real-time updates work

### GitHub OAuth Flow Testing

- [ ] **1. OAuth Flow - New Domain**
  1. Navigate to: https://app.zenflo.dev
  2. Go to Settings → Integrations → Connect GitHub
  3. Click "Authorize"
  4. Complete GitHub authorization
  5. Verify redirect to `https://app.zenflo.dev` with success
  6. Check GitHub connection shows in settings

- [ ] **2. OAuth Callback Endpoint**
  ```bash
  # Verify endpoint is accessible
  curl -I https://api.zenflo.dev/v1/connect/github/callback
  # Expected: 302 or 400 (requires valid OAuth state)
  ```

- [ ] **3. GitHub Repositories Listing**
  - After connecting GitHub, navigate to integrations
  - Verify repositories list loads correctly
  - Test repository selection/linking

### Web App Testing

- [ ] **1. Web App Loads - New Domain**
  - Navigate to: https://app.zenflo.dev
  - Verify app loads without errors
  - Check browser console for errors

- [ ] **2. Web App Loads - Legacy Domain**
  - Navigate to: https://app.combinedmemory.com
  - Verify app still loads
  - Check for deprecation notices (if implemented)

- [ ] **3. Authentication Flow**
  1. Open mobile app
  2. Scan QR code from web app
  3. Verify successful authentication
  4. Check session synchronization

- [ ] **4. Real-Time Sync**
  - Create new session on mobile
  - Verify it appears on web app within 1-2 seconds
  - Send message on web app
  - Verify it appears on mobile within 1-2 seconds

- [ ] **5. Voice Agent (Web)**
  - Navigate to session
  - Click voice button
  - Grant microphone permissions
  - Verify ElevenLabs agent connects
  - Test voice interaction

### Mobile App Testing

- [ ] **1. iOS App - Default Server**
  - Fresh install (or clear app data)
  - Verify connects to `https://api.zenflo.dev` by default
  - Check Settings → Developer → Server URL shows correct default

- [ ] **2. Android App - Default Server**
  - Fresh install (or clear app data)
  - Verify connects to `https://api.zenflo.dev` by default
  - Check Settings → Developer → Server URL shows correct default

- [ ] **3. Custom Server URL (Legacy Support)**
  - Go to Settings → Developer → Server URL
  - Enter: `https://happy.combinedmemory.com`
  - Verify connection works
  - Test authentication and sync

- [ ] **4. Voice Agent (Native)**
  - Navigate to session
  - Click voice button
  - Grant microphone permissions (if needed)
  - Verify ElevenLabs agent connects
  - Test voice interaction

- [ ] **5. OTA Update Delivery**
  - Deploy OTA update: `yarn ota:production`
  - Open mobile app
  - Verify update downloads and applies
  - Check app version in Settings → About

### CLI Testing

- [ ] **1. CLI - Default Server**
  ```bash
  # Fresh installation
  npm install -g @zenflo/cli

  # Check default server
  zenflo connect
  # Should attempt connection to https://api.zenflo.dev
  ```

- [ ] **2. CLI - Custom Server (Legacy Support)**
  ```bash
  export ZENFLO_SERVER_URL=https://happy.combinedmemory.com
  zenflo connect
  # Should connect to legacy server
  ```

- [ ] **3. CLI - Session Creation**
  ```bash
  zenflo start
  # Verify new session creates successfully
  # Check session appears in mobile/web app
  ```

- [ ] **4. CLI - Machine Registration**
  ```bash
  # Check machine appears in Settings → Machines
  # Verify online/offline status updates
  ```

### Webhook & Auto-Deployment Testing

- [ ] **1. Webhook Endpoint Accessibility**
  ```bash
  # Should be blocked without valid signature
  curl -X POST https://webhook.zenflo.dev/github-webhook
  # Expected: 403 Forbidden or signature error
  ```

- [ ] **2. Push to Main - Auto Deploy**
  ```bash
  # Make trivial change
  echo "# Test" >> README.md
  git add README.md
  git commit -m "test: Webhook auto-deployment"
  git push origin main

  # Monitor deployment
  ssh nas@nas-1 "sudo journalctl -u github-webhook -f"
  ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"
  ```

- [ ] **3. Verify Deployment Success**
  ```bash
  # Check container restarted
  ssh nas@nas-1 "sudo docker ps | grep zenflo-server"

  # Check logs for startup
  ssh nas@nas-1 "sudo docker logs zenflo-server --tail 50"

  # Verify health check
  curl https://api.zenflo.dev/health
  ```

### Integration Testing

- [ ] **1. n8n Integration**
  - Install n8n node: `npm install n8n-nodes-zenflo`
  - Create ZenFlo credential with `https://api.zenflo.dev`
  - Test connection
  - Run sample workflow

- [ ] **2. Zen Mode MCP**
  ```bash
  # Update MCP configuration
  # Create test task
  mcp__zen-mode__create_task

  # Verify task appears in mobile app at /zen route
  ```

- [ ] **3. VSCode Extension**
  - Install extension
  - Open Chat panel
  - Type `@zenflo`
  - Test AI interaction
  - Verify branding shows "ZenFlo" not "Happy"

### Performance Testing

- [ ] **1. API Response Times**
  ```bash
  # Measure latency
  for i in {1..10}; do
    time curl -s https://api.zenflo.dev/health > /dev/null
  done
  # Should be < 200ms average
  ```

- [ ] **2. WebSocket Latency**
  - Send message on mobile
  - Measure time until appears on web
  - Should be < 500ms

- [ ] **3. Large Message Sync**
  - Create session with 100+ messages
  - Verify sync completes without timeout
  - Check memory usage remains stable

### Security Testing

- [ ] **1. HTTPS Enforcement**
  ```bash
  # HTTP should redirect to HTTPS
  curl -I http://api.zenflo.dev/health
  # Expected: 301 or 308 redirect to https://
  ```

- [ ] **2. CORS Restrictions**
  ```bash
  # Random origin should be rejected
  curl -H "Origin: https://evil.com" \
       -H "Access-Control-Request-Method: POST" \
       -X OPTIONS \
       https://api.zenflo.dev/v1/auth/request
  # Expected: No Access-Control-Allow-Origin header
  ```

- [ ] **3. Webhook Signature Validation**
  ```bash
  # Invalid signature should be rejected
  curl -X POST https://webhook.zenflo.dev/github-webhook \
       -H "X-Hub-Signature-256: sha256=invalid" \
       -d '{"ref":"refs/heads/main"}'
  # Expected: 403 Forbidden
  ```

---

## Deployment Order

**⚠️ CRITICAL:** Follow this exact order to ensure zero downtime and prevent issues.

### Phase 1: Pre-Deployment Preparation

**Timeline:** Before any deployment

1. **Backup Current State**
   ```bash
   ssh nas@nas-1
   cd 'developer/infrastructure/Zenflo Server/zenflo'

   # Backup current git state
   git log -1 --oneline > /tmp/pre-migration-commit.txt

   # Backup environment files
   cp .env.production .env.production.backup

   # Backup database (if applicable)
   # sudo docker exec zenflo-postgres pg_dump -U postgres zenflo > /tmp/zenflo-db-backup.sql
   ```

2. **Verify DNS Propagation**
   ```bash
   # Check DNS records are live
   dig +short api.zenflo.dev
   dig +short app.zenflo.dev
   dig +short webhook.zenflo.dev

   # Should resolve to Cloudflare IPs
   ```

3. **Verify Cloudflare Tunnel**
   ```bash
   ssh nas@nas-1 "sudo systemctl status cloudflared"
   # Should be active and running
   ```

4. **Test Webhook Endpoint**
   ```bash
   ssh nas@nas-1 "sudo systemctl status github-webhook"
   # Should be active and running
   ```

### Phase 2: Backend Deployment

**Timeline:** Day 1, during low-traffic hours (e.g., 2-4 AM PST)

1. **Update Backend Environment Variables**
   ```bash
   ssh nas@nas-1
   cd 'developer/infrastructure/Zenflo Server/zenflo'

   # Edit .env.production
   nano .env.production

   # Add/update these variables:
   # GITHUB_REDIRECT_URL=https://api.zenflo.dev/v1/connect/github/callback
   # ALLOWED_ORIGINS=https://app.zenflo.dev,https://api.zenflo.dev,https://app.combinedmemory.com,https://happy.combinedmemory.com
   ```

2. **Deploy Backend Code**
   ```bash
   # Option A: Auto-deploy via webhook (recommended)
   # From local machine:
   cd /Users/quinnmay/developer/zenflo
   git push origin main
   # Watch deployment:
   ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"

   # Option B: Manual deploy
   cd /Users/quinnmay/developer/zenflo/server
   ./deploy.sh
   ```

3. **Verify Backend Deployment**
   ```bash
   # Check container status
   ssh nas@nas-1 "sudo docker ps | grep zenflo-server"

   # Check logs for errors
   ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100"

   # Test health endpoints
   curl https://api.zenflo.dev/health
   curl https://happy.combinedmemory.com/health  # Legacy support
   ```

4. **Test CORS Configuration**
   ```bash
   # New domain
   curl -H "Origin: https://app.zenflo.dev" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://api.zenflo.dev/v1/auth/request

   # Legacy domain
   curl -H "Origin: https://app.combinedmemory.com" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://api.zenflo.dev/v1/auth/request
   ```

### Phase 3: Web App Deployment

**Timeline:** Day 1, immediately after backend deployment

1. **Build Web App**
   ```bash
   cd /Users/quinnmay/developer/zenflo/UI

   # Ensure dependencies are installed
   yarn install

   # Run type check
   yarn typecheck

   # Build for web
   yarn web:build
   ```

2. **Deploy Web App**
   ```bash
   # From UI directory
   ./deploy-web.sh

   # OR via GitHub Actions (if configured)
   # Push changes to main branch with UI/** changes
   # GitHub Actions will auto-deploy
   ```

3. **Verify Web Deployment**
   ```bash
   # Test new domain
   curl -I https://app.zenflo.dev
   # Should return 200 OK

   # Test legacy domain (if still hosted)
   curl -I https://app.combinedmemory.com
   ```

4. **Test Web App Functionality**
   - Open: https://app.zenflo.dev
   - Check browser console for errors
   - Verify assets load (images, fonts, etc.)
   - Test authentication flow

### Phase 4: Mobile App Updates

**Timeline:** Day 2-3, after backend and web are stable

1. **Update OTA for Production**
   ```bash
   cd /Users/quinnmay/developer/zenflo/UI

   # Update changelog first (MANDATORY)
   # Edit sources/changelog/changelog.json
   # Add new version entry describing domain migration

   # Deploy OTA update
   yarn ota:production
   ```

2. **Monitor OTA Adoption**
   ```bash
   # Check Expo dashboard
   # https://expo.dev/accounts/combinedmemory/projects/zenflo/updates

   # Monitor user sessions with new domain
   ssh nas@nas-1 "sudo docker logs zenflo-server -f | grep 'api.zenflo.dev'"
   ```

3. **Native Builds (If Needed)**
   ```bash
   # Only if native code changed
   cd /Users/quinnmay/developer/zenflo/UI

   # iOS
   eas build --platform ios --profile production

   # Android
   eas build --platform android --profile production
   ```

### Phase 5: External Services Configuration

**Timeline:** Day 1-2, can be done in parallel with backend deployment

1. **Update GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Update Authorization callback URL
   - Save changes
   - ✅ Verify in [External Services](#external-services-reconfiguration) section

2. **Verify Webhook Configuration**
   - Check: https://github.com/quinnbmay/zenflo/settings/hooks/580316577
   - Verify "Recent Deliveries" show success
   - Test by pushing trivial commit to main

3. **Update DNS/Cloudflare (If Not Already Done)**
   - See [DNS & Cloudflare Verification](#dns--cloudflare-verification)
   - Verify all hostnames resolve correctly

### Phase 6: CLI Update

**Timeline:** Day 3-5, after mobile apps are updated

1. **Publish CLI Update**
   ```bash
   cd /Users/quinnmay/developer/zenflo/cli

   # Bump version
   npm version patch  # or minor/major

   # Publish to npm
   npm publish
   ```

2. **Notify Users**
   - Post update announcement in documentation
   - Email active CLI users (if list available)
   - Update getting started guide

### Phase 7: Integration Updates

**Timeline:** Day 5-7, after core services are stable

1. **Update n8n Node Package**
   ```bash
   cd /Users/quinnmay/developer/zenflo/integrations/n8n-nodes-zenflo

   # Bump version
   npm version patch

   # Publish to npm
   npm publish
   ```

2. **Update Zen MCP Servers**
   ```bash
   # If published to npm
   cd /Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-server
   npm version patch
   npm publish
   ```

3. **Update VSCode Extension**
   ```bash
   cd /Users/quinnmay/developer/zenflo/vscode-extension

   # Bump version
   npm version patch

   # Package
   vsce package

   # Publish
   vsce publish
   ```

### Phase 8: Documentation Updates

**Timeline:** Throughout all phases

1. **Update Internal Documentation**
   - ✅ CLAUDE.md files (already done)
   - ✅ README.md files (already done)
   - ✅ DEPLOYMENT.md files (already done)

2. **Update External Documentation**
   - Update website docs (if applicable)
   - Update blog posts with references
   - Update video tutorials

3. **Create Migration Guide**
   - Document for users how to switch servers
   - Provide troubleshooting steps
   - Link to support resources

### Phase 9: Monitoring & Verification

**Timeline:** Days 1-14 (continuous)

1. **Monitor Logs Daily**
   ```bash
   # Backend logs
   ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100 | grep -i error"

   # Webhook logs
   ssh nas@nas-1 "sudo journalctl -u github-webhook -n 100"

   # Deployment logs
   ssh nas@nas-1 "tail -100 /home/nas/logs/deploy-backend.log"
   ```

2. **Check Metrics**
   - API response times
   - Error rates
   - User adoption of new domain
   - Webhook success rate

3. **User Feedback**
   - Monitor support channels
   - Check for error reports
   - Track migration issues

### Phase 10: Legacy Domain Deprecation (Future)

**Timeline:** 30-90 days after migration

1. **Announce Deprecation**
   - In-app notification
   - Email to users
   - Blog post/changelog

2. **Grace Period**
   - Keep both domains working for 30-60 days
   - Remind users to update bookmarks/configs

3. **Remove Legacy Support**
   ```bash
   # Remove from CORS origins
   # Remove from environment configs
   # Remove from documentation
   # Update DNS to redirect
   ```

---

## Rollback Plan

**⚠️ CRITICAL:** If any issues arise during or after deployment, follow these steps immediately.

### When to Rollback

Trigger rollback if:
- API error rate > 5% after deployment
- Critical authentication failures
- WebSocket connections failing for most users
- GitHub OAuth completely broken
- Data corruption or loss detected

### Rollback Decision Matrix

| Issue Severity | Action | Timeline |
|---------------|--------|----------|
| Critical (service down) | Immediate rollback | < 5 minutes |
| High (major feature broken) | Rollback within 30 minutes | < 30 minutes |
| Medium (some features broken) | Attempt fix first, rollback if no fix in 2 hours | < 2 hours |
| Low (minor issues) | Schedule fix, no rollback | Next deployment |

### Backend Rollback

**Fast Rollback (Recommended):**

```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo/server'

# Find commit before migration
git log --oneline -10
# Example output:
# 222e44c chore: Update deployment scripts to use zenflo.dev domain
# 0cdaf4a fix: Use ephemeral key encryption format matching mobile app
# e51d268 fix(web): Update deploy script to use tar over SSH

# Rollback to previous commit
git checkout 0cdaf4a  # Replace with actual pre-migration commit

# Rebuild container
sudo docker compose up -d --build zenflo-server

# Verify rollback
sudo docker logs zenflo-server --tail 50

# Test health check
curl https://happy.combinedmemory.com/health
```

**Environment Variables Rollback:**

```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo'

# Restore backup
cp .env.production.backup .env.production

# Restart container
sudo docker compose restart zenflo-server
```

**Complete Rebuild Rollback (If Needed):**

```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo/server'

# Clean everything
sudo docker compose down
sudo docker system prune -af

# Checkout previous commit
git checkout 0cdaf4a

# Rebuild from scratch
sudo docker compose up -d --build

# Monitor startup
sudo docker logs zenflo-server -f
```

### Web App Rollback

**If using GitHub Actions auto-deploy:**

```bash
cd /Users/quinnmay/developer/zenflo
git revert <migration-commit-hash>
git push origin main

# GitHub Actions will auto-deploy old version
```

**If using manual deployment script:**

```bash
cd /Users/quinnmay/developer/zenflo
git checkout <pre-migration-commit>

cd UI/
./deploy-web.sh
```

### Mobile App Rollback

**OTA Rollback (Fastest):**

```bash
cd /Users/quinnmay/developer/zenflo/UI

# Checkout previous version
git checkout <pre-migration-commit>

# Rebuild changelog
npx tsx sources/scripts/parseChangelog.ts

# Deploy previous version as OTA
yarn ota:production
```

**Note:** Users may need to force-close and reopen app to receive rollback update.

### CLI Rollback

**Unpublish Bad Version (If Published):**

```bash
cd /Users/quinnmay/developer/zenflo/cli

# Deprecate bad version
npm deprecate @zenflo/cli@<bad-version> "This version has issues, please upgrade"

# Publish fixed version
npm version patch
npm publish
```

**User Workaround:**

Users can downgrade manually:
```bash
npm install -g @zenflo/cli@<previous-good-version>
```

### GitHub OAuth Rollback

**Fastest Recovery:**

1. Go to: https://github.com/settings/developers
2. Update Authorization callback URL back to:
   ```
   https://happy.combinedmemory.com/v1/connect/github/callback
   ```
3. Update `.env.production` on NAS:
   ```bash
   ssh nas@nas-1
   cd 'developer/infrastructure/Zenflo Server/zenflo'
   nano .env.production
   # Change:
   GITHUB_REDIRECT_URL=https://happy.combinedmemory.com/v1/connect/github/callback
   ```
4. Restart backend:
   ```bash
   sudo docker compose restart zenflo-server
   ```

### DNS Rollback

**If DNS causes issues:**

Option 1: Keep new DNS, rollback code to use old domains
Option 2: Update Cloudflare Tunnel to point to old endpoints

**Not recommended:** Deleting DNS records (causes downtime)

### Post-Rollback Verification

After rollback, verify:

```bash
# 1. Health checks work
curl https://happy.combinedmemory.com/health
curl https://happy.combinedmemory.com/v1/auth/health

# 2. CORS works
curl -H "Origin: https://app.combinedmemory.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://happy.combinedmemory.com/v1/auth/request

# 3. Container is running
ssh nas@nas-1 "sudo docker ps | grep zenflo-server"

# 4. No errors in logs
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100 | grep -i error"

# 5. Web app loads
curl -I https://app.combinedmemory.com

# 6. GitHub OAuth works
# Test manually by connecting GitHub account
```

### Post-Rollback Actions

1. **Notify Users**
   - Post status update
   - Explain what happened
   - Provide timeline for fix

2. **Investigate Root Cause**
   - Review logs
   - Identify what went wrong
   - Document findings

3. **Plan Fix**
   - Create action items
   - Test fix in development
   - Plan next deployment attempt

4. **Update Runbook**
   - Add learnings to this document
   - Improve rollback procedures
   - Update testing checklist

---

## DNS & Cloudflare Verification

### DNS Records Verification

**Check DNS propagation:**

```bash
# Check from your local machine
dig +short api.zenflo.dev
dig +short app.zenflo.dev
dig +short webhook.zenflo.dev

# Check from multiple locations
# Use: https://www.whatsmydns.net
# Enter: api.zenflo.dev, app.zenflo.dev, webhook.zenflo.dev
# Verify global propagation
```

**Expected Results:**

All domains should resolve to Cloudflare IPs (104.x.x.x or 172.x.x.x ranges).

**If DNS not resolving:**

1. Go to: https://dash.cloudflare.com
2. Select `zenflo.dev` domain
3. Navigate to DNS → Records
4. Verify CNAME records exist:
   ```
   api.zenflo.dev → <cloudflare-tunnel-id>.cfargotunnel.com
   app.zenflo.dev → <cloudflare-tunnel-id>.cfargotunnel.com
   webhook.zenflo.dev → <cloudflare-tunnel-id>.cfargotunnel.com
   ```
5. Ensure "Proxy status" is enabled (orange cloud)

### Cloudflare Tunnel Verification

**Check tunnel status:**

```bash
ssh nas@nas-1 "sudo systemctl status cloudflared"
```

**Expected output:**
```
● cloudflared.service - Cloudflare Tunnel
   Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
   Active: active (running) since ...
```

**Check tunnel configuration:**

```bash
ssh nas@nas-1 "cat /etc/cloudflared/config.yml"
```

**Expected configuration:**

```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: api.zenflo.dev
    service: http://localhost:3000
  - hostname: app.zenflo.dev
    service: http://localhost:3001
  - hostname: webhook.zenflo.dev
    service: http://localhost:8877
    path: /github-webhook
  - service: http_status:404
```

**Verify tunnel in Cloudflare Dashboard:**

1. Go to: https://dash.cloudflare.com
2. Navigate to: Zero Trust → Access → Tunnels
3. Find your tunnel (e.g., `happy-server` or `nas-tunnel`)
4. Check Status: Should be "Healthy" with green indicator
5. Click on tunnel name
6. Verify Public Hostnames:
   ```
   api.zenflo.dev → http://localhost:3000
   app.zenflo.dev → http://localhost:3001
   webhook.zenflo.dev → http://localhost:8877 (path: /github-webhook)
   ```

**Test tunnel connectivity:**

```bash
# Test each endpoint
curl -I https://api.zenflo.dev/health
curl -I https://app.zenflo.dev
curl -X POST https://webhook.zenflo.dev/github-webhook
```

**If tunnel not working:**

```bash
# Restart Cloudflare tunnel
ssh nas@nas-1 "sudo systemctl restart cloudflared"

# Check logs
ssh nas@nas-1 "sudo journalctl -u cloudflared -n 100"

# Verify tunnel authentication
ssh nas@nas-1 "cloudflared tunnel list"
```

### SSL/TLS Verification

**Check SSL certificates:**

```bash
# Check certificate details
openssl s_client -connect api.zenflo.dev:443 -servername api.zenflo.dev < /dev/null

# Check expiration
echo | openssl s_client -connect api.zenflo.dev:443 -servername api.zenflo.dev 2>/dev/null | openssl x509 -noout -dates
```

**Expected:**
- Issuer: Cloudflare
- Valid for: zenflo.dev and *.zenflo.dev
- Not expired

**Verify HTTPS enforcement:**

```bash
# HTTP should redirect to HTTPS
curl -I http://api.zenflo.dev
# Expected: 301 or 308 redirect to https://api.zenflo.dev
```

**In Cloudflare Dashboard:**

1. Go to: SSL/TLS → Overview
2. Verify mode is set to: "Full (strict)" or "Full"
3. Go to: SSL/TLS → Edge Certificates
4. Verify "Always Use HTTPS" is enabled

### Firewall & Security Verification

**Check Cloudflare Firewall Rules:**

1. Go to: Security → WAF
2. Review firewall rules
3. Ensure no rules blocking legitimate traffic
4. Check "Events" tab for blocked requests

**Verify Rate Limiting:**

1. Go to: Security → Rate Limiting
2. Review rate limiting rules
3. Ensure webhook endpoint has appropriate limits

**Check IP Access Rules:**

1. Go to: Security → WAF → Tools
2. Review IP Access Rules
3. Ensure NAS IP not blocked

### Performance Verification

**Test response times:**

```bash
# Measure latency to API
for i in {1..10}; do
  time curl -s https://api.zenflo.dev/health > /dev/null
done

# Measure latency to web app
for i in {1..10}; do
  time curl -s https://app.zenflo.dev > /dev/null
done
```

**Expected:**
- API: < 200ms average
- Web app: < 500ms average

**Check Cloudflare Analytics:**

1. Go to: Analytics & Logs → Traffic
2. Review request patterns
3. Check for anomalies or errors
4. Monitor bandwidth usage

### Troubleshooting Common Issues

**Issue: DNS not resolving**
```bash
# Check nameservers
dig NS zenflo.dev
# Should point to Cloudflare nameservers (e.g., ns1.cloudflare.com)
```

**Issue: Tunnel shows as unhealthy**
```bash
# Check tunnel connectivity
ssh nas@nas-1 "cloudflared tunnel info <tunnel-id>"

# Check if services are running
ssh nas@nas-1 "sudo docker ps"
ssh nas@nas-1 "sudo netstat -tlnp | grep -E '(3000|3001|8877)'"
```

**Issue: 502 Bad Gateway**
- Verify backend service is running: `sudo docker ps`
- Check backend logs: `sudo docker logs zenflo-server`
- Verify port mapping in tunnel config

**Issue: 403 Forbidden**
- Check Cloudflare WAF rules
- Verify Cloudflare Access policies
- Check IP Access Rules

---

## Post-Migration Tasks

### Immediate (Days 1-7)

- [ ] **Monitor Error Rates**
  - Check backend logs daily
  - Review Cloudflare Analytics
  - Track user-reported issues

- [ ] **Update Documentation Website** (if applicable)
  - Update all domain references
  - Update API documentation
  - Update getting started guides

- [ ] **Notify Users**
  - In-app notification about domain change
  - Email announcement (if list available)
  - Blog post/changelog entry

- [ ] **Update Social Media**
  - Update bio links to new domain
  - Update pinned posts with new links
  - Update profile descriptions

### Short-term (Days 8-30)

- [ ] **Monitor Adoption**
  - Track % of users on new domain
  - Track % of users on legacy domain
  - Identify holdouts

- [ ] **Optimize Performance**
  - Review response times
  - Optimize slow endpoints
  - Cache static assets

- [ ] **Update External Links**
  - GitHub repository description
  - npm package homepages
  - Integration documentation
  - Partner integrations

- [ ] **Security Audit**
  - Review Cloudflare security settings
  - Check for vulnerabilities
  - Update security documentation

### Medium-term (Days 31-90)

- [ ] **Plan Legacy Domain Deprecation**
  - Set deprecation date (e.g., 90 days after migration)
  - Draft deprecation announcement
  - Plan redirect strategy

- [ ] **Update Marketing Materials**
  - Website updates
  - Presentation decks
  - Demo videos
  - Screenshots

- [ ] **Update App Store Listings**
  - iOS App Store description
  - Google Play Store description
  - Privacy policy URLs
  - Support URLs

- [ ] **Clean Up Code**
  - Remove legacy domain fallbacks (after grace period)
  - Remove backward compatibility code
  - Update tests

### Long-term (Days 91+)

- [ ] **Remove Legacy Domain Support**
  - Remove from CORS origins
  - Remove from environment configs
  - Remove from documentation
  - Set up permanent redirects

- [ ] **DNS Cleanup**
  - Redirect old domains to new (301)
  - Update DNS records
  - Remove unused subdomains

- [ ] **Archive Old Infrastructure**
  - Document legacy setup
  - Archive old deployment scripts
  - Remove obsolete services

- [ ] **Review Lessons Learned**
  - What went well?
  - What could be improved?
  - Update runbooks
  - Improve deployment processes

### Continuous

- [ ] **Monitor Metrics**
  - API uptime
  - Response times
  - Error rates
  - User satisfaction

- [ ] **Track Technical Debt**
  - Identify areas for improvement
  - Plan refactoring sprints
  - Update architecture docs

- [ ] **Keep Documentation Updated**
  - As features change
  - As infrastructure evolves
  - As best practices emerge

---

## Migration Timeline Summary

| Phase | Timeline | Critical Actions | Rollback Available |
|-------|----------|------------------|-------------------|
| Pre-Deployment | Day 0 | Backup, DNS verification | N/A |
| Backend Deploy | Day 1 (2-4 AM) | Deploy code, update env vars | ✅ Yes (< 5 min) |
| Web Deploy | Day 1 (after backend) | Build and deploy web app | ✅ Yes (< 10 min) |
| Mobile OTA | Day 2-3 | Deploy OTA update | ✅ Yes (< 30 min) |
| External Services | Day 1-2 | GitHub OAuth, DNS | ✅ Yes (< 15 min) |
| CLI Update | Day 3-5 | Publish to npm | ✅ Yes (deprecate) |
| Integrations | Day 5-7 | n8n, MCP, VSCode | ✅ Yes (republish) |
| Monitoring | Day 1-14 | Continuous monitoring | N/A |
| Deprecation | Day 30-90 | Remove legacy support | ⚠️ No (one-way) |

---

## Support & Troubleshooting

### Key Log Locations

**On NAS:**
```
/home/nas/logs/deploy-backend.log          # Deployment logs
sudo journalctl -u github-webhook          # Webhook logs
sudo journalctl -u cloudflared             # Tunnel logs
sudo docker logs zenflo-server             # Backend logs
```

**Locally:**
```
~/.zenflo/logs/                            # CLI logs
```

### Common Issues & Solutions

**Issue: Backend not responding after deployment**
```bash
# Solution 1: Check container status
ssh nas@nas-1 "sudo docker ps | grep zenflo"

# Solution 2: Restart container
ssh nas@nas-1 "sudo docker compose -f 'developer/infrastructure/Zenflo Server/zenflo/docker-compose.yml' restart zenflo-server"

# Solution 3: Check logs for startup errors
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100"
```

**Issue: CORS errors in web app**
```bash
# Verify CORS origins in backend
ssh nas@nas-1 "cat 'developer/infrastructure/Zenflo Server/zenflo/.env.production' | grep ALLOWED_ORIGINS"

# Test CORS manually
curl -H "Origin: https://app.zenflo.dev" -X OPTIONS https://api.zenflo.dev/v1/auth/request
```

**Issue: GitHub OAuth failing**
```bash
# Check redirect URL
ssh nas@nas-1 "cat 'developer/infrastructure/Zenflo Server/zenflo/.env.production' | grep GITHUB_REDIRECT_URL"

# Verify in GitHub OAuth App settings
# Should be: https://api.zenflo.dev/v1/connect/github/callback
```

**Issue: Webhook not triggering**
```bash
# Check webhook status
ssh nas@nas-1 "sudo systemctl status github-webhook"

# View recent logs
ssh nas@nas-1 "sudo journalctl -u github-webhook -n 50"

# Test webhook manually
gh api repos/quinnbmay/zenflo/hooks/580316577/test
```

**Issue: DNS not resolving**
```bash
# Check DNS propagation
dig +short api.zenflo.dev

# Flush local DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Check Cloudflare DNS
# https://dash.cloudflare.com → zenflo.dev → DNS
```

### Emergency Contacts

- **GitHub Webhook ID:** 580316577
- **Cloudflare Tunnel:** Check dashboard for tunnel ID
- **EAS Project:** c92795a3-d883-41c0-b761-3effaa823810

### Quick Reference Commands

```bash
# Health Check Everything
curl https://api.zenflo.dev/health
curl https://app.zenflo.dev
curl -X POST https://webhook.zenflo.dev/github-webhook

# Backend Status
ssh nas@nas-1 "sudo docker ps | grep zenflo"
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 20"

# Services Status
ssh nas@nas-1 "sudo systemctl status cloudflared"
ssh nas@nas-1 "sudo systemctl status github-webhook"

# Recent Deployments
ssh nas@nas-1 "tail -20 /home/nas/logs/deploy-backend.log"

# Webhook Deliveries
# Check: https://github.com/quinnbmay/zenflo/settings/hooks/580316577
```

---

## Checklist Summary

Use this high-level checklist to track migration progress:

### Pre-Migration
- [ ] Backup current state
- [ ] Verify DNS propagation
- [ ] Verify Cloudflare Tunnel
- [ ] Test webhook endpoint
- [ ] Review all files in this document
- [ ] Schedule deployment window

### Deployment
- [ ] Deploy backend to NAS
- [ ] Update backend environment variables
- [ ] Deploy web app
- [ ] Update mobile app (OTA)
- [ ] Configure GitHub OAuth
- [ ] Verify webhook auto-deploy
- [ ] Update CLI (publish to npm)
- [ ] Update integrations (n8n, MCP, VSCode)

### Testing
- [ ] Backend health checks (new domain)
- [ ] Backend health checks (legacy domain)
- [ ] CORS testing (new domain)
- [ ] CORS testing (legacy domain)
- [ ] WebSocket connections
- [ ] GitHub OAuth flow
- [ ] Web app functionality
- [ ] Mobile app functionality
- [ ] CLI functionality
- [ ] Webhook triggering
- [ ] Integration testing

### Post-Migration
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Notify users
- [ ] Track adoption metrics
- [ ] Plan legacy deprecation
- [ ] Update external links
- [ ] Security audit
- [ ] Performance optimization

### Rollback (If Needed)
- [ ] Backend rollback
- [ ] Web app rollback
- [ ] Mobile OTA rollback
- [ ] GitHub OAuth rollback
- [ ] Post-rollback verification
- [ ] User notification
- [ ] Root cause analysis

---

## Document Metadata

**Created:** 2025-11-15 PST
**Last Updated:** 2025-11-15 PST
**Author:** Claude Code Agent
**Repository:** https://github.com/quinnbmay/zenflo
**Related Docs:**
- `server/DOMAIN-MIGRATION-2025-11-15.md` - Backend-specific migration summary
- `WEBHOOK-SETUP.md` - Webhook auto-deployment documentation
- `DEPLOYMENT.md` - General deployment guide
- `CLAUDE.md` - Developer documentation

**Status Tracking:**
- 🟢 Complete
- 🟡 In Progress
- 🔴 Blocked
- ⚪ Not Started

Current Status: 🟡 **Backend and documentation complete, awaiting deployment**

---

**END OF MIGRATION CHECKLIST**
