# ZenFlo Deployment

## Quick Guide

### Changed JS/TS code?
```bash
git push  # OTA auto-deploys (free)
```

### Changed app.config.js or package.json?
```bash
git push  # Native builds auto-trigger
```

### Need manual native build?
https://github.com/quinnmay/zenflo/actions → Run workflow

### Changed web code?
```bash
git push && cd UI && ./deploy-web.sh
```

## Workflows

| Trigger | iOS | Android | OTA | Web |
|---------|-----|---------|-----|-----|
| sources/** | - | - | ✅ | ✅ |
| assets/** | - | - | ✅ | ✅ |
| app.config.js | ✅ | ✅ | - | ✅ |
| package.json | ✅ | ✅ | - | ✅ |

## Costs

- OTA: Free
- Native: $$
- Web: Free

## Monitor

```bash
eas update:list --branch production
eas build:list --limit 5
gh run list --limit 10
```

## Rollback

```bash
eas update:republish --branch production --group <prev-id>
```
