<div align="center">

<img src="../../.github/zenflo-icon.png" alt="Zen Mode MCP Cloudflare" width="128" height="128" />

# Zen Mode MCP - Cloudflare Worker

**Edge-Deployed Task Management for Claude Code & ZenFlo**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://zenflo.dev)
[![MCP](https://img.shields.io/badge/MCP-HTTP%20Transport-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)

[Documentation](#) • [ZenFlo App](https://zenflo.dev) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 Overview

HTTP-based MCP server for ZenFlo's Zen Mode task management system. Designed to replace iOS Task Manager with unified task system across Claude Code and ZenFlo mobile app.

## Why Cloudflare Workers?

- ✅ **FREE** - 100,000 requests/day on free tier
- ✅ **Fast** - Edge deployment, <50ms global latency
- ✅ **Simple** - One command deployment
- ✅ **No Config** - No environment variables needed
- ✅ **Scalable** - Auto-scales to millions of requests

## 🚀 Quick Deploy

```bash
cd /Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-cloudflare

# Install dependencies
npm install

# Login to Cloudflare (one-time)
npx wrangler login

# Deploy
npm run deploy
```

That's it! You'll get a URL like:
`https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev`

## ✨ Key Features

- 🔐 JWT authentication via ZenFlo backend
- 🔑 Base32 secret key support (Ed25519 signatures)
- 📋 5 MCP tools: list_tasks, create_task, get_task, update_task, delete_task
- 🎯 Task priorities: LOW, MEDIUM, HIGH, URGENT
- ✅ Task status: TODO, IN_PROGRESS, DONE, CANCELLED
- 📱 Syncs with ZenFlo mobile app (/zen route)
- 🔒 Encrypted storage in ZenFlo NAS PostgreSQL
- 🌍 CORS enabled

## API Endpoints

### GET /health
Health check endpoint.

### GET /mcp
Returns MCP server metadata and available tools.

### POST /mcp
Execute MCP tools.

**Example:**
```bash
curl -X POST https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_tasks",
    "arguments": {},
    "secret": "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ"
  }'
```

## MCP Configuration

Once deployed, update your `.mcp.json`:

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "http",
      "url": "https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

The secret key will be sent automatically in each request body.

## Tools

### list_tasks
List all tasks with optional filters.
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority

### create_task
Create a new task.
- `title` (required): Task title
- `priority` (optional): Priority level (default: MEDIUM)
- `status` (optional): Initial status (default: TODO)

### get_task
Get details of a specific task.
- `task_id` (required): Task ID

### update_task
Update an existing task.
- `task_id` (required): Task ID
- `status` (optional): New status
- `priority` (optional): New priority
- `title` (optional): New title

### delete_task
Delete a task.
- `task_id` (required): Task ID

## 🧪 Local Development

```bash
# Run locally (connects to ZenFlo backend)
npm run dev

# Test locally
curl http://localhost:8787/health
curl http://localhost:8787/mcp
```

## Deployment

### First Time Setup

```bash
# Login to Cloudflare
npx wrangler login
# Opens browser, authenticate with your Cloudflare account

# Deploy
npm run deploy
```

### Update Deployment

```bash
# Just deploy again
npm run deploy
```

### View Logs

```bash
npx wrangler tail
```

## Cost

**FREE TIER:**
- 100,000 requests/day
- 10ms CPU time per request
- Unlimited bandwidth

This MCP server will easily fit within free tier limits.

## Monitoring

**Cloudflare Dashboard:**
1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. Click on `zen-mode-mcp`
4. View metrics, logs, and analytics

## 🏗️ Architecture

```
Claude Code
    ↓ (HTTP MCP)
Cloudflare Worker (this)
    ↓ (JWT Auth)
ZenFlo NAS Backend
    ↓ (Encrypted KV)
PostgreSQL Database
    ↑↓ (Sync)
ZenFlo Mobile App (/zen)
```

## Troubleshooting

### Deployment Fails

```bash
# Check wrangler version
npx wrangler --version

# Re-login
npx wrangler logout
npx wrangler login
```

### Authentication Fails

Verify secret key format:
- Must be valid Base32-encoded string
- Format: `XXXXX-XXXXX-XXXXX-...` (hyphens optional)

### Test Endpoints

```bash
# Health check
curl https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev/health

# Tool discovery
curl https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev/mcp

# List tasks
curl -X POST https://zen-mode-mcp.YOUR-SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_tasks", "arguments": {}, "secret": "YOUR-SECRET"}'
```

## Custom Domain (Optional)

1. In Cloudflare dashboard, go to Workers > zen-mode-mcp
2. Click "Triggers" tab
3. Add custom domain: `zen.yourdomain.com`
4. Update `.mcp.json` with new domain

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details.

---

## 🙏 Acknowledgments

- **Created by:** Quinn May with Claude Code
- **Date:** 2025-11-07
- **ZenFlo Platform:** [https://zenflo.dev](https://zenflo.dev)
- **MCP Protocol:** [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Cloudflare Workers:** [https://workers.cloudflare.com](https://workers.cloudflare.com)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.dev) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.dev)

</div>
