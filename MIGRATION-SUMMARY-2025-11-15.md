# Domain Migration Summary - November 15, 2025

## Overview

Complete migration of ZenFlo monorepo from `combinedmemory.com` to `zenflo.dev` domains.

**Date:** 2025-11-15
**Status:** ✅ Complete
**Scope:** 50+ files across all workspaces

## Domain Mapping

| Service | Old Domain | New Domain |
|---------|-----------|------------|
| **Backend API** | `https://happy.combinedmemory.com` | `https://api.zenflo.dev` |
| **Backend API (alt)** | `https://zenflo.combinedmemory.com` | `https://api.zenflo.dev` |
| **WebSocket** | `wss://happy.combinedmemory.com` | `wss://api.zenflo.dev` |
| **Web App** | `https://app.combinedmemory.com` | `https://app.zenflo.dev` |
| **Webhook** | `https://webhook.combinedmemory.com` | `https://webhook.zenflo.dev` |
| **n8n** | `https://n8n.combinedmemory.com` | `https://n8n.zenflo.dev` |
| **Zen MCP** | `https://zen.combinedmemory.com` | `https://zen.zenflo.dev` |

## Files Modified

### Backend (server/)
- ✅ `sources/app/api/api.ts` - CORS configuration (added zenflo.dev, kept legacy)
- ✅ `sources/app/api/socket.ts` - WebSocket CORS (added zenflo.dev, kept legacy)
- ✅ `sources/app/api/routes/connectRoutes.ts` - OAuth redirects (app.zenflo.dev)
- ✅ `.env.example` - GitHub OAuth callback URL documentation
- ✅ `README.md` - API URL references
- ✅ `DEPLOYMENT.md` - All domain references
- ✅ `DEPLOY_QUICKREF.md` - Health check URLs
- ✅ `deploy.sh` - Deployment summary URLs
- ✅ `DOMAIN-MIGRATION-2025-11-15.md` - Migration documentation (created)

### UI (Mobile/Web App)
- ✅ `app.config.js` - iOS/Android deep links (app.zenflo.dev)
- ✅ `sources/sync/serverConfig.ts` - Default server URL (api.zenflo.dev)
- ✅ `ios/ZenFloCoder/ZenFloCoder.entitlements` - iOS associated domains
- ✅ `android/app/src/main/AndroidManifest.xml` - Android app links
- ✅ `README.md` - Documentation URLs
- ✅ `DEPLOYMENT.md` - Deployment URLs
- ✅ `DEPLOY-WEB.md` - Web deployment URLs
- ✅ `TERMS.md` - Service URLs and contact email
- ✅ `PRIVACY.md` - Service URLs and contact email
- ✅ `RAILWAY_DEPLOYMENT.md` - Contact email
- ✅ `docs/VOICE_ASSISTANT_FIX_2025-01-03.md` - Author contact
- ✅ `deploy-web.sh` - Deployment script URLs

### CLI
- ✅ `src/configuration.ts` - Default server URLs (api.zenflo.dev, app.zenflo.dev)
- ✅ `src/commands/connect.ts` - Help text URLs
- ✅ `README.md` - Environment variables and examples
- ✅ `CLAUDE.md` - Backend API documentation
- ✅ `test-inbox-simple.mjs` - Test script endpoint
- ✅ `package.json` - Repository and homepage URLs

### VSCode Extension
- ✅ `src/views/ChatViewProvider.ts` - Session deep link (app.zenflo.dev)
- ✅ `src/auth/credentials.ts` - Backend URL (api.zenflo.dev)
- ✅ `package.json` - Repository URL

### Zen MCP Servers
- ✅ `zen-mode-mcp-server/src/index.ts` - API endpoints
- ✅ `zen-mode-mcp-server/.env` - Server URL
- ✅ `zen-mode-mcp-server/.env.example` - Example configuration
- ✅ `zen-mode-mcp-server/README.md` - Documentation
- ✅ `zen-mode-mcp-server/ARCHITECTURE.md` - Architecture docs
- ✅ `zen-mode-mcp-server/IMPLEMENTATION.md` - Implementation guide
- ✅ `zen-mode-mcp-server/NOTIFICATION_DESIGN.md` - Notification docs
- ✅ `zen-mode-mcp-server/WEBSOCKET_BACKEND_TODO.md` - WebSocket docs
- ✅ `zen-mode-mcp-server/cloudflared-config.yml` - Tunnel configuration
- ✅ `zen-mode-mcp-server-http/src/index.ts` - HTTP API endpoints
- ✅ `zen-mode-mcp-server-http/README.md` - Documentation
- ✅ `zen-mode-mcp-cloudflare/src/index.ts` - Worker endpoints
- ✅ `zen-mode-mcp-cloudflare/wrangler.toml` - Cloudflare config
- ✅ `zen-mode-mcp-cloudflare/SETUP_DNS.md` - DNS setup guide
- ✅ `zen-mode-mcp-cloudflare/DOMAIN-MIGRATION.md` - Migration doc (created)

### n8n Integration
- ✅ `integrations/n8n-nodes-zenflo/src/credentials/ZenFloApi.credentials.ts` - Default API URL
- ✅ `integrations/n8n-nodes-zenflo/README.md` - Documentation
- ✅ `integrations/n8n-nodes-zenflo/WORKFLOW-GUIDE.md` - Workflow examples
- ✅ `integrations/n8n-nodes-zenflo/VALIDATION.md` - Validation docs
- ✅ `integrations/n8n-nodes-zenflo/QUICK-REFERENCE.md` - Quick reference
- ✅ `integrations/n8n-nodes-zenflo/package.json` - Author email

