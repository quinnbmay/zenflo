# Happy Webapp - Web App Deployment Guide

**Repository:** https://github.com/quinnbmay/happy (separate repo from mobile)
**Deployment:** Railway (Combined Memory project)
**URL:** https://app.combinedmemory.com

---

## 🚨 CRITICAL WARNINGS

### ⚠️ Main Branch = Auto-Deploy
Pushing to `main` triggers an **automatic Railway deployment** (2-3 minutes).

```bash
# Pushing to main deploys immediately
git push origin main  # ⚠️ Goes live at app.combinedmemory.com
```

### ✅ No Upstream Risk
Unlike happy-mobile, this repo is safe - no upstream remote to worry about!

```bash
# Check remotes
git remote -v

# You should see:
# origin → quinnbmay/happy (YOUR REPO) ✅
# No upstream remote
```

---

## 🚀 Deployment Method

### Automatic Railway Deployment
**Trigger:** Push to `main` branch
**Time:** 2-3 minutes
**Platform:** Railway (Combined Memory project)

```bash
# 1. Merge feature to main
git checkout main
git merge feature/your-feature

# 2. Final check
git log --oneline -5
git diff origin/main

# 3. Deploy
git push origin main  # ⚠️ Goes live immediately

# 4. Monitor deployment
open https://railway.app/project/e186e870-3aa3-4414-9cca-17ac72e48856
```

**What happens:**
1. GitHub receives push to `main`
2. Railway detects the commit
3. Deploys from pre-built `dist-railway` folder
4. Updates https://app.combinedmemory.com
5. Takes ~2-3 minutes

---

## 🛡️ Safe Development Workflow

### Step 1: Create Feature Branch
```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Step 2: Develop & Test
```bash
# Make your changes
# ...

# Test locally
yarn start

# Run type check
yarn typecheck

# Commit changes
git add .
git commit -m "feat: your feature description"
```

### Step 3: Push Feature Branch (SAFE)
```bash
# Push to feature branch (does NOT trigger deployment)
git push origin feature/your-feature-name
```

### Step 4: Deploy to Production
```bash
# Merge to main
git checkout main
git merge feature/your-feature-name

# FINAL CHECK
git log --oneline -5
git diff origin/main

# Deploy (triggers Railway)
git push origin main  # ⚠️ Goes live
```

---

## 📋 Pre-Deployment Checklist

### Before pushing to `main`:
- [ ] All changes committed
- [ ] Feature branch tested locally
- [ ] `yarn typecheck` passes
- [ ] Checked pre-built `dist-railway` is up-to-date (if modified)
- [ ] Database migrations prepared (if any)
- [ ] Reviewed: `git log --oneline -5`
- [ ] Ready for immediate production deployment

---

## 🔧 Railway Configuration

### Project Details
- **Project:** Combined Memory
- **Project ID:** e186e870-3aa3-4414-9cca-17ac72e48856
- **URL:** https://app.combinedmemory.com
- **Deployment:** Auto from `main` branch

### Services
Railway watches the GitHub repo and auto-deploys on `main` commits.

**Important:** Railway uses **pre-built** `dist-railway` folder.
- Don't rebuild unless absolutely necessary
- Build process is optimized for Railway

---

## 🚨 Emergency Procedures

### Rollback via Git
```bash
# Revert last commit
git checkout main
git revert HEAD
git push origin main  # Triggers Railway deploy with revert
```

### Rollback via Railway Console
1. Go to https://railway.app/project/e186e870-3aa3-4414-9cca-17ac72e48856
2. Find "Combined Memory" or "Happy Coder" service
3. Click deployment history
4. Click "Rollback" on last known good deployment

### Check Deployment Logs
```bash
# View recent logs (requires Railway CLI)
railway logs --recent
```

Or via web:
https://railway.app/project/e186e870-3aa3-4414-9cca-17ac72e48856

---

## 📊 Deployment Comparison

| Action | Time | When to Use |
|--------|------|-------------|
| **Push to main** | 2-3 min | Production deploy |
| **Push to feature branch** | Instant | Development (no deploy) |
| **Railway rollback** | 1-2 min | Emergency revert |

---

## 🔗 Useful Links

- **Production URL:** https://app.combinedmemory.com
- **Railway Project:** https://railway.app/project/e186e870-3aa3-4414-9cca-17ac72e48856
- **GitHub Repo:** https://github.com/quinnbmay/happy
- **Safety Guide:** `/Users/quinnmay/developer/HAPPY_SAFETY_GUIDE.md`

---

## 📞 Quick Help

### "Can I push to main?"
- NO, unless you intend to deploy immediately
- Use feature branches for development
- Only merge to main when ready for production

### "I pushed to main by accident!"
```bash
# Option 1: Revert in Git
git revert HEAD
git push origin main

