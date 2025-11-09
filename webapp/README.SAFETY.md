# Happy Webapp - Quick Safety Reference

## 🚨 Critical Rules

1. **NEVER** push to `main` unless you want immediate deploy
2. **ALWAYS** use feature branches
3. **CHECK** before pushing (Railway deploys in 2-3 min)

## Quick Commands

### Safe Development
```bash
# Create feature branch
git checkout -b feature/my-change

# Push feature branch (SAFE - no deploy)
git push origin feature/my-change
```

### Deploy to Production
```bash
# Deploys to app.combinedmemory.com (2-3 min)
git checkout main
git merge feature/my-change
git push origin main  # ⚠️ Goes live immediately
```

## Pre-Push Protection

Git hook installed! You'll be warned before pushing to:
- ⚠️ `main` branch (requires confirmation)

## Emergency Rollback

### Via Git
```bash
git revert HEAD
git push origin main
```

### Via Railway Console
https://railway.app/project/e186e870-3aa3-4414-9cca-17ac72e48856

## Full Documentation

- **Complete Guide:** `DEPLOYMENT.md`
- **Safety Guide:** `/Users/quinnmay/developer/HAPPY_SAFETY_GUIDE.md`
- **Production URL:** https://app.combinedmemory.com