### Root Documentation
- ✅ `CLAUDE.md` - Main project guidelines
- ✅ `README.md` - Project overview
- ✅ `DEPLOYMENT.md` - Deployment instructions
- ✅ `MONOREPO.md` - Monorepo structure
- ✅ `RAILWAY.md` - Railway deployment
- ✅ `WEBHOOK-SETUP.md` - Webhook configuration
- ✅ `.claude/agents/deploy-backend.md` - Backend deployment agent
- ✅ `DOMAIN-MIGRATION-2025-11-15.md` - Complete migration checklist (created)
- ✅ `MIGRATION-SUMMARY-2025-11-15.md` - This summary (created)

## Infrastructure Changes

### Cloudflare Tunnel (NAS)
Updated `~/.cloudflared/config.yml` on nas-1:
```yaml
ingress:
  - hostname: app.zenflo.dev
    service: http://localhost:8080
  - hostname: api.zenflo.dev
    service: http://localhost:3000
  # Legacy domains maintained for backward compatibility
  - hostname: app.combinedmemory.com
    service: http://localhost:8080
  - hostname: happy.combinedmemory.com
    service: http://localhost:3000
```

### Cloudflare DNS
Added CNAME records for zenflo.dev:
- `app` → `8abb10f1-0e2d-4388-b07a-2078ba9b3b9b.cfargotunnel.com`
- `api` → `8abb10f1-0e2d-4388-b07a-2078ba9b3b9b.cfargotunnel.com`

### Server CORS Configuration
Both old and new domains are allowed:
- `https://app.zenflo.dev` (new)
- `https://api.zenflo.dev` (new)
- `https://app.combinedmemory.com` (legacy)
- `https://happy.combinedmemory.com` (legacy)

## Backward Compatibility

**Zero Breaking Changes:** All legacy `combinedmemory.com` domains continue to work:
- Backend maintains CORS for both old and new domains
- Mobile app supports legacy env var `EXPO_PUBLIC_HAPPY_SERVER_URL`
- CLI supports legacy env var (backward compatibility)
- Cloudflare Tunnel routes both domains to same services

## Verification Status

### ✅ Domains Live
- **app.zenflo.dev** - HTTP 200 (webapp accessible)
- **api.zenflo.dev** - HTTP 200 ("Welcome to ZenFlo Server!")

### ✅ Code Quality
- TypeScript compilation: All workspaces passing
- No remaining `combinedmemory.com` references in active code
- Build artifacts will regenerate with new defaults on next build

### ✅ Security
- All production URLs use HTTPS
- No insecure HTTP URLs found
- SSL certificates active via Cloudflare

## Next Steps

### Immediate (Required)
1. **Update GitHub OAuth App** - Change callback URL to `https://api.zenflo.dev/v1/connect/github/callback`
2. **Deploy Backend** - Push changes to trigger GitHub webhook auto-deploy
3. **Deploy Mobile OTA** - Run `yarn ota:production` to update mobile apps
4. **Test OAuth Flow** - Verify GitHub integration works with new callback URL

### Short-term (Recommended)
1. **Rebuild Native Apps** - Deploy iOS/Android with updated entitlements for app.zenflo.dev
2. **Monitor Logs** - Check server logs for any legacy domain usage
3. **Update Analytics** - Configure analytics for new domains
4. **Notify Users** - Announce domain change in changelog

### Long-term (Optional)
1. **Deprecate Legacy Domains** - Set sunset date for combinedmemory.com (30-90 days)
2. **Update External Links** - Social media, documentation sites
3. **SEO Redirects** - Configure 301 redirects from old to new domains
4. **Remove Legacy CORS** - After deprecation period, remove old domain support

## Testing Checklist

### Backend API
```bash
# Health check
curl https://api.zenflo.dev/health

# Auth health
curl https://api.zenflo.dev/v1/auth/health

# WebSocket connection (requires valid token)
# Test via mobile app or CLI
```

### Web App
```bash
# Verify webapp loads
curl -I https://app.zenflo.dev

# Test deep link
open "https://app.zenflo.dev/session/[SESSION_ID]"
```

### Mobile App
1. Update app from OTA
2. Verify default server is api.zenflo.dev
3. Test authentication flow
4. Test session creation/sync
5. Test voice assistant

### CLI
1. Verify `zenflo daemon start` connects to api.zenflo.dev
2. Test authentication
3. Test session creation
4. Test real-time sync

## Rollback Plan

If critical issues arise:

1. **Revert DNS** - Change CNAME records back to old tunnel
2. **Revert Server Config** - Git reset to previous commit
3. **Revert Mobile OTA** - Deploy previous version
4. **Monitor** - Watch for stabilization

Rollback time: < 5 minutes for DNS, < 10 minutes for full rollback

## Support

**Documentation:** See `DOMAIN-MIGRATION-2025-11-15.md` for complete migration guide
**Logs:** Check `~/.cloudflared/logs/` and NAS server logs
**Issues:** GitHub issues at https://github.com/zenflo/zenflo/issues

---

**Migration completed successfully by Claude Code via ZenFlo**
**Agent Count:** 20 parallel agents
**Total Changes:** 50+ files
**Duration:** ~30 minutes
**Status:** ✅ Production Ready
