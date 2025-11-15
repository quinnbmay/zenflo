# ZenFlo Mobile OTA Deployment - Quick Start

## TL;DR

```bash
# Deploy to preview
./deploy-ota.sh preview

# Deploy to production
./deploy-ota.sh production "Your change description"
```

## Pre-Deployment Checklist

- [ ] `yarn typecheck` passes
- [ ] Git repository is clean (`git status`)
- [ ] Changes only affect JS/TS/assets (not native code)
- [ ] Updated `CHANGELOG.md`

## What the Script Does

1. Checks TypeScript types
2. Validates git status is clean
3. Warns if native code changed
4. Parses changelog
5. Asks for confirmation
6. Deploys OTA update
7. Shows summary with next steps

## When NOT to Use OTA

Create a native build instead if you changed:
- `package.json` (native dependencies)
- `app.json` or `app.config.js`
- `ios/` or `android/` directories
- `eas.json`
- Added new permissions

## Troubleshooting

**"Uncommitted changes"**
```bash
git add . && git commit -m "Your message"
```

**"TypeScript errors"**
```bash
yarn typecheck  # Fix errors shown
```

**"Not logged into EAS"**
```bash
eas login
```

## Update Propagation

- Takes **5-10 minutes** to reach users
- Users get update on **next app open**
- Force close app to test immediately

## Monitoring

- EAS Dashboard: https://expo.dev
- Check deployment status and logs

## Full Documentation

See `DEPLOYMENT.md` for complete deployment guide.
