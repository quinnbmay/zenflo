<div align="center">

<img src="../../.github/zenflo-icon.png" alt="Zen Mode MCP" width="128" height="128" />

# Zen Mode MCP Server

**Task Management for Claude Code & ZenFlo**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://zenflo.dev)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

[Documentation](#) • [ZenFlo App](https://zenflo.dev) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 Overview

A Model Context Protocol (MCP) server for managing tasks in the ZenFlo Zen Mode system with real-time notifications.

---

### ✨ Key Features

- ✅ **Cross-device task management** - Syncs to ZenFlo mobile app
- ✅ **Encrypted storage** - NaCl secretbox encryption (XSalsa20-Poly1305)
- ✅ **Real-time sync** - WebSocket updates across all devices
- ✅ **Session linking** - Link Claude Code sessions to tasks
- ✅ **Public API** - HTTP/SSE endpoint via Cloudflare Tunnel
- ✅ **Notifications** - Real-time Telegram notifications for task changes

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Claude Code / Gemini AI                             │
│  - Uses MCP stdio or HTTP/SSE transport              │
│  - Creates/updates/lists tasks                       │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Zen Mode MCP Server (Local Mac)                     │
│  - stdio: Direct MCP protocol                        │
│  - HTTP/SSE: Public API via Cloudflare Tunnel        │
│  - Notification Service: WebSocket listener          │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  ZenFlo Backend (api.zenflo.dev)                     │
│  - HTTP API: POST /v1/kv, GET /v1/kv                 │
│  - WebSocket: Real-time kv-batch-update messages     │
│  - Storage: Encrypted PostgreSQL                     │
└──────────────┬───────────────────────────────────────┘
               │
               ├──────────────┐
               ▼              ▼
┌─────────────────────┐  ┌──────────────────────┐
│  ZenFlo Mobile App  │  │  Telegram Bot        │
│  /zen route         │  │  Push Notifications  │
│  - Task UI          │  │  - Task created      │
│  - Session linking  │  │  - Status changed    │
│  - Deep links       │  │  - Work on This      │
└─────────────────────┘  └──────────────────────┘
```

---

## Installation

### 1. Install Dependencies

```bash
cd /Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-server
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Configure Claude Code

**Option A: Global Configuration (for all projects)**

Edit `~/.claude/mcp_settings.json` or `~/.config/claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "zen-mode": {
      "command": "node",
      "args": ["/Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-server/dist/index.js"],
      "env": {
        "ZENFLO_AUTH_TOKEN": "your-auth-token-here",
        "ZENFLO_USER_ID": "your-user-id-here"
      }
    }
  }
}
```

**Option B: Project-Level Configuration (recommended)**

Create `.mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "zen-mode": {
      "command": "node",
      "args": ["/Users/quinnmay/developer/zenflo/zen-mcp/zen-mode-mcp-server/dist/index.js"],
      "env": {
        "ZENFLO_AUTH_TOKEN": "your-auth-token-here",
        "ZENFLO_USER_ID": "your-user-id-here"
      }
    }
  }
}
```

### 4. Get Authentication Credentials

**From ZenFlo Mobile App:**

1. Open ZenFlo mobile app
2. Navigate to Settings → Developer
3. Copy your Auth Token and User ID
4. Add to MCP configuration above

**OR from ZenFlo Backend:**

```bash
# Login and get token
curl -X POST https://api.zenflo.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email", "password": "your-password"}'

# Response contains: { "token": "...", "userId": "..." }
```

### 5. Restart Claude Code

After configuration changes, restart Claude Code to load the new MCP server.

---

## Usage

### List All Tasks

```typescript
await mcp__zen-mode__list_tasks();
```

**With filters:**

```typescript
// Get only TODO tasks
await mcp__zen-mode__list_tasks({ status: 'TODO' });

// Get only HIGH priority tasks
await mcp__zen-mode__list_tasks({ priority: 'HIGH' });

// Get IN_PROGRESS tasks with HIGH priority
await mcp__zen-mode__list_tasks({
  status: 'IN_PROGRESS',
  priority: 'HIGH'
});
```

### Filtered Task Lists (NEW! 2025-11-09)

**More efficient than `list_tasks` - returns smaller, focused responses:**

#### List TODO Tasks Only

```typescript
// All TODO tasks, sorted by priority (URGENT → HIGH → MEDIUM → LOW)
await mcp__zen-mode__list_todo_tasks();

// Only HIGH priority TODO tasks
await mcp__zen-mode__list_todo_tasks({ priority: 'HIGH' });
```

**Benefits:**
- ✅ Smaller response (no completed tasks)
- ✅ Priority-sorted automatically
- ✅ Faster than filtering `list_tasks`

#### List IN_PROGRESS Tasks Only

```typescript
// Currently active tasks, sorted by most recently updated
await mcp__zen-mode__list_in_progress_tasks();
```

**Benefits:**
- ✅ Should typically show only 1-2 tasks
- ✅ Perfect for "what am I working on?"
- ✅ Sorted by most recently updated first

#### List COMPLETED Tasks (Paginated)

```typescript
// Recent completed tasks (default: 10 most recent)
await mcp__zen-mode__list_completed_tasks();

// First 5 completed tasks
await mcp__zen-mode__list_completed_tasks({ limit: 5 });

// Next page (skip first 10, get next 10)
await mcp__zen-mode__list_completed_tasks({ limit: 10, offset: 10 });
```

**Response includes:**
```json
{
  "total": 41,
  "limit": 10,
  "offset": 0,
  "hasMore": true,
  "tasks": [...]
}
```

**Benefits:**
- ✅ Paginated (prevent overwhelming output)
- ✅ Sorted by completion date (most recent first)
- ✅ Perfect for reviewing recent work
- ✅ `hasMore` flag tells you if there are more pages

#### List CANCELLED Tasks (Paginated)

```typescript
// Recent cancelled tasks
await mcp__zen-mode__list_cancelled_tasks();

// Custom page size
await mcp__zen-mode__list_cancelled_tasks({ limit: 5, offset: 0 });
```

**Benefits:**
- ✅ Same pagination as completed tasks
- ✅ Sorted by cancellation date (most recent first)

### Create Task

```typescript
// Basic task
await mcp__zen-mode__create_task({
  title: 'Fix authentication bug in login flow'
});

// With description (NEW!)
await mcp__zen-mode__create_task({
  title: 'Fix authentication bug',
  description: 'Users are experiencing 401 errors after token refresh.\n\nSteps to reproduce:\n1. Login successfully\n2. Wait 15 minutes\n3. Try to make API call\n\nExpected: Token refreshes automatically\nActual: 401 Unauthorized error'
});

// With priority
await mcp__zen-mode__create_task({
  title: 'Deploy new feature to production',
  priority: 'URGENT'
});

// With status
await mcp__zen-mode__create_task({
  title: 'Research new API design patterns',
  description: 'Explore GraphQL vs REST for new microservice',
  priority: 'MEDIUM',
  status: 'IN_PROGRESS'
});
```

### Get Task Details

```typescript
await mcp__zen-mode__get_task({
  task_id: 'abc-123-def-456'
});
```

### Update Task

```typescript
// Update status
await mcp__zen-mode__update_task({
  task_id: 'abc-123-def-456',
  status: 'DONE'
});

// Update priority
await mcp__zen-mode__update_task({
  task_id: 'abc-123-def-456',
  priority: 'URGENT'
});

// Update description (NEW!)
await mcp__zen-mode__update_task({
  task_id: 'abc-123-def-456',
  description: 'Added more context:\n- Fixed root cause in auth middleware\n- Added regression test'
});

// Update multiple fields
await mcp__zen-mode__update_task({
  task_id: 'abc-123-def-456',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  title: 'Updated task title',
  description: 'Updated description with more details'
});
```

### Delete Task

```typescript
await mcp__zen-mode__delete_task({
  task_id: 'abc-123-def-456'
});
```

---

## Migration from iOS Task Manager

### Step 1: Update CLAUDE.md

Replace iOS Task Manager references with Zen Mode MCP:

```markdown
### 1. Task Management (REQUIRED AT START)
**⚠️ CRITICAL: Use Zen Mode MCP, NOT TodoWrite tool**

At the **START of EVERY session**, you MUST:
1. Call `mcp__zen-mode__list_tasks` to see existing tasks
2. Use `mcp__zen-mode__create_task` to create new tasks for the session
3. Use `mcp__zen-mode__update_task` to update status as you work
4. **NEVER use TodoWrite tool** - it's not synced across devices

**Zen Mode MCP Tools:**
- `mcp__zen-mode__list_tasks` - List all tasks (synced to Happy app)
- `mcp__zen-mode__list_todo_tasks` - List TODO tasks only (sorted by priority)
- `mcp__zen-mode__list_in_progress_tasks` - List IN_PROGRESS tasks only
- `mcp__zen-mode__list_completed_tasks` - List DONE tasks (paginated)
- `mcp__zen-mode__list_cancelled_tasks` - List CANCELLED tasks (paginated)
- `mcp__zen-mode__create_task` - Create task (syncs to Happy app)
- `mcp__zen-mode__get_task` - Get specific task
- `mcp__zen-mode__update_task` - Update status/priority
- `mcp__zen-mode__delete_task` - Delete task

**Task Priorities:** LOW, MEDIUM, HIGH, URGENT
**Task Status:** TODO, IN_PROGRESS, DONE, CANCELLED
```

### Step 2: Remove iOS Task Manager MCP

Remove `task-manager` entry from your MCP configuration:

```diff
{
  "mcpServers": {
-   "task-manager": { ... },
+   "zen-mode": { ... }
  }
}
```

### Step 3: Export Existing Tasks (if needed)

If you have tasks in iOS Task Manager that need migration:

1. List all tasks from iOS Task Manager
2. Create equivalent tasks in Zen Mode MCP
3. Verify sync to Happy mobile app

---

## Architecture

### Data Flow

```
Claude Code
  ↓ (MCP call)
Zen Mode MCP Server
  ↓ (HTTPS API)
ZenFlo Backend (api.zenflo.dev on NAS)
  ↓ (KV Storage)
Encrypted Task Data
  ↓ (Real-time sync)
ZenFlo Mobile App (/zen route)
```

### Storage Structure

**KV Keys:**
- `todo.{uuid}` - Individual task items (encrypted)
- `todo.index` - Task ordering (undoneOrder, completedOrder)

**TodoItem Fields:**
```typescript
{
  id: string;
  title: string;
  description?: string;  // Multi-line description for task context (NEW!)
  done: boolean;  // For UI compatibility
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
  linkedSessions?: {
    [sessionId: string]: {
      title: string;
      linkedAt: number;
    };
  };
}
```

---

## API Endpoints (ZenFlo Backend)

All endpoints require `Authorization: Bearer {token}` header.

### `GET /api/kv/list`
**Query params:**
- `prefix` - Filter keys by prefix (e.g., "todo.")
- `limit` - Max items to return

**Response:**
```json
{
  "items": [
    {
      "key": "todo.abc-123",
      "value": "base64-encrypted-data",
      "version": 5
    }
  ]
}
```

### `GET /api/kv/get`
**Query params:**
- `key` - KV key to fetch

**Response:**
```json
{
  "key": "todo.abc-123",
  "value": "base64-encrypted-data",
  "version": 5
}
```

### `POST /api/kv/set`
**Body:**
```json
{
  "key": "todo.abc-123",
  "value": "base64-encrypted-data",
  "version": 5  // Use -1 for new keys
}
```

**Response:**
```json
{
  "version": 6  // New version number
}
```

### `POST /api/kv/delete`
**Body:**
```json
{
  "key": "todo.abc-123",
  "version": 5
}
```

---

## Development

### Run in Development Mode

```bash
npm run dev
```

### Watch Mode (auto-rebuild on changes)

```bash
npm run watch
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Troubleshooting

### "Authentication required" Error

**Problem:** `ZENFLO_AUTH_TOKEN` or `ZENFLO_USER_ID` not set.

**Solution:**
1. Check MCP configuration has `env` section
2. Verify credentials are correct
3. Restart Claude Code after config changes

### Tasks Not Syncing to ZenFlo App

**Problem:** Encryption/decryption mismatch.

**Solution:**
1. Verify ZenFlo backend encryption API is working
2. Check logs in ZenFlo mobile app's developer console
3. Try creating task directly in ZenFlo app to test sync

### "Task not found" Error

**Problem:** Task ID doesn't exist or sync delay.

**Solution:**
1. Wait a few seconds for sync
2. Call `list_tasks` to verify task exists
3. Check task wasn't deleted in ZenFlo app

---

## Comparison: Zen Mode vs iOS Task Manager

| Feature | iOS Task Manager MCP | Zen Mode MCP |
|---------|---------------------|--------------|
| Task CRUD | ✅ | ✅ |
| Priority levels | ✅ | ✅ |
| Status tracking | ✅ (4 states) | ✅ (4 states) |
| iPhone sync | ✅ (separate app) | ✅ (ZenFlo app) |
| Session linking | ❌ | ✅ |
| AI integration | ❌ | ✅ (Clarify, Work on task) |
| Task ordering | ❌ | ✅ |
| Encryption | ✅ | ✅ |
| Cross-device sync | ✅ | ✅ |

**Winner:** Zen Mode MCP ✨

---

## Roadmap

- [x] Add task description field (beyond title) - **Completed 2025-11-08**
- [x] Add filtered task listing tools - **Completed 2025-11-09**
- [x] Add pagination for completed/cancelled tasks - **Completed 2025-11-09**
- [ ] Add task tags/labels
- [ ] Add task due dates
- [ ] Add subtasks support
- [ ] Add task comments/notes
- [ ] Add task attachments
- [ ] Real-time websocket updates (instead of polling)
- [ ] Batch operations (create/update multiple tasks)
- [ ] Task search and filtering
- [ ] Task analytics (completion rate, time tracking)

---

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