# Option 2: Rollback in Railway console
# (see Emergency Procedures above)
```

### "Railway deployment failed?"
1. Check Railway logs in console
2. Verify `dist-railway` folder is correct
3. Rollback to previous deployment
4. Fix issue and redeploy

---

**Remember:** Feature branches for development, `main` for production only!

---

# ZenFlo Mobile Deployment Guide (NEW)

**Added:** 2025-11-10
**Deployment Engineer:** Automated OTA deployment script

---

## 📱 Mobile Deployment Overview

ZenFlo mobile uses a two-tier deployment system:

1. **OTA Updates** - Fast JavaScript/TypeScript/asset updates (5-10 minutes)
2. **Native Builds** - Full app builds with native code changes (via EAS Build)

---

## 🚀 OTA Updates (Recommended for Most Changes)

### When to Use OTA

Use OTA updates for:
- Code changes in `sources/` directory
- UI/UX updates
- Bug fixes
- Feature updates (that don't require native code)
- Asset changes (images, fonts, etc.)

### Quick Start - Automated Script

```bash
# Deploy to preview channel
./deploy-ota.sh preview

# Deploy to production channel
./deploy-ota.sh production "Fix voice session crash"
```

### Automated Script Features

The `deploy-ota.sh` script provides:

- ✅ **TypeScript type checking** - Fails if errors exist
- ✅ **Git status validation** - Must be clean before deploy
- ✅ **Native code detection** - Warns if native changes detected
- ✅ **Changelog parsing** - Automatically updates changelog.json
- ✅ **Color-coded output** - Easy to read status messages
- ✅ **Confirmation prompts** - Prevents accidental deployments
- ✅ **Detailed summary** - Shows next steps after deployment

**Exit Codes:**
- `0` - Success
- `1` - Invalid arguments or environment
- `2` - TypeScript errors
- `3` - Git repository not clean
- `4` - Native code changes detected (warning only)
- `5` - Deployment failed

### Manual OTA Deployment

If you need to deploy manually:

**Preview:**
```bash
cd mobile/
yarn ota
```

**Production:**
```bash
cd mobile/
yarn ota:production
```

---

## 🏗️ Native Builds (For Native Code Changes)

### When to Use Native Builds

Use native builds when you change:
- Native dependencies (`package.json` with native modules)
- Native configuration (`app.json`, `app.config.js`)
- Build configuration (`eas.json`)
- iOS project (`ios/` directory)
- Android project (`android/` directory)
- Permissions or capabilities

### Triggering Native Builds

**Automatic (Recommended):**
1. Merge changes to `main` branch
2. GitHub workflows automatically trigger EAS builds
3. Monitor progress at https://expo.dev

**Manual:**
```bash
cd mobile/

# iOS only
eas build --platform ios --profile production

# Android only
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

---

## 📋 Deployment Checklist

### Before Deploying

- [ ] All changes committed to git
- [ ] `yarn typecheck` passes without errors
- [ ] Tested locally with `yarn ios` or `yarn android`
- [ ] Updated `CHANGELOG.md` with version notes
- [ ] Determined if OTA or native build is needed

### OTA Deployment Steps

1. **Ensure repository is clean**
   ```bash
   git status  # Should show "working tree clean"
   ```

2. **Run the deployment script**
   ```bash
   ./deploy-ota.sh production "Your deployment message"
   ```

3. **Monitor deployment**
   - Check https://expo.dev for deployment status
   - Verify update appears in EAS dashboard

4. **Verify update reaches users**
   - Wait 5-10 minutes for propagation
   - Test on physical device (force close and reopen app)

---

## 🐛 Troubleshooting

### Script Reports Uncommitted Changes

**Error:**
```
✗ Git repository has uncommitted changes
```

**Solution:**
```bash
# Commit your changes
git add .
git commit -m "Your commit message"

# Or stash them
git stash
```

### TypeScript Errors

**Error:**
```
✗ TypeScript type check failed
```

**Solution:**
```bash
# View errors in detail
yarn typecheck

# Fix errors and try again
```

### Native Code Changes Detected

**Warning:**
```
⚠ Native code changes detected
```

**Solution:**
- If you intended to change native code, create a native build instead
- If not, proceed with OTA (script will prompt for confirmation)

### Deployment Fails

**Error:**
```
✗ Production OTA deployment failed
```

**Common causes:**
1. **Not logged into EAS CLI**
   ```bash
   eas login
   ```

2. **Network issues** - Retry deployment

3. **Build errors** - Check logs at https://expo.dev

---

## 🎯 Best Practices

1. **Always run typecheck** before deploying
   ```bash
   yarn typecheck
   ```

2. **Test locally first**
   ```bash
   yarn ios     # Test on iOS
   yarn android # Test on Android
   ```

3. **Deploy preview first** before production
   ```bash
   ./deploy-ota.sh preview
   # Test thoroughly
   ./deploy-ota.sh production "Your message"
   ```

4. **Use descriptive deployment messages**
   - ❌ Bad: "fix"
   - ✅ Good: "Fix voice session crash on iOS"

5. **Update changelog** before deploying
   - Update `CHANGELOG.md` with version notes
   - Script automatically parses it

6. **Commit before deploying**
   - Never deploy with uncommitted changes
   - Ensures reproducibility

---

## 🔗 Quick Links

- **EAS Dashboard:** https://expo.dev
- **Project README:** `mobile/README.md`
- **Project Guide:** `mobile/CLAUDE.md`
- **Monorepo Guide:** `../MONOREPO.md`
- **EAS Update Docs:** https://docs.expo.dev/eas-update/introduction/
