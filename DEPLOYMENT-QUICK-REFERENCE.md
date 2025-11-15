# 🚀 ZenFlo Deployment Quick Reference

**Last Updated:** 2025-11-15

---

## 🎯 Quick Decision: What Should I Do?

```bash
# Did I change JS/TS code in sources/** or assets/**?
# → Just push to main. OTA auto-deploys (FREE)
git push origin main

# Did I change app.config.js, eas.json, or package.json?
# → Push to main. Native builds auto-trigger
git push origin main

# Do I need a manual native build?
# → Go to GitHub Actions and click "Run workflow"
https://github.com/quinnmay/zenflo/actions

# Did I change web code?
# → Push, then deploy manually
git push origin main
cd UI && ./deploy-web.sh
```

---

## 📊 Workflow Matrix

| Change Type | OTA Update | iOS Build | Android Build | Web Build |
|-------------|-----------|-----------|---------------|-----------|
| **JS/TS code** (sources/**) | ✅ Auto | ❌ Skip | ❌ Skip | ✅ Auto |
| **Assets** (images, fonts) | ✅ Auto | ❌ Skip | ❌ Skip | ✅ Auto |
| **app.config.js** | ❌ Skip | ✅ Auto | ✅ Auto | ✅ Auto |
| **package.json** | ❌ Skip | ✅ Auto | ✅ Auto | ✅ Auto |
| **eas.json** | ❌ Skip | ✅ Auto | ✅ Auto | ✅ Auto |
| **Manual trigger** | 🔘 Manual | 🔘 Manual | 🔘 Manual | 🔘 Manual |

---

## 💰 Cost Per Deployment

| Method | Cost | Speed | When to Use |
|--------|------|-------|-------------|
| **OTA Update** | FREE | 2 min | 95% of changes (JS/TS) |
| **Native Build** | $$ | 30 min | New packages, permissions |
| **Web Deploy** | FREE | 5 min | Web app updates |

---

## 📱 Where Things Go

### OTA Updates
- **Deploys to:** Expo Update servers
- **Users get:** Update on next app launch
- **Platforms:** iOS + Android
- **URL:** https://u.expo.dev/c92795a3-d883-41c0-b761-3effaa823810

### Native Builds
- **iOS:** TestFlight → https://testflight.apple.com
- **Android:** APK download from EAS
- **Platforms:** iOS or Android
- **Build logs:** https://expo.dev/accounts/combinedmemory/projects/happy/builds

### Web Deploy
- **Deploys to:** NAS (nginx)
- **URL:** https://app.zenflo.dev
- **Cloudflare Tunnel:** app.zenflo.dev → localhost:8080

---

## 🔍 Monitoring Commands

```bash
# Check OTA updates
eas update:list --branch production

# Check builds
eas build:list --platform all --limit 5

# Check GitHub Actions
gh run list --limit 10

# View specific build
eas build:view <build-id>

# Cancel build
eas build:cancel <build-id>
```

---

## 🆘 Emergency Commands

```bash
# Rollback OTA update
eas update:republish --branch production --group <previous-group-id>

# Cancel stuck build
eas build:cancel <build-id>

# Force web redeploy
cd UI && ./deploy-web.sh
```

---

**Full Guide:** DEPLOYMENT-STRATEGY.md
**Status Report:** EAS-DEPLOYMENT-STATUS.md
