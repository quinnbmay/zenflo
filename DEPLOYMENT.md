# ZenFlo Deployment Guide

**Last Updated:** 2025-11-10 PST

This document describes the deployment workflows for ZenFlo's web, mobile, and backend applications.

---

## Backend (api.zenflo.dev)

### Infrastructure

- **Hosting:** NAS via Docker container (`zenflo-server`)
- **Runtime:** Node.js/TypeScript with Fastify
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis
- **Domain:** https://api.zenflo.dev
- **WebSocket:** ws://api.zenflo.dev

### Automated Deployment (GitHub Webhook) ⭐ NEW

**The backend now auto-deploys on every push to `main` branch!**

Simply push your changes:
```bash
git push origin main
```

The GitHub webhook will automatically:
1. Receive notification from GitHub
2. Pull latest changes from git
3. Install dependencies (if package.json changed)
4. Rebuild Docker container
5. Verify deployment

**Monitoring:**
```bash
# Watch webhook logs
ssh nas@nas-1 "sudo journalctl -u github-webhook -f"

# Watch deployment logs
ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"

# Check backend container
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 50"
```

**Documentation:** See `WEBHOOK-SETUP.md` for detailed webhook configuration and troubleshooting.

### Manual Deployment (Fallback)

If webhook is unavailable or you prefer manual deployment:

```bash
cd /Users/quinnmay/developer/zenflo/backend
./deploy.sh
```

Or SSH directly to NAS:

```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo/backend'
git pull origin main
sudo docker compose up -d --build zenflo-server
```

**Documentation:** See `backend/DEPLOYMENT.md` for complete manual deployment guide.

---

## Web Application (app.zenflo.dev)

### Infrastructure

- **Hosting:** NAS via Docker container (`zenflo-webapp`)
- **Web Server:** nginx:alpine
- **CDN/Proxy:** Cloudflare Tunnel on port 8080
- **Domain:** https://app.zenflo.dev

### Automated Deployment (Recommended)

**NEW:** Use the automated deployment script for one-command deployments:

```bash
cd /Users/quinnmay/developer/zenflo/webapp
./deploy.sh
```

This script automatically handles:
- Local build with expo export
- Packaging and transfer to NAS
- Container deployment
- Permission fixes
- Cloudflare cache purge
- Full validation and error handling

**Options:**
```bash
./deploy.sh                # Full deployment
./deploy.sh --skip-build   # Use existing dist-web/
./deploy.sh --skip-cache   # Skip Cloudflare cache purge
./deploy.sh --help         # Show usage information
```

**Documentation:**
- **Full Guide:** `webapp/DEPLOY.md` - Comprehensive documentation
- **Quick Reference:** `webapp/DEPLOY-QUICKREF.md` - One-page reference
- **Summary:** `webapp/DEPLOYMENT-SUMMARY.md` - Overview and metrics

### Manual Deployment Process

If you need to deploy manually (or understand what the script does):

#### 1. Build Locally

```bash
cd /Users/quinnmay/developer/zenflo/webapp

# Build for web platform
npx expo export --platform web

# Rename output directory
mv dist dist-web
```

#### 2. Package and Transfer

```bash
# Create archive
tar -czf /tmp/webapp-deploy.tar.gz dist-web/

# Copy to NAS
scp /tmp/webapp-deploy.tar.gz nas@nas-1:/tmp/
```

#### 3. Deploy on NAS

```bash
# Extract files
ssh nas@nas-1 "cd 'developer/infrastructure/Zenflo Server/zenflo/webapp' && \
  rm -rf dist-web && \
  tar -xzf /tmp/webapp-deploy.tar.gz"

# Copy into running container
ssh nas@nas-1 "sudo docker cp \
  'developer/infrastructure/Zenflo Server/zenflo/webapp/dist-web/.' \
  zenflo-webapp:/usr/share/nginx/html/"

# Fix permissions (CRITICAL!)
ssh nas@nas-1 "sudo docker exec zenflo-webapp chmod -R 755 /usr/share/nginx/html && \
  sudo docker exec zenflo-webapp chown -R nginx:nginx /usr/share/nginx/html"
```

#### 4. Purge Cloudflare Cache

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/d19ff1e79dd2b5d7f5137779ad47a5e6/purge_cache" \
  -H "X-Auth-Key: 7fe8f008072ea9c62d6fa3904fa08f29e4c15" \
  -H "X-Auth-Email: quinn@maymarketingseo.com" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

#### 5. Verify Deployment

Visit https://app.zenflo.dev and check console for errors.

### Critical Rules

