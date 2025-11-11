# ZenFlo Webapp Deployment Guide

**Last Updated:** 2025-11-10 PST

This document describes how to use the automated deployment script for the ZenFlo webapp.

## Quick Start

```bash
cd /Users/quinnmay/developer/zenflo/webapp
./deploy.sh
```

This will:
1. Build the webapp locally with Expo
2. Package the build as a tar.gz archive
3. Transfer to NAS
4. Extract and deploy to Docker container
5. Fix permissions in the container
6. Purge Cloudflare cache

## Prerequisites

Before running the deployment script, ensure you have:

- **SSH Access:** Configured SSH access to `nas@nas-1` (should work without password)
- **NAS Setup:** Docker running with `zenflo-webapp` container
- **Local Tools:** Node.js, npm, and expo-cli installed
- **Cloudflare:** API credentials configured in the script (already set)

## Script Options

### Basic Usage

```bash
./deploy.sh                 # Full deployment (build + deploy + cache purge)
./deploy.sh --skip-build   # Use existing dist-web/ folder
./deploy.sh --skip-cache   # Skip Cloudflare cache purge
./deploy.sh --help         # Show help message
```

### Option Details

#### `--skip-build`
Skips the local build step and uses the existing `dist-web/` directory.

**Use when:**
- You've already built locally and just want to redeploy
- You're testing deployment without rebuilding
- You need to quickly redeploy the exact same build

**Requirements:**
- `dist-web/` directory must exist
- Directory must contain a valid build

#### `--skip-cache`
Skips the Cloudflare cache purge step.

**Use when:**
- Testing deployment in staging
- Making backend-only changes
- You want to manually purge cache later

**Note:** Without cache purge, users may not see changes immediately due to CDN caching.

### Combining Options

```bash
./deploy.sh --skip-build --skip-cache   # Only deploy to NAS (no build, no cache purge)
```

## Deployment Steps (Detailed)

### Step 1: Build Validation
- Validates prerequisites (SSH access, npx availability, container status)
- Checks that we're in the correct directory
- Verifies NAS connectivity

### Step 2: Local Build
- Removes old `dist` and `dist-web` directories
- Runs `npx expo export --platform web`
- Renames output from `dist` to `dist-web`

**Build artifacts:** `dist-web/` contains:
- `index.html` - Entry point
- `_expo/` - Bundled JavaScript and assets
- Static assets (images, fonts, etc.)

### Step 3: Package & Transfer
- Creates tar.gz archive of `dist-web/`
- Transfers archive to `/tmp/` on NAS via SCP
- Logs archive size for reference

### Step 4: NAS Deployment
- Extracts archive on NAS to deployment directory
- Verifies container is running (starts if needed)
- Copies files into container at `/usr/share/nginx/html/`
- Fixes permissions (`chmod 755` and `chown nginx:nginx`)
- Verifies `index.html` exists in container

### Step 5: Cloudflare Cache Purge
- Calls Cloudflare API to purge entire zone cache
- Validates API response for success
- Ensures users see changes immediately

### Step 6: Summary
- Displays deployment summary
- Shows deployment time
- Provides next steps and verification instructions

## Exit Codes

The script uses specific exit codes for different failure scenarios:

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 0 | Success | Deployment completed successfully |
| 1 | General error | Invalid arguments, missing prerequisites |
| 2 | Build failed | Expo build error, missing dependencies |
| 3 | Package/transfer failed | Archive creation failed, SCP error |
| 4 | NAS deployment failed | Container not found, permission error |
| 5 | Cloudflare cache purge failed | API error, invalid credentials |

## Configuration

All configuration is at the top of `deploy.sh`:

```bash
# Cloudflare Configuration
CLOUDFLARE_ZONE_ID="d19ff1e79dd2b5d7f5137779ad47a5e6"
CLOUDFLARE_API_KEY="7fe8f008072ea9c62d6fa3904fa08f29e4c15"
CLOUDFLARE_EMAIL="quinn@maymarketingseo.com"

# NAS Configuration
NAS_HOST="nas@nas-1"
CONTAINER_NAME="zenflo-webapp"
NAS_PATH="developer/infrastructure/Zenflo Server/zenflo/webapp"

# Local Paths
WEBAPP_DIR="/Users/quinnmay/developer/zenflo/webapp"
ARCHIVE_PATH="/tmp/webapp-deploy.tar.gz"
DIST_DIR="dist-web"
```

