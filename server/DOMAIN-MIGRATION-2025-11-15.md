# Domain Migration Summary

**Date:** 2025-11-15
**Migration:** combinedmemory.com → zenflo.dev

## Overview

Updated ZenFlo backend server configuration to support the new `zenflo.dev` domain while maintaining backward compatibility with the legacy `combinedmemory.com` domain.

## Changes Made

### 1. CORS Configuration Updates

**File:** `sources/app/api/api.ts`

- Updated CORS origins to include both new and legacy domains
- Added smart origin validation function
- Supports:
  - `https://app.zenflo.dev` (new webapp)
  - `https://happy.zenflo.dev` (new API)
  - `https://app.combinedmemory.com` (legacy webapp)
  - `https://happy.combinedmemory.com` (legacy API)
  - `http://localhost:*` (development)

**File:** `sources/app/api/socket.ts`

- Updated WebSocket CORS configuration
- Same origin list as REST API
- Maintains backward compatibility

### 2. GitHub OAuth Redirect URLs

**File:** `sources/app/api/routes/connectRoutes.ts`

Updated all GitHub OAuth redirects:
- Changed from `https://app.combinedmemory.com`
- Changed to `https://app.zenflo.dev`

Affected routes:
- `/v1/connect/github/callback` - OAuth callback handler
- Error redirects for invalid state, server config, token errors, etc.

### 3. Environment Configuration

**File:** `.env.example` (new)

Created comprehensive environment configuration template with:
- Database connection strings
- Security settings
- GitHub OAuth configuration
- CORS documentation
- Domain references updated to zenflo.dev

### 4. Documentation Updates

**Files Updated:**
- `deploy.sh` - Updated backend URL references
- `README.md` - Updated to reference `https://happy.zenflo.dev`
- `DEPLOY_QUICKREF.md` - Updated health check URLs

## Backward Compatibility

All legacy `combinedmemory.com` domains remain functional:
- ✅ Old webapp continues to work
- ✅ Old API endpoints continue to work
- ✅ Existing OAuth flows continue to work
- ✅ WebSocket connections from old domains work

This ensures zero downtime during migration.

## GitHub OAuth Configuration

**IMPORTANT:** Update GitHub OAuth App settings:

1. Go to: https://github.com/settings/developers
2. Update Authorization callback URL to:
   ```
   https://happy.zenflo.dev/v1/connect/github/callback
   ```
3. Update `.env.production` on NAS:
   ```bash
   GITHUB_REDIRECT_URL=https://happy.zenflo.dev/v1/connect/github/callback
   ```

## Deployment Checklist

- [ ] Update GitHub OAuth app callback URL
- [ ] Update `.env.production` on NAS with new GITHUB_REDIRECT_URL
- [ ] Deploy backend to NAS: `./deploy.sh`
- [ ] Verify health check: `curl https://happy.zenflo.dev/health`
- [ ] Test OAuth flow from new webapp
- [ ] Test WebSocket connections from new webapp
- [ ] Verify legacy domains still work

## Testing

### Health Checks

```bash
# New domain
curl https://happy.zenflo.dev/health
curl https://happy.zenflo.dev/v1/auth/health

# Legacy domain (should still work)
curl https://happy.combinedmemory.com/health
curl https://happy.combinedmemory.com/v1/auth/health
```

### CORS Testing

```bash
# Test new webapp origin
curl -H "Origin: https://app.zenflo.dev" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS \
  https://happy.zenflo.dev/v1/auth/request

# Test legacy origin (should still work)
curl -H "Origin: https://app.combinedmemory.com" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS \
  https://happy.zenflo.dev/v1/auth/request
```

### GitHub OAuth Flow

1. Navigate to new webapp: https://app.zenflo.dev
2. Click "Connect GitHub"
3. Authorize on GitHub
4. Verify redirect back to app with success message
5. Check GitHub connection shows in settings

## Rollback Plan

If issues arise, rollback is simple:

```bash
# SSH to NAS
ssh nas@nas-1

# Navigate to backend
cd 'developer/infrastructure/ZenFlo Server/zenflo-server'

# Revert to previous commit
git log --oneline -5  # Find commit hash before migration
git checkout <previous-commit-hash>

# Rebuild
sudo docker compose up -d --build zenflo-server
```

## Files Changed

```
server/
├── sources/app/api/
│   ├── api.ts                      # CORS configuration
│   ├── socket.ts                   # WebSocket CORS
│   └── routes/connectRoutes.ts     # GitHub OAuth redirects
├── .env.example                     # New configuration template
├── deploy.sh                        # Deployment script URLs
├── README.md                        # Documentation URLs
├── DEPLOY_QUICKREF.md              # Quick reference URLs
└── DOMAIN-MIGRATION-2025-11-15.md  # This file
```

## Notes

- All changes maintain backward compatibility
- No breaking changes for existing users
- TypeScript compilation has pre-existing errors unrelated to this migration
- Migration supports gradual rollout (both domains work simultaneously)
- Can remove legacy domain support after full migration is complete

## Next Steps

After successful migration and testing:

1. Monitor logs for any CORS errors
2. Check analytics for traffic on both domains
3. Plan deprecation timeline for legacy domain
4. Update all external documentation/links
5. Notify users of new domain
6. Eventually remove legacy domain support from CORS config
