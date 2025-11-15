# ZenFlo Deployment

## Manual Deployments Only

All deployments are **manual** - nothing auto-triggers on push.

### OTA Update (JS/TS changes)
```bash
cd UI && yarn ota:production
# Or: GitHub Actions → Deploy OTA Update → Run workflow
```

### Native Build (config/package changes)
```bash
# GitHub Actions → Deploy iOS/Android → Run workflow
# Or: cd UI && eas build --platform ios --profile production
```

### Web
```bash
cd UI && ./deploy-web.sh
```

## Auto-Triggers on Push

| File Changed | iOS | Android | OTA | Web |
|--------------|-----|---------|-----|-----|
| app.config.js | ✅ | ✅ | - | - |
| eas.json | ✅ | ✅ | - | - |
| package.json | ✅ | ✅ | - | - |
| plugins/** | ✅ | ✅ | - | - |
| Everything else | - | - | - | - |

## Monitor
```bash
gh run list --limit 10
eas build:list --limit 5
```
