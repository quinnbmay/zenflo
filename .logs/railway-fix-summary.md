# Railway Configuration Fix Summary
**Date:** 2025-11-10
**Issue:** Railway using wrong Dockerfile, causing yarn install lockfile errors

## Root Cause

Railway's **Root Directory** setting: `/webapp`

This means:
- Railway's working directory is `/webapp`, not the monorepo root
- Configuration files must be in `/webapp` directory to be detected
- Our `railway.json` was in monorepo root → Railway couldn't find it
- Railway auto-detected `Dockerfile` (build from source) instead of `Dockerfile.railway` (pre-built)

## The Fix

**Commit:** 4363791

**Changes:**
1. Moved `railway.json` from `/railway.json` → `/webapp/railway.json`
2. Railway can now read configuration file
3. Will use `Dockerfile.railway` (pre-built nginx deployment)

## File Locations

### ✅ Correct (After Fix)
```
webapp/
├── railway.json          # Railway configuration (HERE!)
├── Dockerfile.railway    # Pre-built deployment
├── .railwayignore        # Ignore rules
└── dist-railway/         # Pre-built files
```

### ❌ Wrong (Before Fix)
```
/ (monorepo root)
├── railway.json          # Railway can't see this!
└── webapp/
    ├── Dockerfile.railway
    └── dist-railway/
```

## Railway Configuration

**`webapp/railway.json` contents:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway",
    "watchPaths": [
      "dist-railway/**",
      "Dockerfile.railway",
      "package.json"
    ]
  }
}
```

**Key points:**
- `dockerfilePath`: Points to `Dockerfile.railway` (relative to `/webapp`)
- `watchPaths`: Only triggers on webapp file changes
- No `dockerContext` needed (Railway handles it)

## Expected Build Process (After Fix)

1. **Railway detects commit** to `main` branch
2. **Reads** `/webapp/railway.json`
3. **Checks watchPaths** - are any watched files changed?
4. **Uses** `/webapp/Dockerfile.railway`
5. **Copies** pre-built `dist-railway/` files
6. **Deploys** nginx container
7. **Time:** ~1-2 minutes (fast!)

## Previous Build Process (Before Fix)

1. Railway detects commit
2. Can't find `railway.json` (wrong location)
3. Auto-detects `/webapp/Dockerfile`
4. Runs `yarn install` (lockfile error!)
5. Build fails ❌

## Verification

### Check Railway Dashboard:

Next deployment should show:
```
✅ Using Configured Dockerfile: Dockerfile.railway
✅ Build time: ~1-2 minutes
✅ No yarn install steps
✅ Direct nginx deployment
```

### Build Log Should Show:
```
=========================
Using Configured Dockerfile: Dockerfile.railway
=========================

FROM nginx:alpine
COPY dist-railway /usr/share/nginx/html
RUN echo 'server { ... }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Build Log Should NOT Show:
```
❌ Using Detected Dockerfile
❌ yarn install v1.22.22
❌ [1/4] Resolving packages...
❌ error Your lockfile needs to be updated
```

## Railway Dashboard Settings

Your current settings (should stay as-is):
```
Root Directory: /webapp
Branch: main
Auto Deploy: Enabled
```

## Watch Paths Behavior

With `railway.json` in correct location, watch paths now work:

**✅ Triggers Deploy:**
- Changes to `webapp/dist-railway/`
- Changes to `webapp/Dockerfile.railway`
- Changes to `webapp/package.json`

**❌ Does NOT Deploy:**
- Changes to `backend/`, `mobile/`, `cli/`
- Changes to docs (`*.md` files)
- Changes to other workspaces

## Testing

The next push to main should:
1. Be detected by Railway
2. Check if watched files changed
3. Use correct Dockerfile
4. Deploy successfully

## Commit History

Recent commits related to this fix:
- `4363791` - Move railway.json to webapp directory (THE FIX)
- `10469a7` - Adjust Railway config for /webapp root directory
- `31bc9a2` - Configure Railway smart deploys with watch paths

## Next Steps

1. **Monitor** next Railway deployment
2. **Verify** it uses `Dockerfile.railway`
3. **Confirm** build time is ~1-2 minutes
4. **Test** that watch paths work (webapp changes trigger, others don't)

## If Still Failing

If Railway still uses wrong Dockerfile:

**Option A: Manual Override in Dashboard**
1. Go to Railway Dashboard → Zenflo project
2. Settings → Build
3. Explicitly set: `Dockerfile Path: Dockerfile.railway`

**Option B: Remove auto-detection**
1. Rename `webapp/Dockerfile` → `webapp/Dockerfile.build`
2. Only `Dockerfile.railway` exists
3. Railway forced to use it

**Option C: Use .railwayrc**
Create `webapp/.railwayrc`:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile.railway"
```

## Success Criteria

✅ Deployment shows "Using Configured Dockerfile"
✅ Build completes in 1-2 minutes
✅ No yarn install errors
✅ Website works at https://app.combinedmemory.com
✅ Watch paths trigger correctly

---

**Status:** Fix deployed, awaiting Railway rebuild
**Last Updated:** 2025-11-10 19:52 EST