**To modify:** Edit these values at the top of the script.

## Troubleshooting

### Build Failures

**Symptom:** Script exits with code 2 during build step

**Common causes:**
- TypeScript errors in source code
- Missing dependencies
- Expo CLI not installed or outdated

**Solutions:**
```bash
# Run typecheck to find errors
yarn typecheck

# Install dependencies
yarn install

# Update Expo CLI
npm install -g @expo/cli
```

### SSH Connection Issues

**Symptom:** "Cannot connect to NAS" error

**Solutions:**
```bash
# Test SSH connection manually
ssh nas@nas-1 true

# Check SSH config
cat ~/.ssh/config

# Verify SSH key is loaded
ssh-add -l
```

### Container Not Found

**Symptom:** "Container 'zenflo-webapp' not found on NAS"

**Solutions:**
```bash
# List containers on NAS
ssh nas@nas-1 "sudo docker ps -a"

# Start container if stopped
ssh nas@nas-1 "cd 'developer/infrastructure/Zenflo Server/zenflo/webapp' && sudo docker compose up -d zenflo-webapp"
```

### Permission Errors

**Symptom:** Webapp loads but shows 403 Forbidden or file not found errors

**Solutions:**
```bash
# Manually fix permissions
ssh nas@nas-1 "sudo docker exec zenflo-webapp chmod -R 755 /usr/share/nginx/html"
ssh nas@nas-1 "sudo docker exec zenflo-webapp chown -R nginx:nginx /usr/share/nginx/html"

# Verify files exist in container
ssh nas@nas-1 "sudo docker exec zenflo-webapp ls -la /usr/share/nginx/html"
```

### Cloudflare Cache Purge Failures

**Symptom:** Script exits with code 5 during cache purge

**Solutions:**
```bash
# Test Cloudflare API manually
curl -X POST "https://api.cloudflare.com/client/v4/zones/d19ff1e79dd2b5d7f5137779ad47a5e6/purge_cache" \
  -H "X-Auth-Key: 7fe8f008072ea9c62d6fa3904fa08f29e4c15" \
  -H "X-Auth-Email: quinn@maymarketingseo.com" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Skip cache purge if API is down
./deploy.sh --skip-cache
```

### Changes Not Appearing

**Symptom:** Deployment succeeds but changes don't appear on the site

**Solutions:**
1. Wait 2-3 minutes for CDN propagation
2. Hard refresh in browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Clear browser cache completely
4. Verify Cloudflare cache was purged (check script output)
5. Check browser console for errors
6. Verify correct files in container:
   ```bash
   ssh nas@nas-1 "sudo docker exec zenflo-webapp cat /usr/share/nginx/html/index.html"
   ```

## Verification Steps

After deployment, verify the webapp is working:

1. **Visit the site:** https://app.combinedmemory.com
2. **Check console:** Open browser DevTools console, look for errors
3. **Test authentication:** Try logging in
4. **Test critical features:** Voice AI, task management, sync
5. **Check version:** Look for build timestamp or version indicator

### Manual Verification Commands

```bash
# Check container is running
ssh nas@nas-1 "sudo docker ps | grep zenflo-webapp"

# Check container logs
ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 50"

# Verify files in container
ssh nas@nas-1 "sudo docker exec zenflo-webapp ls -la /usr/share/nginx/html"

# Test nginx configuration
ssh nas@nas-1 "sudo docker exec zenflo-webapp nginx -t"
```

## Best Practices

### Before Deployment
1. ✅ Run `yarn typecheck` to catch TypeScript errors
2. ✅ Test locally with `yarn start` or `yarn web`
3. ✅ Review changes in staging if available
4. ✅ Notify team of deployment if applicable

### During Deployment
1. ✅ Monitor script output for errors
2. ✅ Don't interrupt the script (let it complete or fail)
3. ✅ Note the deployment time for tracking

### After Deployment
1. ✅ Verify site loads correctly
2. ✅ Check browser console for errors
3. ✅ Test critical user flows
4. ✅ Commit `dist-web/` changes to git:
   ```bash
   git add webapp/dist-web
   git commit -m "webapp: Deploy <description>"
   git push origin main
   ```

## Integration with Development Workflow

