# Railway Deployment Guide for Combined Memory Coder Web App

## Overview
This document provides deployment instructions for the Combined Memory Coder web app on Railway.

**IMPORTANT: This is a custom iOS-only app. Web deployment is for testing purposes only.**

## Current Configuration

### Repository Details
- **Repository**: `quinnbmay/happy` (customized fork for Combined Memory)
- **Branch**: `main`
- **Platform**: iOS production only
- **Web Export**: For testing purposes
- **Railway Project**: Combined Memory
- **Railway Service**: Web App (if deployed)

### App Configuration
```
App Name: Combined Memory Coder
Bundle ID: com.combinedmemory.coder
Platform: iOS only (production)
Branding: Quinn Code Q icons
```

### Critical Files
```
happy-mobile/
├── app.config.js              # iOS-only production config
├── dist/                       # Web export output (for testing)
├── sources/assets/images/
│   ├── Q ICON BLACK.png       # Header icon (1.1 MB)
│   ├── QUINN CODE.png         # Logo (188 KB)
│   └── Icon-iOS-Default-1024x1024@1x.png  # iOS app icon
└── sources/components/        # React Native components
```

## Web Export (For Testing)

To export the web version for testing:

```bash
# Export web app
npx expo export --platform web

# Test locally
npx serve dist
# Open http://localhost:8000
```

## Railway Deployment (Optional)

If deploying to Railway for web testing:

```bash
# 1. Make changes
git add .
git commit -m "Your commit message"
git push origin main

# 2. Railway auto-deploys from main branch
# Wait 1-2 minutes for deployment
```

## iOS Production Build

The primary use case is iOS. Build with Expo EAS:

```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production

# Or build locally
eas build --platform ios --profile production --local
```

## What Has Changed

### Removed
- ❌ Android support
- ❌ Preview/development environment variants
- ❌ Happy branding
- ❌ Environment-based conditional logic

### Updated
- ✅ All branding to Quinn Code Q icons
- ✅ iOS app icon (1024x1024)
- ✅ Header icons (Q ICON BLACK.png)
- ✅ Welcome/login screens (QUINN CODE.png)
- ✅ App config simplified to production iOS only

## Current Branding Assets

All Happy logos replaced with:
- **Main Logo**: `QUINN CODE.png` (188 KB) - Used on welcome/settings screens
- **Header Icon**: `Q ICON BLACK.png` (1.1 MB) - Used in all navigation headers
- **iOS App Icon**: `Icon-iOS-Default-1024x1024@1x.png` (1.1 MB)

## Connected Services

- **LibreChat Backend**: chat.combinedmemory.com
- **MongoDB**: Railway hosted database
- **LiveKit Voice**: Real-time voice AI interactions
- **Expo Updates**: OTA updates for app

## Troubleshooting

### Web Export Issues
If web export shows old branding:

```bash
# Clear cache and rebuild
rm -rf dist .expo/web-cache
npx expo export --platform web
```

### iOS Build Issues
If iOS build fails:

```bash
# Clear Expo cache
npx expo start -c

# Or rebuild with EAS
eas build --platform ios --profile production --clear-cache
```

## Verification Checklist

After deployment:

- [ ] Q icon appears in headers (not white square)
- [ ] QUINN CODE logo on welcome/login screens
- [ ] iOS app icon shows Q branding
- [ ] App name shows "Combined Memory Coder"
- [ ] No Android-related errors in logs
- [ ] No environment variant warnings

## Important Notes

### Platform Focus
- **Primary**: iOS production app
- **Secondary**: Web export for testing only
- **Not Supported**: Android

### Configuration
- Single production configuration only
- No environment variants (development/preview removed)
- Simplified bundle ID: com.combinedmemory.coder

### Branding
- All Happy branding replaced with Q branding
- Custom Quinn Code assets throughout
- tintColor removed from headers to show actual Q icon

## Contact

For deployment issues:
- Email: quinn@combinedmemory.com
- Repository: https://github.com/quinnbmay/happy

---

**Note**: This is a customized fork of Happy Coder for internal use by Quinn May at Combined Memory. Focus is on iOS production builds, not web deployment.

Original project: [Happy Coder](https://github.com/slopus/happy)
