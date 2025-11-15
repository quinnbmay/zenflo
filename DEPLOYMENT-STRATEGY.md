# ZenFlo Deployment Strategy
**Last Updated:** 2025-11-15
**Status:** Optimized for Cost & Clarity

---

## 🎯 Quick Decision Guide

### "I just changed some code..."

```
┌─────────────────────────────────────────────────────────────┐
│ What did you change?                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ JS/TS code in sources/**                                │
│ ✅ UI components, screens, hooks                           │
│ ✅ Styles, translations                                    │
│ ✅ Assets (images, fonts)                                  │
│                                                             │
│    → Use OTA UPDATE (free, automatic)                      │
│    → Just push to main - done!                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️  package.json (new native dependency)                   │
│ ⚠️  app.config.js (permissions, config)                    │
│ ⚠️  eas.json (build profiles)                              │
│ ⚠️  plugins/** (custom native modules)                     │
│ ⚠️  ios/**, android/** (native code)                       │
│                                                             │
│    → Use NATIVE BUILD (costs credits)                      │
│    → Manual trigger via GitHub Actions UI                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🌐 Web-only changes                                        │
│                                                             │
│    → Auto-builds on push, manual deploy                    │
│    → Run: cd UI && ./deploy-web.sh                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Methods

### 1. OTA Updates (Over-The-Air)
**Use for:** 95% of your changes
**Cost:** Free (no build credits)
**Speed:** ~2 minutes
**Platform:** iOS + Android

**What it updates:**
- ✅ JavaScript/TypeScript code
- ✅ React components
- ✅ Styles (Unistyles)
- ✅ Translations (i18n)
- ✅ Assets (images, fonts)
- ✅ App logic, screens, hooks

**What it CANNOT update:**
- ❌ Native dependencies
- ❌ Permissions
- ❌ App configuration
- ❌ Native modules

**How to deploy:**
```bash
# Automatic (recommended)
git push origin main
# If changes in UI/sources/** or UI/assets/**, OTA auto-deploys

