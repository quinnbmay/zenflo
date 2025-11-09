# Deployment Guide - Zen Mode MCP HTTP Server

**Created:** 2025-11-07
**Target Platform:** Railway

## Quick Deployment Steps

### Option 1: Railway Web UI (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Connect Repository**
   - If not connected yet, connect your GitHub account
   - Select the `zen-mode-mcp-server-http` repository
   - Or: Deploy from local directory by running `railway up` (see Option 2)

3. **Configure Build**
   - Root Directory: `/`
   - Build Command: `npm run build` (auto-detected)
   - Start Command: `npm start`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment
   - Railway will provide a URL like: `https://zen-mode-mcp-xxxxx.up.railway.app`

5. **Test the Deployment**
   ```bash
   # Test health endpoint
   curl https://your-railway-url.up.railway.app/health

   # Test MCP discovery
   curl https://your-railway-url.up.railway.app/mcp

   # Test with secret key
   curl -X POST https://your-railway-url.up.railway.app/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "tool": "list_tasks",
       "arguments": {},
       "secret": "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ"
     }'
   ```

### Option 2: Railway CLI

If you have Railway CLI installed and want to deploy from terminal:

```bash
cd /Users/quinnmay/developer/happy/zen-mode-mcp-server-http

# Login to Railway
railway login

# Create new project (interactive - select workspace)
railway init

# Deploy
railway up

# Get the URL
railway open
```

## Post-Deployment: Update MCP Configs

Once deployed, you need to update all `.mcp.json` files to use the Railway URL instead of local file paths.

### Files to Update:

1. `~/.claude/mcp.json`
2. `~/.mcp.json`
3. `~/developer/.mcp.json`
4. `~/developer/CombinedMemory/.mcp.json`
5. `~/developer/n8n/.mcp.json`
6. `~/developer/voice-agent-hub/.mcp.json`
7. Any other project-level `.mcp.json` files

### Change From:

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/quinnmay/developer/happy/zen-mode-mcp-server/dist/index.js"],
      "env": {
        "HAPPY_AUTH_TOKEN": "eyJhbGci..."
      }
    }
  }
}
```

### Change To (Method 1 - Secret in Request Body):

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "http",
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/mcp"
    }
  }
}
```

Note: With this method, the secret key will be sent in each request body automatically by the MCP client.

### Change To (Method 2 - Secret in Header):

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "http",
      "url": "https://YOUR-RAILWAY-URL.up.railway.app/mcp",
      "headers": {
        "X-Secret": "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ"
      }
    }
  }
}
```

## Environment Variables

**NO environment variables are required!**

The server accepts authentication via:
- Secret key in request body (preferred)
- JWT token in `Authorization` header
- Secret key in custom `X-Secret` header

All authentication is handled per-request, making the deployment stateless and scalable.

## Monitoring

### Check Logs

```bash
# Via Railway CLI
railway logs

# Via Web UI
# Go to project → Deployments → Click deployment → View logs
```

### Health Check

Railway automatically monitors the `/health` endpoint:

```bash
curl https://your-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T22:30:00.000Z"
}
```

## Rollback

If something goes wrong:

```bash
# Via Railway CLI
railway rollback

# Via Web UI
# Go to project → Deployments → Click previous deployment → Redeploy
```

## Custom Domain (Optional)

1. Go to Railway project settings
2. Click "Domains"
3. Add custom domain: `zen.yourdomain.com`
4. Update DNS with provided CNAME record
5. Update all `.mcp.json` files with new domain

## Troubleshooting

### Deployment Fails

**Check build logs:**
- Ensure `npm run build` succeeds locally first
- Verify `dist/` directory has `index.js` after build
- Check `package.json` has correct `start` script

### Server Returns 500 Error

**Check runtime logs:**
```bash
railway logs --tail 100
```

Common issues:
- Missing dependencies (run `npm install`)
- TypeScript build errors (run `npm run build`)
- Port binding issues (server uses `process.env.PORT || 3000`)

### Authentication Fails

**Verify secret key format:**
- Must be valid Base32-encoded string
- Format: `XXXXX-XXXXX-XXXXX-...` (hyphens optional)
- Test with curl first before updating MCP configs

### MCP Tools Not Working

**Test each endpoint:**

1. Discovery:
```bash
curl https://your-url.up.railway.app/mcp
```

2. List tasks:
```bash
curl -X POST https://your-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_tasks", "arguments": {}, "secret": "YOUR-SECRET"}'
```

3. Create task:
```bash
curl -X POST https://your-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_task",
    "arguments": {"title": "Test task", "priority": "HIGH"},
    "secret": "YOUR-SECRET"
  }'
```

## Updates and Redeployment

### Method 1: Git Push (if connected to GitHub)

```bash
cd /Users/quinnmay/developer/happy/zen-mode-mcp-server-http
# Make changes
git add .
git commit -m "Update: description of changes"
git push
# Railway auto-deploys on push
```

### Method 2: Railway CLI

```bash
railway up
```

## Cost Estimate

Railway pricing (as of 2025):
- **Hobby Plan:** $5/month for 512MB RAM, $0.000231/GB-hour
- **Pro Plan:** $20/month for higher limits

This server is lightweight and should run well on Hobby plan:
- Expected RAM usage: ~100MB
- Expected CPU usage: Minimal (request-based)
- Expected bandwidth: Low (small JSON payloads)

**Estimated cost: $5-10/month**

---

**Generated with Claude Code via Happy**
Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