- ✅ **Always build locally** - Never rebuild on NAS (lockfile issues)
- ✅ **Always fix permissions** after `docker cp` (nginx needs 755 and nginx:nginx ownership)
- ✅ **Always purge Cloudflare cache** after deployment
- ✅ **Commit dist-web/** folder to git for deployment tracking
- ✅ **Use automated script** - Reduces errors and saves time
- ❌ **NEVER use `import.meta.env.DEV`** in webapp source (causes module errors, use `__DEV__` instead)
- ❌ **NEVER rebuild container from Dockerfile** (source on NAS is outdated)

### Container Details

- **Name:** zenflo-webapp
- **Image:** nginx:alpine
- **Port Mapping:** 8080:80
- **NAS Path:** `developer/infrastructure/Zenflo Server/zenflo/webapp/`
- **Nginx Root:** `/usr/share/nginx/html/`

### Cloudflare Configuration

- **Zone ID:** d19ff1e79dd2b5d7f5137779ad47a5e6
- **Global API Key:** 7fe8f008072ea9c62d6fa3904fa08f29e4c15
- **Email:** quinn@maymarketingseo.com
- **Tunnel Config:** `~/.cloudflared/config.yml` on NAS
- **Tunnel Name:** happy-server

---

## Mobile Application

### Infrastructure

- **Platform:** EAS Build (Expo Application Services)
- **Bundle ID:** com.zenflo.app
- **Platforms:** iOS, Android

### OTA Updates (JS/TS/Assets Only)

For changes to JavaScript, TypeScript, or assets that don't require native code modifications:

```bash
cd /Users/quinnmay/developer/zenflo/mobile

# Run typecheck FIRST
yarn typecheck

# Deploy to preview channel
yarn ota

# Deploy to production channel
yarn ota:production
```

**Propagation Time:** 5-10 minutes after deployment.

### Native Builds (For Native Code Changes)

When you modify native code, dependencies, or app configuration:

#### Automatic (Recommended)

1. Commit changes to `main` branch
2. GitHub Actions automatically triggers EAS builds

#### Manual

```bash
cd /Users/quinnmay/developer/zenflo/mobile

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store (after build completes)
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

### When to Use Which Method

| Change Type | Method | Example |
|------------|--------|---------|
| JS/TS code | OTA Update | Business logic, UI components, state management |
| Assets | OTA Update | Images, fonts, translations |
| Dependencies (pure JS) | OTA Update | Most npm packages without native code |
| Dependencies (native) | Native Build | Packages with native modules |
| Native code | Native Build | iOS/Android specific code |
| App config | Native Build | Permissions, entitlements, bundle ID |
| SDK updates | Native Build | Expo SDK version bumps |

---

## Platform-Specific Code (Web + Mobile)

Both webapp and mobile use the same platform-specific file pattern:

- **Native (iOS/Android):** `ComponentName.tsx`
  - Uses `@more-tech/react-native-libsodium`
- **Web:** `ComponentName.web.tsx`
  - Uses `libsodium-wrappers`

Metro bundler automatically selects the correct file based on build platform.

### Example: libsodium Loading

**Native** (`libsodium.lib.ts`):
```typescript
import sodium from '@more-tech/react-native-libsodium';
export default sodium;
```

**Web** (`libsodium.lib.web.ts`):
```typescript
import sodium from 'libsodium-wrappers';
export default sodium;
```

Metro will use `.web.ts` for web builds, `.ts` for native builds.

---

## Shared Codebase

### Common Directories

Both webapp and mobile share these directories:

- `sources/sync/` - Sync protocol and state management
- `sources/auth/` - Authentication flow
- `sources/realtime/` - Voice AI integration
- `sources/text/` - i18n translation system
- `sources/encryption/` - Encryption utilities (with platform-specific implementations)

### Voice AI Configuration

- **Agent ID:** `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (hardcoded, same for all environments)
- **Native:** Uses `@elevenlabs/react-native` package
- **Web:** Uses `@elevenlabs/react` package with WebRTC connection type

### Code Style Rules (Applies to Both)

- ✅ Use **4 spaces** for indentation (not 2)
- ✅ All user-facing strings must use `t()` translation function
- ✅ Use `__DEV__` for development checks (NOT `import.meta.env.DEV`)
- ✅ TypeScript strict mode - no untyped code
- ✅ Named exports preferred over default exports
- ✅ Always run `yarn typecheck` before committing

---

## Troubleshooting

### Webapp Grey Screen

**Symptom:** Blank grey screen with no content
**Common Causes:**
1. `import.meta.env.DEV` used in source code → Remove it
2. Cloudflare serving old cache → Purge cache
3. Wrong file permissions in container → Run chmod/chown commands
4. Old bundle hash being served → Check bundle hash in HTML vs container

**Quick Fix:**
```bash
cd /Users/quinnmay/developer/zenflo/webapp
./deploy.sh
```

### Mobile App Not Updating

**Symptom:** OTA update not applying
**Solutions:**
1. Wait 10 minutes for propagation
2. Kill and restart app
3. Clear app cache
4. Check if change requires native build (see table above)

### Build Errors

**Webapp:**
- Check Metro bundler output for syntax errors
- Verify all imports are correct
- Ensure libsodium.lib.web.ts is simple 2-line export

**Mobile:**
- Run `yarn typecheck` to catch TypeScript errors
- Check EAS Build logs for native build issues
- Verify app.config.js has correct bundle ID

### Deployment Script Issues

If the automated deployment script fails, see:
- `webapp/DEPLOY.md` for detailed troubleshooting
- Script exit codes (0-5) indicate specific failure types
- Use `./deploy.sh --help` for usage information

---

## Quick Reference

### Webapp Deployment (Automated)
```bash
cd /Users/quinnmay/developer/zenflo/webapp && ./deploy.sh
```

### Webapp Deployment (Manual)
```bash
cd webapp && npx expo export --platform web && mv dist dist-web
tar -czf /tmp/webapp-deploy.tar.gz dist-web/
scp /tmp/webapp-deploy.tar.gz nas@nas-1:/tmp/
ssh nas@nas-1 "cd 'developer/infrastructure/Zenflo Server/zenflo/webapp' && rm -rf dist-web && tar -xzf /tmp/webapp-deploy.tar.gz && sudo docker cp dist-web/. zenflo-webapp:/usr/share/nginx/html/ && sudo docker exec zenflo-webapp chmod -R 755 /usr/share/nginx/html && sudo docker exec zenflo-webapp chown -R nginx:nginx /usr/share/nginx/html"
# Then purge Cloudflare cache (see script or manual process above)
```

### Mobile OTA
```bash
cd mobile && yarn typecheck && yarn ota:production
```

### Mobile Native Build
```bash
cd mobile && eas build --platform ios --profile production
```
