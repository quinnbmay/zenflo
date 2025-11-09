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
