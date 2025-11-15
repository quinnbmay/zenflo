# Railway Deployment Configuration

This document explains the Railway deployment setup for the ZenFlo monorepo.

## Overview

The ZenFlo webapp is deployed on Railway at https://app.zenflo.dev. The configuration ensures that Railway **only deploys when webapp-specific files change**, avoiding unnecessary deployments when other parts of the monorepo (backend, mobile, cli) are updated.

## Configuration Files

### `railway.json` (Monorepo Root)
Main Railway configuration that controls deployment behavior:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "webapp/Dockerfile.railway",
    "dockerContext": ".",
    "watchPaths": [
      "webapp/dist-web/**",
      "webapp/Dockerfile.railway",
      "webapp/package.json"
    ]
  }
}
```

**Key Settings:**
- `dockerfilePath`: Points to webapp's Dockerfile
- `dockerContext`: Uses monorepo root (`.`) as build context
- `watchPaths`: **CRITICAL** - Only triggers builds when these files change:
  - `webapp/dist-web/**` - Pre-built deployment artifacts
  - `webapp/Dockerfile.railway` - Docker configuration
  - `webapp/package.json` - Dependency changes

### `.railwayignore` (Monorepo Root)
Tells Railway which files to exclude from the build:

- Ignores other workspaces: `/backend`, `/mobile`, `/cli`, `/zen-mcp`
- Ignores documentation: `*.md` files (except webapp's)
- Ignores development files: `.vscode`, test files, etc.
- Ignores build artifacts from other workspaces

### `webapp/Dockerfile.railway`
Production Dockerfile that:
- Uses nginx:alpine base image
- Copies pre-built `webapp/dist-web/` folder
- Configures nginx for SPA routing
- Exposes port 80

## Deployment Flow

### When Webapp Changes (Triggers Deploy ✅)

1. **Make webapp changes** locally:
   ```bash
   cd webapp
   # Edit source files
   yarn build  # Build to dist-web/
   ```

2. **Commit and push**:
   ```bash
   git add webapp/dist-web webapp/package.json
   git commit -m "webapp: Update feature X"
   git push origin main
   ```

3. **Railway detects changes** in watch paths:
   - Sees changes in `webapp/dist-web/`
   - Triggers automatic deployment
   - Builds using `webapp/Dockerfile.railway`
   - Deploys to https://app.zenflo.dev
   - Takes ~2-3 minutes

### When Other Code Changes (No Deploy ❌)

1. **Make changes to backend, mobile, cli, or docs**:
   ```bash
   # Edit files in backend/, mobile/, cli/, zen-mcp/, *.md
   git add backend/ mobile/ cli/ README.md
   git commit -m "backend: Add new API endpoint"
   git push origin main
   ```

2. **Railway ignores these changes**:
   - No files in `watchPaths` were modified
   - Railway doesn't trigger a build
   - Webapp deployment unaffected
   - Saves time and resources ✅

## Important Notes

### Pre-Built Deployment
The webapp uses **pre-built artifacts** from `webapp/dist-web/`:
- ✅ Build locally with `yarn build`
- ✅ Commit `dist-web/` folder
- ✅ Railway serves pre-built files
- ❌ Do NOT rebuild on Railway (faster deploys)

### Monorepo Structure
Railway supports monorepo deployments through:
- **Root-level `railway.json`**: Controls all Railway services
- **Selective watch paths**: Only monitors relevant directories
- **Explicit build context**: Uses monorepo root with webapp Dockerfile

### Multiple Services
If you add more Railway services (e.g., backend API):
1. Create separate Railway project for each service
2. Configure different watch paths for each
3. Use Railway's multi-service support

Example for future backend service:
```json
{
  "build": {
    "dockerfilePath": "backend/Dockerfile",
    "watchPaths": [
      "backend/**",
      "!backend/node_modules"
    ]
  }
}
```

## Testing the Configuration

### Test Watch Paths
```bash
# These should trigger Railway deploy:
touch webapp/dist-web/index.html
git add webapp/ && git commit -m "test" && git push

# These should NOT trigger Railway deploy:
touch backend/README.md
git add backend/ && git commit -m "test" && git push

touch mobile/package.json
git add mobile/ && git commit -m "test" && git push
```

### View Railway Logs
1. Go to https://railway.app
2. Select ZenFlo project
3. View deployment logs
4. Check "Build triggered by" to verify watch paths working

## Troubleshooting

### Railway deploys on every commit
**Issue:** Watch paths not configured correctly

**Fix:**
1. Verify `railway.json` exists in repo root
2. Check watch paths array is correct
3. Push updated `railway.json` to trigger reconfiguration

### Railway doesn't deploy when webapp changes
**Issue:** Watch paths too restrictive

**Fix:**
1. Add more paths to `watchPaths`:
   ```json
   "watchPaths": [
     "webapp/**",  // Watch all webapp files
     "!webapp/node_modules"  // But ignore node_modules
   ]
   ```
2. Push changes to update configuration

### Build fails with "file not found"
**Issue:** Docker context incorrect

**Fix:**
1. Verify `dockerContext: "."` in `railway.json`
2. Ensure Dockerfile uses paths relative to monorepo root:
   ```dockerfile
   COPY webapp/dist-web /usr/share/nginx/html
   ```

### Unexpected files in build
**Issue:** `.railwayignore` not working

**Fix:**
1. Verify `.railwayignore` syntax
2. Use `/` prefix for root-level directories
3. Push updated `.railwayignore`

## Manual Deployment

If you need to manually trigger a deployment:

```bash
# Option 1: Railway CLI
railway up

# Option 2: Railway Dashboard
# Go to project → Deployments → Deploy latest commit

# Option 3: API
# Use Railway's API to trigger deployment
```

## Environment Variables

Set in Railway Dashboard → Variables:
- `NODE_ENV=production`
- `PORT=80` (auto-set by Railway)

No secrets needed for webapp (static site).

## Monitoring

### Deployment Status
- Railway Dashboard: Real-time build logs
- https://app.zenflo.dev: Test live deployment
- Railway metrics: Traffic, errors, performance

### Health Checks
Railway automatically monitors:
- HTTP 200 responses
- Container health
- Auto-restarts on failure

## Best Practices

1. **Always build locally**: Don't rely on Railway to build
2. **Commit dist-web**: Version control deployment artifacts
3. **Test locally first**: Verify build before pushing
4. **Use watch paths**: Avoid unnecessary deploys
5. **Monitor logs**: Check Railway dashboard after deploys
6. **Version your changes**: Clear commit messages for deployments

## Related Documentation

- Railway docs: https://docs.railway.app
- Webapp deployment: `webapp/CLAUDE.md`
- Monorepo guide: `MONOREPO.md`
- Backend deployment: Backend runs on NAS, not Railway