# Manual
cd UI/
yarn ota:production
```

**GitHub Actions:** `.github/workflows/deploy-ota.yml`
**Triggers:** Changes to `UI/sources/**` or `UI/assets/**`

---

### 2. Native Builds (EAS)
**Use for:** ~5% of changes
**Cost:** Uses build credits (100% used - now pay-as-you-go)
**Speed:** ~20-40 minutes
**Platform:** iOS or Android

**When required:**
- ✅ New npm packages with native code
- ✅ Permissions changes (microphone, camera, etc.)
- ✅ App config changes (app.config.js)
- ✅ Build profile changes (eas.json)
- ✅ Custom native modules (plugins/**)
- ✅ iOS/Android specific code

**How to deploy:**

**Option A: Manual Trigger (Recommended)**
1. Go to https://github.com/quinnmay/zenflo/actions
2. Select "Deploy iOS (Native Build)" or "Deploy Android (Native Build)"
3. Click "Run workflow" → Select branch `main` → Click "Run"

**Option B: Auto-trigger (on native file changes)**
Workflows auto-trigger on changes to:
- `UI/app.config.js`
- `UI/eas.json`
- `UI/package.json`
- `UI/plugins/**`
- `UI/ios/**` or `UI/android/**`

**Option C: Command Line**
```bash
cd UI/

# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Both
eas build --platform all --profile production
```

**GitHub Actions:**
- `.github/workflows/deploy-ios.yml`
- `.github/workflows/deploy-android.yml`

---

### 3. Web Deployment
**Use for:** Web app updates
**Cost:** Free (no build credits)
**Speed:** ~5 minutes
**Platform:** Web only

**What it deploys:**
- Entire React Native Web build
- Served from NAS via nginx
- Accessible at https://app.zenflo.dev

**How to deploy:**

**Option A: Manual (Recommended)**
```bash
cd UI/
./deploy-web.sh
```

**Option B: GitHub Actions (builds only, manual deploy)**
```bash
# GitHub Actions builds on push to main with UI/** changes
# Then manually deploy using deploy-web.sh
```

**GitHub Actions:** `.github/workflows/deploy-web.yml`
**Note:** Workflow only builds, doesn't auto-deploy. Use deploy-web.sh to deploy.

---

## 🚀 Common Workflows

### Workflow 1: "I fixed a bug in the code"
```bash
# 1. Make changes in UI/sources/
# 2. Commit and push
git add .
git commit -m "fix: resolve login issue"
git push origin main

# 3. Done! OTA auto-deploys to iOS/Android in ~2 minutes
# Web auto-builds, then run: cd UI && ./deploy-web.sh
```

### Workflow 2: "I added a new npm package (pure JS)"
```bash
# 1. Install package
cd UI/
yarn add some-pure-js-package

# 2. Use it in code
# 3. Commit and push
git add .
git commit -m "feat: add new utility package"
git push origin main

# 4. Done! OTA auto-deploys
```

### Workflow 3: "I added a native dependency"
```bash
# 1. Install package
cd UI/
yarn add react-native-some-native-module

# 2. Commit changes
git add .
git commit -m "feat: add native camera module"
git push origin main

# 3. Trigger native build
# Go to GitHub Actions → "Deploy iOS (Native Build)" → "Run workflow"
# Wait ~30 minutes for build

# 4. Install via TestFlight (iOS) or download APK (Android)
```

### Workflow 4: "I changed permissions in app.config.js"
```bash
# 1. Edit UI/app.config.js
# 2. Commit and push
git add .
git commit -m "feat: add location permission"
git push origin main

# 3. Native build auto-triggers (app.config.js changed)
# OR manually trigger via GitHub Actions

# 4. Install new build via TestFlight/APK
```

### Workflow 5: "I updated web-only code"
```bash
# 1. Make changes in UI/sources/
# 2. Commit and push
git add .
git commit -m "fix: web navigation issue"
git push origin main

# 3. Wait for GitHub Actions build (~2 min)
# 4. Deploy manually
cd UI/
./deploy-web.sh

# 5. Done! Visit https://app.zenflo.dev
```

---

## 💰 Cost Optimization

### Build Credits
- **Included:** Limited per month (currently 100% used)
- **Pay-as-you-go:** Additional builds charged per build
- **Billing:** https://expo.dev/accounts/combinedmemory/settings/billing

### Best Practices
1. ✅ **Always use OTA first** - It's free and instant
2. ✅ **Batch native changes** - Don't trigger builds for every tweak
3. ✅ **Use manual triggers** - Only build when truly necessary
4. ✅ **Test locally first** - Use `yarn ios` or `yarn android` before building
5. ❌ **Don't auto-trigger native builds** - Too expensive

### Current Optimization
- ✅ OTA updates: **Automatic** (free)
- ✅ Native builds: **Manual only** (or auto on native file changes)
- ✅ Web builds: **Automatic** (free, just validates)

---

## 📊 Monitoring Deployments

### Check OTA Update Status
```bash
eas update:list --branch production
```

### Check Build Status
```bash
eas build:list --platform all --limit 5
```

### Check GitHub Actions
```bash
gh run list --limit 10
```

### View Specific Build
```bash
# Get build ID from build:list
eas build:view <build-id>
```

---

## 🎭 Where Things Deploy

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  CODE CHANGE                                           │
│       ↓                                                │
│       ↓ (git push origin main)                         │
│       ↓                                                │
│  ┌────┴────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  UI/sources/** or UI/assets/**                  │  │
│  │  ↓                                               │  │
│  │  OTA Update Workflow                             │  │
│  │  ↓                                               │  │
│  │  📱 DEPLOYS TO:                                  │  │
│  │     • Expo Updates Server                        │  │
│  │     • Users get update on next app open          │  │
│  │     • iOS + Android                              │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  UI/app.config.js or package.json (native)      │  │
│  │  ↓                                               │  │
│  │  Native Build Workflow (Manual Trigger)          │  │
│  │  ↓                                               │  │
│  │  📦 DEPLOYS TO:                                  │  │
│  │     • EAS Build Servers                          │  │
│  │     • TestFlight (iOS)                           │  │
│  │     • APK download (Android)                     │  │
│  │     • Requires manual install                    │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  UI/** (any changes)                             │  │
│  │  ↓                                               │  │
│  │  Web Build Workflow                              │  │
│  │  ↓                                               │  │
│  │  🌐 BUILDS (then manual deploy):                │  │
│  │     • GitHub Actions builds                      │  │
│  │     • Run: cd UI && ./deploy-web.sh              │  │
│  │     • Deploys to NAS (nginx)                     │  │
│  │     • https://app.zenflo.dev                     │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration Files

### GitHub Actions Workflows
- `.github/workflows/deploy-ota.yml` - OTA updates (automatic)
- `.github/workflows/deploy-ios.yml` - iOS native builds (manual)
- `.github/workflows/deploy-android.yml` - Android native builds (manual)
- `.github/workflows/deploy-web.yml` - Web builds (automatic)

### EAS Configuration
- `UI/eas.json` - Build profiles
- `UI/app.config.js` - App configuration
- `UI/.easignore` - Files to exclude from builds

### Secrets Required
- `EXPO_TOKEN` - Set in GitHub repo secrets

---

## 🆘 Troubleshooting

### "My OTA update isn't showing up"
1. Check update was deployed: `eas update:list --branch production`
2. Force close app and reopen
3. Check runtime version matches in app.config.js

### "Native build failed"
1. Check logs: `eas build:view <build-id>`
2. Verify all dependencies installed
3. Check for TypeScript errors: `cd UI && yarn typecheck`

### "I need to cancel a build"
```bash
eas build:cancel <build-id>
```

### "How do I know which deployment method to use?"
See the decision guide at the top of this document.

---

**Generated:** 2025-11-15
**Maintained by:** ZenFlo Team
