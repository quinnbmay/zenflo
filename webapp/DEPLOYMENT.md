# ⚠️ DEPRECATED: This deployment guide is outdated

This file describes Railway deployment which is **NO LONGER USED**.

## Current Deployment Method

ZenFlo webapp is now deployed on **NAS with Cloudflare Tunnel**.

**See the correct documentation:**
- **Primary Guide:** `DEPLOY.md` - Complete NAS deployment guide with script options
- **Quick Reference:** `DEPLOY-QUICKREF.md` - Quick commands and troubleshooting
- **Summary:** `DEPLOYMENT-SUMMARY.md` - High-level overview

## Quick Deploy

```bash
cd /Users/quinnmay/developer/zenflo/webapp
./deploy.sh
```

This automated script handles:
1. Building the webapp with Expo (`npx expo export --platform web`)
2. Packaging build as tar.gz archive
3. Transferring to NAS via SCP
4. Extracting and deploying to Docker container (`zenflo-webapp`)
5. Fixing permissions in container
6. Purging Cloudflare cache

**Infrastructure:**
- **Platform:** NAS (nas-1)
- **Container:** `zenflo-webapp` (nginx:alpine)
- **Port:** 8080:80
- **URL:** https://app.combinedmemory.com
- **Access:** Cloudflare Tunnel (replaces port forwarding)

## Script Options

```bash
./deploy.sh                  # Full deployment
./deploy.sh --skip-build     # Use existing build
./deploy.sh --skip-cache     # Skip cache purge
./deploy.sh --help           # Show help
```

## Troubleshooting

### Deployment Issues
```bash
# Check container status
ssh nas@nas-1 "sudo docker ps | grep zenflo-webapp"

# View logs
ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 100"

# Verify Cloudflare Tunnel
ssh nas@nas-1 "sudo docker ps | grep cloudflared"
```

### Changes Not Appearing
1. Wait 2-3 minutes for CDN propagation
2. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Verify cache was purged (check script output)
4. Clear browser cache completely

---

**For complete deployment documentation, see `DEPLOY.md`**