### Development Cycle
```bash
# 1. Make changes to source code
vim sources/app/...

# 2. Test locally
yarn start

# 3. Type check
yarn typecheck

# 4. Deploy
./deploy.sh

# 5. Verify
# Visit https://app.combinedmemory.com

# 6. Commit
git add webapp/
git commit -m "webapp: Implemented feature X"
git push origin main
```

### Rapid Iteration
For quick iteration during development:

```bash
# First deployment (full)
./deploy.sh

# Make small changes
vim sources/app/...

# Quick redeploy (use existing build for testing deployment mechanism)
./deploy.sh --skip-build

# Once satisfied, do full rebuild
./deploy.sh
```

## Comparison with Manual Deployment

### Manual Process (Old Way)
```bash
cd webapp
npx expo export --platform web
mv dist dist-web
tar -czf /tmp/webapp-deploy.tar.gz dist-web/
scp /tmp/webapp-deploy.tar.gz nas@nas-1:/tmp/
ssh nas@nas-1 "cd 'developer/infrastructure/Zenflo Server/zenflo/webapp' && rm -rf dist-web && tar -xzf /tmp/webapp-deploy.tar.gz"
ssh nas@nas-1 "sudo docker cp 'developer/infrastructure/Zenflo Server/zenflo/webapp/dist-web/.' zenflo-webapp:/usr/share/nginx/html/"
ssh nas@nas-1 "sudo docker exec zenflo-webapp chmod -R 755 /usr/share/nginx/html"
ssh nas@nas-1 "sudo docker exec zenflo-webapp chown -R nginx:nginx /usr/share/nginx/html"
curl -X POST "https://api.cloudflare.com/client/v4/zones/.../purge_cache" ...
```

**Problems:**
- Error-prone (easy to miss steps)
- No validation
- No error handling
- Tedious to type
- Hard to debug failures

### Automated Process (New Way)
```bash
./deploy.sh
```

**Benefits:**
- ✅ One command does everything
- ✅ Validates prerequisites before starting
- ✅ Clear error messages with exit codes
- ✅ Color-coded output for easy reading
- ✅ Automatic cleanup of temp files
- ✅ Detailed deployment summary
- ✅ Optional flags for flexibility
- ✅ Built-in help documentation

## Advanced Usage

### Custom Archive Path
If you need to use a different temporary location:

```bash
# Edit script and change:
readonly ARCHIVE_PATH="/path/to/custom/location/webapp-deploy.tar.gz"
```

### Different Container Name
If deploying to a different container:

```bash
# Edit script and change:
readonly CONTAINER_NAME="your-container-name"
```

### Multiple Environments
To support staging/production, create separate scripts:

```bash
cp deploy.sh deploy-staging.sh
cp deploy.sh deploy-production.sh

# Edit each script to use different:
# - CONTAINER_NAME
# - NAS_PATH
# - CLOUDFLARE_ZONE_ID
```

## Monitoring and Logging

The script provides detailed logging at each step:

- **[INFO]** - General information (blue)
- **[SUCCESS]** - Step completed successfully (green)
- **[WARNING]** - Non-critical issues (yellow)
- **[ERROR]** - Critical failures (red)

### Log Example
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║          ZenFlo Webapp Deployment Script             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

[INFO] Starting deployment at 2025-11-10 14:32:15

==> Validating prerequisites
[INFO] Not in webapp directory. Expected: /Users/quinnmay/developer/zenflo/webapp
[SUCCESS] All prerequisites validated

==> Building webapp locally
[INFO] Removing old dist directory...
[INFO] Running: npx expo export --platform web
[SUCCESS] Build completed successfully

...

╔════════════════════════════════════════════╗
║                                            ║
║     🚀  Deployment Completed Successfully  ║
║                                            ║
╚════════════════════════════════════════════╝

Total deployment time: 127s
```

## Related Documentation

- **Deployment Guide:** `/Users/quinnmay/developer/zenflo/DEPLOYMENT.md`
- **Webapp README:** `/Users/quinnmay/developer/zenflo/webapp/README.md`
- **Project CLAUDE.md:** `/Users/quinnmay/developer/zenflo/CLAUDE.md`

## Support

If you encounter issues not covered in this guide:

1. Check script output for specific error messages
2. Review the exit code (see Exit Codes section)
3. Try relevant troubleshooting steps
4. Check NAS container logs: `ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 100"`
5. Verify Cloudflare tunnel is running: `ssh nas@nas-1 "ps aux | grep cloudflared"`

---

**Last Updated:** 2025-11-10 PST
