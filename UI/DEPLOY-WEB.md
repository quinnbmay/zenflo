# ZenFlo Web Deployment Guide

## Quick Start

### Manual Deployment (Recommended for Now)

```bash
cd UI/
./deploy-web.sh
```

This will:
1. Run TypeScript type checking
2. Build the web app (`yarn web:build`)
3. Copy build files to NAS
4. Configure nginx and Docker Compose
5. Restart the webapp container
6. Verify deployment

**Deployment time:** ~2-5 minutes

### Deployment Options

```bash
# Full deployment (build + deploy)
./deploy-web.sh

# Deploy existing build (skip build step)
./deploy-web.sh --skip-build

# Deploy without CDN cache purge
./deploy-web.sh --skip-cache

# Show only last 20 log lines
./deploy-web.sh --logs 20
```

## Architecture

### NAS Infrastructure

- **Container:** `zenflo-webapp`
- **Image:** `nginx:alpine`
- **Port:** 8080:80 (external:internal)
- **Location:** `developer/infrastructure/ZenFlo Web/`
- **URL:** https://app.zenflo.dev
- **CDN:** Cloudflare Tunnel

### Directory Structure on NAS

```
developer/infrastructure/ZenFlo Web/
├── dist/                   # Built web app files
│   ├── index.html
│   ├── assets/
│   └── ...
├── nginx.conf             # nginx configuration
└── docker-compose.yml     # Container configuration
```

### Build Output

- **Source:** `UI/dist/` (created by `yarn web:build`)
- **Size:** ~2-5 MB (varies with assets)
- **Format:** Static HTML/CSS/JS files

## Deployment Flow

### What the Script Does

1. **Pre-flight Checks**
   - Verifies SSH connection to NAS
   - Confirms you're in the UI directory
   - Creates NAS directory if needed

2. **Build Phase** (unless `--skip-build`)
   - Runs `yarn typecheck` to catch type errors
   - Runs `yarn web:build` to create production build
   - Verifies build output exists in `dist/`

3. **Deploy Phase**
   - Syncs `dist/` to NAS using rsync
   - Deletes old files from NAS (--delete flag)
   - Creates/updates nginx configuration
   - Creates/updates Docker Compose configuration

4. **Container Phase**
   - Restarts nginx container with new files
   - Verifies container is running
   - Shows last 50 lines of container logs

5. **CDN Phase** (unless `--skip-cache`)
   - Reminds you to purge Cloudflare cache manually

## GitHub Actions Workflow

The GitHub Actions workflow at `.github/workflows/deploy-web.yml`:

### What It Does

- **Triggers on:** Pushes to `main` with changes in `UI/**` OR manual workflow dispatch
- **Actions:**
  1. Checks out repository
  2. Sets up Node.js 20 with Yarn cache
  3. Installs dependencies (`yarn install --frozen-lockfile`)
  4. Builds web app (`yarn web:build`)
  5. Shows deployment instructions

### What It Doesn't Do (Yet)

- ❌ Automatic deployment to NAS
- ❌ Upload build artifacts
- ❌ Trigger webhook deployment

**Note:** GitHub Actions provides CI (Continuous Integration) to verify builds work. Actual deployment (CD) is currently manual via `./deploy-web.sh`.

## Troubleshooting

### Build Fails with Type Errors

**Error:**
```
TypeScript check failed
Fix type errors before deploying
```

**Solution:**
```bash
yarn typecheck          # See all type errors
# Fix the errors, then retry deployment
```

### SSH Connection Failed

**Error:**
```
Cannot connect to nas@nas-1 via SSH
```

**Solution:**
1. Check NAS is running: `ping nas-1`
2. Verify SSH config: `cat ~/.ssh/config | grep nas-1`
3. Test SSH: `ssh nas@nas-1 echo "test"`
4. Add SSH key if needed: `ssh-copy-id nas@nas-1`

### Build Directory Not Found

**Error:**
```
Build output directory not found: dist
```

**Solution:**
- Don't use `--skip-build` unless you've already built
- Or run `yarn web:build` manually first

### Container Not Running

**Error:**
```
Container zenflo-webapp is not running!
```

**Solution:**
```bash
# SSH to NAS
ssh nas@nas-1

# Check container logs
sudo docker logs zenflo-webapp --tail 100

# Check nginx config syntax
sudo docker exec zenflo-webapp nginx -t

# Restart container
cd 'developer/infrastructure/ZenFlo Web'
sudo docker compose up -d --force-recreate
```

