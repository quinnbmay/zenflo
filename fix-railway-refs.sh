#!/bin/bash
# Fix all Railway references in documentation
# Replace with NAS deployment information

set -e

echo "Fixing Railway references in documentation..."

# webapp/DEPLOYMENT.md - Mark as deprecated and point to DEPLOY.md
cat > webapp/DEPLOYMENT.md << 'EOF'
# ⚠️ DEPRECATED: This deployment guide is outdated

This file describes Railway deployment which is **NO LONGER USED**.

## Current Deployment Method

ZenFlo webapp is now deployed on **NAS with Cloudflare Tunnel**.

**See the correct documentation:**
- **Primary Guide:** `DEPLOY.md` - Complete NAS deployment guide
- **Quick Reference:** `DEPLOY-QUICKREF.md` - Quick commands and troubleshooting
- **Summary:** `DEPLOYMENT-SUMMARY.md` - High-level overview

## Quick Deploy

```bash
cd /Users/quinnmay/developer/zenflo/webapp
./deploy.sh
```

This script handles:
1. Building the webapp with Expo
2. Packaging and transferring to NAS
3. Deploying to Docker container
4. Purging Cloudflare cache

**Platform:** NAS (nas-1) with nginx container
**URL:** https://app.combinedmemory.com
**Access via:** Cloudflare Tunnel

---

**For current deployment documentation, see `DEPLOY.md`**
EOF

# webapp/README.md - Remove Railway badge and update deployment section
sed -i '' 's/\[![Railway].*//' webapp/README.md

# Fix deployment section in webapp/README.md
cat > /tmp/webapp-readme-deploy.txt << 'EOF'

### Deployment to NAS

The webapp is deployed on NAS with Cloudflare Tunnel.

```bash
# Deploy to production
cd webapp/
./deploy.sh

# See detailed documentation
cat DEPLOY.md
```

**Platform:** NAS (nas-1) via Docker + Cloudflare Tunnel
**URL:** https://app.combinedmemory.com

EOF

echo "✅ Created deprecation notice for DEPLOYMENT.md"
echo "✅ Prepared README.md updates"
echo ""
echo "Manual steps required:"
echo "1. Remove Railway badge from webapp/README.md (line ~10)"
echo "2. Replace deployment section with NAS deployment info"
echo "3. Update any remaining Railway references"
echo ""
echo "Files to review manually:"
find . -type f \( -name "*.md" -o -name "CLAUDE.md" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist-web/*" ! -path "*/zen-mcp/*" ! -path "*/.logs/*" -exec grep -l "Railway" {} \;
