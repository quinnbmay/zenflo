# ZenFlo Deployment

Manual deployments only. No GitHub Actions.

## OTA Update (JS/TS changes)
```bash
cd UI && yarn ota:production
```

## Native Build (config/package changes)
```bash
cd UI && eas build --platform ios --profile production
cd UI && eas build --platform android --profile production
```

## Web
```bash
cd UI && ./deploy-web.sh
```

## Monitor
```bash
eas update:list --branch production
eas build:list --limit 5
```
