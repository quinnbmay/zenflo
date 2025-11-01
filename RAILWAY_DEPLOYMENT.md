# Railway Deployment Guide for Happy Web App

## Overview
This document provides critical deployment instructions for the Happy web app on Railway at https://app.combinedmemory.com/

**IMPORTANT: Read this entire document before making ANY changes to the deployment configuration.**

## Current Working Configuration

### Repository Details
- **Repository**: `quinnbmay/happy` (forked from `slopus/happy`)
- **Branch**: `main`
- **Working Commit**: `09ae8bd` - "Add pre-built Happy web app for Railway deployment"
- **Deployment URL**: https://app.combinedmemory.com/
- **Railway Project**: Combined Memory
- **Railway Service**: Web App

### Critical Files
```
happy-mobile/
├── Dockerfile.railway          # NGINX configuration for serving static files
├── dist-railway/               # Pre-built web app bundle (DO NOT REBUILD)
│   ├── index.html             # Entry point
│   └── _expo/static/js/web/
│       └── index-1b4dcec35e68ae97c7600a69367e3fb7.js  # Working bundle
├── app.config.js              # Expo configuration (DO NOT CHANGE DEFAULT VARIANT)
└── sources/realtime/
    └── RealtimeVoiceSession.tsx  # ElevenLabs voice agent configuration
```

### Voice Agent Configuration
**CRITICAL: DO NOT MODIFY THE VOICE AGENT**

The app uses a custom ElevenLabs voice agent:
- **Agent ID**: `agent_1001k8zw6qdvfz7v2yabcqs8zwde`
- **File**: `sources/realtime/RealtimeVoiceSession.tsx`
- This is a custom-configured voice agent - do NOT change to generic/default agents

## Deployment Process

### Normal Deployment
Railway auto-deploys when code is pushed to the `main` branch:

```bash
# Make your changes (if needed)
git add .
git commit -m "Your commit message"
git push origin main

# Railway will automatically build and deploy
# Wait 1-2 minutes for deployment to complete
# Verify at https://app.combinedmemory.com/
```

### Emergency Recovery (If App Breaks)
If the app shows a blank screen or fails to load:

```bash
cd /Users/quinnmay/developer/happy-mobile

# Reset to last known working commit
git reset --hard 09ae8bd

# Force push to trigger Railway redeployment
git push origin main --force

# Wait 1-2 minutes for Railway to rebuild
# Clear browser cache or test in incognito mode
```

## CRITICAL: What NOT to Change

### ❌ DO NOT Change `app.config.js` Default Variant
```javascript
// ❌ WRONG - This breaks the app
const variant = process.env.APP_ENV || 'production';

// ✅ CORRECT - Keep as development
const variant = process.env.APP_ENV || 'development';
```

**Why**: Changing the default to 'production' alters the build configuration and breaks the web app.

### ❌ DO NOT Modify `Dockerfile.railway` Nginx Configuration
```nginx
# ❌ WRONG - Adding headers breaks nginx
server {
    add_header Content-Security-Policy "upgrade-insecure-requests";
    # ... rest of config
}

# ✅ CORRECT - Keep simple nginx config
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
}
```

**Why**: Adding security headers or modifying the nginx configuration causes syntax errors and prevents the container from starting.

### ❌ DO NOT Rebuild the Web App
```bash
# ❌ WRONG - Don't rebuild unless absolutely necessary
yarn expo export --platform web --output-dir dist-railway --clear

# ✅ CORRECT - Use existing pre-built bundle
# Just commit and push changes to non-build files
```

**Why**: The current `dist-railway` folder contains a working pre-built bundle. Rebuilding may introduce errors or change the bundle hash, breaking the deployment.

### ❌ DO NOT Change Voice Agent Configuration
```javascript
// ❌ WRONG - Don't change to generic agent
agentId: 'default-eleven-labs-agent'

// ✅ CORRECT - Keep custom agent
agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde'
```

**Why**: The custom voice agent is specifically configured for this deployment. Changing it will break voice functionality.

## What You CAN Safely Change

