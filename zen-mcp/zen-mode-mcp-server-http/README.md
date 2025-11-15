<div align="center">

<img src="../../.github/zenflo-icon.png" alt="Zen Mode MCP HTTP" width="128" height="128" />

# Zen Mode MCP HTTP Server

**HTTP-Based Task Management for Claude Code & ZenFlo**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://zenflo.dev)
[![MCP](https://img.shields.io/badge/MCP-HTTP%20Transport-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-blueviolet)](https://railway.app)

[Documentation](#) • [ZenFlo App](https://zenflo.dev) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 Overview

HTTP-based MCP server for ZenFlo's Zen Mode task management system. Designed to replace iOS Task Manager and provide a unified task management experience across Claude Code and ZenFlo mobile app.

## ✨ Key Features

- ✅ JWT authentication via ZenFlo backend
- ✅ Base32 secret key support
- ✅ 5 MCP tools: list_tasks, create_task, get_task, update_task, delete_task
- ✅ Task priorities: LOW, MEDIUM, HIGH, URGENT
- ✅ Task status: TODO, IN_PROGRESS, DONE, CANCELLED
- ✅ Syncs with ZenFlo mobile app (/zen route)
- ✅ Encrypted storage in ZenFlo NAS PostgreSQL

## Deployment

### Railway Deployment

1. Create new Railway project
2. Connect to this repository
3. Set start command: `npm start`
4. Deploy

### Environment Variables

No environment variables required! Authentication is handled via:
- Secret key in request body, OR
- JWT token in Authorization header

## API Endpoints

### GET /mcp

Returns MCP server metadata and available tools.

```bash
curl https://your-railway-url.up.railway.app/mcp
```

### POST /mcp

Execute MCP tools.

**With Secret Key:**
```bash
curl -X POST https://your-railway-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_tasks",
    "arguments": {},
    "secret": "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ"
  }'
```

**With JWT Token:**
```bash
curl -X POST https://your-railway-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tool": "list_tasks",
    "arguments": {}
  }'
```

### GET /health

Health check endpoint.

```bash
curl https://your-railway-url.up.railway.app/health
```

## MCP Configuration

Once deployed, add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "http",
      "url": "https://your-railway-url.up.railway.app/mcp",
      "headers": {
        "X-Secret": "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ"
      }
    }
  }
}
```

Or with JWT token:

```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "http",
      "url": "https://your-railway-url.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

## Tools

### list_tasks

List all tasks with optional filters.

**Arguments:**
- `status` (optional): Filter by status (TODO, IN_PROGRESS, DONE, CANCELLED)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)

### create_task

Create a new task.

**Arguments:**
- `title` (required): Task title/description
- `priority` (optional): Priority level (default: MEDIUM)
- `status` (optional): Initial status (default: TODO)

### get_task

Get details of a specific task.

**Arguments:**
- `task_id` (required): Task ID

### update_task

Update an existing task.

**Arguments:**
- `task_id` (required): Task ID
- `status` (optional): New status
- `priority` (optional): New priority
- `title` (optional): New title

### delete_task

Delete a task.

**Arguments:**
- `task_id` (required): Task ID

## Architecture

```
Claude Code
    ↓ (HTTP MCP)
Railway Server (this)
    ↓ (JWT Auth)
ZenFlo NAS Backend
    ↓ (Encrypted KV)
PostgreSQL Database
    ↑↓ (Sync)
ZenFlo Mobile App (/zen)
```

## Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## Tech Stack

- **Framework:** Express.js
- **Language:** TypeScript
- **Auth:** Ed25519 signatures + JWT
- **Backend:** ZenFlo NAS (api.zenflo.dev)
- **Database:** PostgreSQL (encrypted KV store)
- **Deployment:** Railway

## Links

- ZenFlo Mobile App: `/zen` route
- ZenFlo Backend: https://api.zenflo.dev
- MCP Protocol: https://modelcontextprotocol.io

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details.

---

## 🙏 Acknowledgments

- **Created by:** Quinn May with Claude Code
- **Date:** 2025-11-07
- **ZenFlo Platform:** [https://zenflo.dev](https://zenflo.dev)
- **MCP Protocol:** [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.dev) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.dev)

</div>