### Changes Not Visible on Website

**Causes:**
1. Cloudflare CDN cache
2. Browser cache
3. Service worker cache

**Solutions:**
```bash
# 1. Purge Cloudflare cache
# Visit: https://dash.cloudflare.com
# Navigate to: Caching → Configuration → Purge Cache
# Purge: https://app.zenflo.dev

# 2. Hard refresh browser
# Chrome/Firefox: Ctrl+Shift+R (Cmd+Shift+R on Mac)
# Safari: Cmd+Option+R

# 3. Clear service worker
# DevTools → Application → Service Workers → Unregister
```

### Deployment Hangs at rsync

**Error:**
```
rsync appears to hang or is very slow
```

**Solution:**
```bash
# Check network connection
ping nas-1

# Check available disk space on NAS
ssh nas@nas-1 df -h

# Try deployment with verbose rsync output
# (Edit deploy-web.sh and add -vvv to rsync flags)
```

## Manual Deployment Steps (Without Script)

If the script fails, you can deploy manually:

```bash
# 1. Build locally
cd UI/
yarn web:build

# 2. Copy to NAS
rsync -avz --delete dist/ nas@nas-1:'developer/infrastructure/ZenFlo Web/dist/'

# 3. SSH to NAS
ssh nas@nas-1

# 4. Navigate to web directory
cd 'developer/infrastructure/ZenFlo Web'

# 5. Restart container
sudo docker compose up -d --force-recreate zenflo-webapp

# 6. Verify
sudo docker ps | grep zenflo-webapp
sudo docker logs zenflo-webapp --tail 50

# 7. Test
curl -I https://app.zenflo.dev
```

## Future Enhancements

### GitHub Webhook Auto-Deployment

Similar to backend deployment, a GitHub webhook could be configured to:
1. Receive push notification from GitHub
2. Build web app on NAS
3. Copy to nginx directory
4. Restart container
5. Purge CDN cache

**Status:** Not yet implemented

See `WEBHOOK-SETUP.md` for backend webhook configuration as reference.

### Artifact-Based Deployment

GitHub Actions could upload build artifacts, then deployment downloads and deploys them.

**Status:** Not yet implemented

## Monitoring

### Check Deployment Status

```bash
# Container status
ssh nas@nas-1 "sudo docker ps | grep zenflo-webapp"

# Live logs
ssh nas@nas-1 "sudo docker logs -f zenflo-webapp"

# Last 100 lines
ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 100"

# Container resource usage
ssh nas@nas-1 "sudo docker stats zenflo-webapp --no-stream"
```

### Test Webapp

```bash
# Check HTTP status
curl -I https://app.zenflo.dev

# Check response time
time curl -so /dev/null https://app.zenflo.dev

# Full request/response
curl -v https://app.zenflo.dev
```

## nginx Configuration

The deployment script creates this nginx configuration:

- **SPA routing:** All routes serve `index.html`
- **Gzip compression:** Enabled for text/JS/CSS
- **Static asset caching:** 1 year for images/fonts
- **No cache for index.html:** Forces fresh loads
- **Security headers:** X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

### Customizing nginx

To modify nginx configuration:

1. Edit `UI/deploy-web.sh` (search for "nginx.conf")
2. Or edit directly on NAS: `ssh nas@nas-1 "nano 'developer/infrastructure/ZenFlo Web/nginx.conf'"`
3. Test config: `ssh nas@nas-1 "sudo docker exec zenflo-webapp nginx -t"`
4. Reload: `ssh nas@nas-1 "sudo docker exec zenflo-webapp nginx -s reload"`

## Quick Reference

### Common Commands

```bash
# Deploy with defaults
./deploy-web.sh

# Redeploy existing build
./deploy-web.sh --skip-build

# Deploy and skip cache purge
./deploy-web.sh --skip-cache

# Show help
./deploy-web.sh --help
```

### URLs

- **Production:** https://app.zenflo.dev
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Expo Dashboard:** https://expo.dev

### Container Info

- **Name:** `zenflo-webapp`
- **Image:** `nginx:alpine`
- **Network:** `zenflo-network`
- **Restart Policy:** `unless-stopped`

---

**Last Updated:** 2025-11-15
**Maintainer:** ZenFlo Team