### ✅ Text/Translation Changes
- Update translation files in `sources/text/translations/`
- Modify text strings in components
- **Note**: These changes won't appear until you rebuild the web app (not recommended)

### ✅ Image Assets
- Replace logo files in `sources/assets/images/`
- Update favicon
- **Note**: These changes won't appear until you rebuild the web app (not recommended)

### ✅ Non-Web Code
- Update mobile-specific code (iOS/Android)
- Modify native modules
- Change mobile app configuration

## Rebranding Process (If Needed)

If you absolutely must rebrand the web app (change name, logos, etc.):

1. **Backup Current State**
   ```bash
   git branch backup-working-$(date +%Y%m%d)
   ```

2. **Make Changes to Translation Files Only**
   - Edit `sources/text/_default.ts`
   - Change app name strings
   - DO NOT touch `app.config.js`

3. **Replace Image Assets**
   - Replace `sources/assets/images/logo-white.png`
   - Replace `sources/assets/images/logo-black.png`
   - Replace `sources/assets/images/icon.png`
   - Replace `sources/assets/images/favicon.png`

4. **Rebuild Web App** (High Risk)
   ```bash
   # Clear caches
   rm -rf dist-railway .expo node_modules/.cache

   # Rebuild
   yarn expo export --platform web --output-dir dist-railway --clear

   # Test locally first
   cd dist-railway && npx serve
   # Open http://localhost:3000 and verify app works

   # If working, commit and push
   git add .
   git commit -m "Rebrand to [New Name]"
   git push origin main
   ```

5. **If Rebuild Fails**
   ```bash
   # Immediately revert
   git reset --hard backup-working-$(date +%Y%m%d)
   git push origin main --force
   ```

## Troubleshooting

### Blank/Grey Screen
**Symptoms**: App loads but shows blank grey screen, no content

**Cause**: JavaScript bundle failed to load or execute

**Fix**:
```bash
# 1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
# 2. Try incognito/private browsing mode
# 3. If still broken, reset to working commit:
git reset --hard 09ae8bd
git push origin main --force
```

### Mixed Content Warnings
**Symptoms**: Browser console shows "Mixed Content" warnings about HTTP resources

**Impact**: Cosmetic warning only - app still works

**Fix**: Ignore these warnings. DO NOT attempt to fix by adding security headers to nginx.

### Railway Deployment Failed
**Symptoms**: Railway shows deployment failed or build error

**Fix**:
```bash
# Check Railway logs in browser at https://railway.app
# If nginx config error, revert Dockerfile changes
git reset --hard 09ae8bd
git push origin main --force
```

### Voice Agent Not Working
**Symptoms**: Voice functionality doesn't respond or errors

**Fix**: Verify `sources/realtime/RealtimeVoiceSession.tsx` has correct agent ID:
```javascript
agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde'
```

## Verification Checklist

After any deployment, verify:

- [ ] App loads at https://app.combinedmemory.com/
- [ ] No blank/grey screen - content is visible
- [ ] Title shows "Happy" in browser tab
- [ ] Voice button is visible and clickable
- [ ] Console has no critical errors (warnings are OK)
- [ ] JavaScript bundle URL in HTML matches deployed file:
  ```bash
  curl -s https://app.combinedmemory.com/ | grep script
  # Should show: index-1b4dcec35e68ae97c7600a69367e3fb7.js
  ```

## Additional Notes

### Railway Configuration
- **Auto-Deploy**: Enabled from `main` branch
- **Build Command**: Uses `Dockerfile.railway`
- **Port**: 80 (nginx)
- **Domain**: app.combinedmemory.com (via Cloudflare)

### Cloudflare Settings
- Railway deployment goes through Cloudflare CDN
- Cache may take 1-2 minutes to update after deployment
- Always test in incognito mode after deployment

### Git Workflow
- **DO NOT** force push unless recovering from broken deployment
- **DO** create backup branches before risky changes
- **DO** test locally with `npx serve dist-railway` before deploying

## Contact/Support

For issues or questions about this deployment:
- Check Railway logs: https://railway.app
- Review this document thoroughly before making changes
- Test all changes locally before pushing to production
