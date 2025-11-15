# DNS Setup Instructions

The Worker is deployed and configured, but we need to add a DNS record manually.

## Quick Setup (2 minutes):

### Option 1: Via Cloudflare Dashboard (Easiest)

1. **Go to:** https://dash.cloudflare.com/4b339d9b82347caea48bbe42d4896bbd/zenflo.dev/dns/records

2. **Click:** "Add record" button

3. **Fill in:**
   - Type: **CNAME**
   - Name: **zen**
   - Target: **zen-mode-mcp.quinn-4b3.workers.dev**
   - Proxy status: **Proxied** (orange cloud icon - should be ON)
   - TTL: Auto

4. **Click:** "Save"

5. **Test (wait ~30 seconds):**
   ```bash
   curl https://zen.zenflo.dev/health
   ```

   Should return:
   ```json
   {"status":"ok","timestamp":"2025-11-07T..."}
   ```

### Option 2: Via Cloudflare API (if you have API key)

```bash
# Get your API key from: https://dash.cloudflare.com/profile/api-tokens
# Need "Zone:DNS:Edit" permission

ZONE_ID="d19ff1e79dd2b5d7f5137779ad47a5e6"
API_TOKEN="your-api-token-here"

curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "zen",
    "content": "zen-mode-mcp.quinn-4b3.workers.dev",
    "ttl": 1,
    "proxied": true
  }'
```

## What This Does:

- Creates `zen.zenflo.dev` subdomain
- Points it to your Cloudflare Worker
- Enables Cloudflare proxy (SSL, DDoS protection, caching)
- Makes your MCP server accessible at: `https://zen.zenflo.dev/mcp`

## Already Configured:

✅ Worker deployed with custom route
✅ All 5 `.mcp.json` files updated to use `https://zen.zenflo.dev/mcp`
✅ SSL will be automatically enabled by Cloudflare

## After DNS is Added:

Your Zen Mode MCP will be accessible at:
- Health: `https://zen.zenflo.dev/health`
- MCP endpoint: `https://zen.zenflo.dev/mcp`

All your Claude Code sessions will automatically use it!

---

**Zone ID:** `d19ff1e79dd2b5d7f5137779ad47a5e6`
**Zone Name:** `zenflo.dev`
**Worker:** `zen-mode-mcp`
**Target:** `zen-mode-mcp.quinn-4b3.workers.dev`
