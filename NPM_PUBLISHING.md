# NPM Publishing Guide

**Last Updated:** 2025-11-10

---

## Published Packages

### `zenflo` (CLI Package)

**⚠️ IMPORTANT:** The published `zenflo` npm package is in a **separate repository**:

- **Published Package:** https://www.npmjs.com/package/zenflo
- **Source Repository:** https://github.com/combinedmemory/zenflo
- **Current Version:** 0.11.6
- **Last Published:** 2025-11-10

**This repository** (`quinnbmay/zenflo`) contains the mobile/web app, NOT the CLI package.

---

## Package Overview

### `zenflo` CLI

The `zenflo` npm package provides command-line tools for ZenFlo:

```bash
# Install globally
npm install -g zenflo

# Or run with npx
npx zenflo
```

**Binaries:**
- `zenflo` - Main CLI interface
- `zenflo-mcp` - MCP server executable

**Purpose:**
- Mobile and Web client for Claude Code and Codex
- ZenFlo CLI wrapper
- MCP server integration

---

## How to Update the npm Package

### 1. Clone the CLI Repository

```bash
# Navigate to your developer directory
cd ~/developer

# Clone the CLI repo (if not already cloned)
git clone git@github.com:combinedmemory/zenflo.git zenflo-cli
cd zenflo-cli
```

### 2. Make Changes

```bash
# Create feature branch
git checkout -b feature/my-update

# Make your changes
# ... edit files ...

# Test locally
npm install
npm run build
npm link  # Test globally
```

### 3. Update Version

```bash
# Bump version (choose one)
npm version patch  # 0.11.6 → 0.11.7 (bug fixes)
npm version minor  # 0.11.6 → 0.12.0 (new features)
npm version major  # 0.11.6 → 1.0.0 (breaking changes)
```

### 4. Build and Publish

```bash
# Build the package
npm run build

# Publish to npm (requires npm login)
npm publish

# Push version commit and tag
git push origin main --tags
```

### 5. Verify Publication

```bash
# Check published version
npm view zenflo version

# Test installation
npm install -g zenflo@latest
zenflo --version
```

---

## Other ZenFlo Packages

### `@combinedmemory/mcp` (Latest: v1.0.7)

**Published:** 2025-10-24
**Package:** https://www.npmjs.com/package/@combinedmemory/mcp

MCP server for Combined Memory API - AI-powered chat with unlimited context.

### `combined-memory-mcp` (Latest: v1.0.1)

**Published:** 2025-10-24
**Package:** https://www.npmjs.com/package/combined-memory-mcp

Older unscoped version of Combined Memory MCP server.

---

## This Repository (Mobile/Web App)

**Repository:** https://github.com/quinnbmay/zenflo
**Purpose:** Mobile and web applications
**Publishing:** NOT published to npm (private monorepo)

### Deployment (Not npm)

This repository deploys via:

- **Mobile:** EAS Build + OTA Updates
- **Webapp:** Railway (auto-deploy on push to `main`)
- **Backend:** Docker on NAS (self-hosted)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

---

## Quick Reference

### Check Published Version

```bash
npm view zenflo version
```

### Install Latest Version

```bash
npm install -g zenflo@latest
```

### Clone CLI Repository

```bash
git clone git@github.com:combinedmemory/zenflo.git zenflo-cli
```

### Publish New Version

```bash
cd ~/developer/zenflo-cli
npm version patch
npm run build
npm publish
git push origin main --tags
```

---

## Common Issues

### "This package is private"

If you see this error, you're trying to publish from the wrong repository. The mobile/web app repository (`quinnbmay/zenflo`) has `"private": true` in package.json and should NOT be published to npm.

Use the CLI repository (`combinedmemory/zenflo`) instead.

### "You do not have permission to publish"

Make sure you're logged in with the correct npm account:

```bash
npm whoami  # Check current user
npm login   # Login if needed
```

The `zenflo` package is owned by the `combinedmemory` npm account.

---

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy mobile/web apps
- [README.md](./README.md) - Project overview
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
