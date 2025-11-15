# Domain Migration - 2025-11-15

## Summary

Updated Zen Mode MCP Cloudflare Worker to use the new ZenFlo domain infrastructure:
- **Old Backend API:** `https://zenflo.combinedmemory.com`
- **New Backend API:** `https://api.zenflo.dev`
- **Old MCP Endpoint:** `https://zen.combinedmemory.com/mcp`
- **New MCP Endpoint:** `https://zen.zenflo.dev/mcp`

## Files Updated

### Source Code
1. **src/index.ts**
   - Updated header comment: `Backend: ZenFlo NAS (api.zenflo.dev)`
   - Updated auth endpoint: `https://api.zenflo.dev/v1/auth`
   - Updated KV API endpoints: `https://api.zenflo.dev/v1/kv`
   - All 5 fetch() calls now use new domain

### Configuration
2. **wrangler.toml**
   - Custom route pattern: `zen.zenflo.dev/*`
   - Zone name: `zenflo.dev`

### Documentation
3. **SETUP_DNS.md**
   - Updated Cloudflare dashboard URL
   - Updated DNS record instructions (zen.zenflo.dev)
   - Updated health check examples
   - Updated zone information

### Test Scripts
4. **test-auth.js**
   - Updated MCP endpoint: `https://zen.zenflo.dev/mcp`

5. **add-dns.js**
   - Updated zone lookup: `zenflo.dev`
   - Updated success message: `zen.zenflo.dev`

6. **add-dns-record.sh**
   - Updated DNS record comments and URLs
   - Updated zone references: `zenflo.dev`
   - Updated health check URL

## Verification

All domain references have been successfully updated:
```bash
# No old domain references remain
grep -r "combinedmemory" . --exclude-dir=node_modules
# (returns no results)

# New backend API domain in use
grep -r "api.zenflo.dev" src/index.ts
# 6 matches found

# New MCP endpoint domain in use  
grep -r "zen.zenflo.dev" . --exclude-dir=node_modules
# 11 matches found
```

## TypeScript Status

Note: There are pre-existing TypeScript errors in the codebase unrelated to this migration:
- Type incompatibilities with ArrayBuffer vs Uint8Array
- Type narrowing issues with status field

These errors existed before the domain migration and do not affect the Cloudflare Worker deployment (wrangler handles TypeScript compilation).

## Next Steps

1. Deploy the updated worker:
   ```bash
   cd /Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-cloudflare
   npm run deploy
   ```

2. Verify the deployment:
   ```bash
   curl https://zen.zenflo.dev/health
   curl https://zen.zenflo.dev/mcp
   ```

3. Update `.mcp.json` files across projects to use new endpoint:
   ```json
   {
     "mcpServers": {
       "zen-mode": {
         "type": "http",
         "url": "https://zen.zenflo.dev/mcp"
       }
     }
   }
   ```

## DNS Configuration

The DNS record needs to be added via Cloudflare dashboard or API:
- **Type:** CNAME
- **Name:** zen
- **Target:** zen-mode-mcp.quinn-4b3.workers.dev
- **Proxied:** Yes (orange cloud)
- **Zone:** zenflo.dev

See SETUP_DNS.md for detailed instructions.

---

**Migration Date:** 2025-11-15  
**Author:** Quinn May with Claude Code  
**Related:** Domain migration from combinedmemory.com to zenflo.dev
