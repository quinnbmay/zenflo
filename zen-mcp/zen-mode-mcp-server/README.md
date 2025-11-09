# Zen Mode MCP Server

**Created:** 2025-11-07
**Last Updated:** 2025-11-08T02:35:00Z
**Status:** ✅ Production Ready

A Model Context Protocol (MCP) server for managing tasks in the Happy Zen Mode system with real-time notifications.

---

## Features

- ✅ **Cross-device task management** - Syncs to Happy mobile app
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
│  Happy Backend (happy.combinedmemory.com)            │
│  - HTTP API: POST /v1/kv, GET /v1/kv                 │
│  - WebSocket: Real-time kv-batch-update messages     │
│  - Storage: Encrypted PostgreSQL                     │
└──────────────┬───────────────────────────────────────┘
               │
               ├──────────────┐
               ▼              ▼
┌─────────────────────┐  ┌──────────────────────┐
│  Happy Mobile App   │  │  Telegram Bot        │
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
cd /Users/quinnmay/developer/happy/zen-mode-mcp-server
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
      "args": ["/Users/quinnmay/developer/happy/zen-mode-mcp-server/dist/index.js"],
      "env": {
        "HAPPY_AUTH_TOKEN": "your-auth-token-here",
        "HAPPY_USER_ID": "your-user-id-here"
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
      "args": ["/Users/quinnmay/developer/happy/zen-mode-mcp-server/dist/index.js"],
      "env": {
        "HAPPY_AUTH_TOKEN": "your-auth-token-here",
        "HAPPY_USER_ID": "your-user-id-here"
      }
    }
  }
}
```

### 4. Get Authentication Credentials

**From Happy Mobile App:**

1. Open Happy mobile app
2. Navigate to Settings → Developer
3. Copy your Auth Token and User ID
4. Add to MCP configuration above

**OR from Happy Backend:**

```bash
# Login and get token
curl -X POST https://happy.combinedmemory.com/api/auth/login \
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
Happy Backend (happy.combinedmemory.com on NAS)
  ↓ (KV Storage)
Encrypted Task Data
  ↓ (Real-time sync)
Happy Mobile App (/zen route)
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

## API Endpoints (Happy Backend)

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

**Problem:** `HAPPY_AUTH_TOKEN` or `HAPPY_USER_ID` not set.

**Solution:**
1. Check MCP configuration has `env` section
2. Verify credentials are correct
3. Restart Claude Code after config changes

### Tasks Not Syncing to Happy App

**Problem:** Encryption/decryption mismatch.

**Solution:**
1. Verify Happy backend encryption API is working
2. Check logs in Happy mobile app's developer console
3. Try creating task directly in Happy app to test sync

### "Task not found" Error

**Problem:** Task ID doesn't exist or sync delay.

**Solution:**
1. Wait a few seconds for sync
2. Call `list_tasks` to verify task exists
3. Check task wasn't deleted in Happy app

---

## Comparison: Zen Mode vs iOS Task Manager

| Feature | iOS Task Manager MCP | Zen Mode MCP |
|---------|---------------------|--------------|
| Task CRUD | ✅ | ✅ |
| Priority levels | ✅ | ✅ |
| Status tracking | ✅ (4 states) | ✅ (4 states) |
| iPhone sync | ✅ (separate app) | ✅ (Happy app) |
| Session linking | ❌ | ✅ |
| AI integration | ❌ | ✅ (Clarify, Work on task) |
| Task ordering | ❌ | ✅ |
| Encryption | ✅ | ✅ |
| Cross-device sync | ✅ | ✅ |

**Winner:** Zen Mode MCP ✨

---

## Roadmap

- [x] Add task description field (beyond title) - **Completed 2025-11-08**
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

## License

MIT

---

## Credits

**Created by:** Quinn May with Claude Code
**Date:** 2025-11-07
**Happy Project:** https://combinedmemory.com
**MCP Protocol:** https://modelcontextprotocol.io
