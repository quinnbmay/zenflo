# WebSocket Backend Implementation TODO

**Created:** 2025-11-08 12:31 PST
**Status:** ⚠️ BLOCKED - Backend endpoint missing

## Summary

The ZenFlo notification service is fully configured and running as a PM2 daemon, but cannot connect to the Happy backend because the WebSocket endpoint doesn't exist yet.

## Current Situation

### ✅ Notification Service (Client-side)
- **Status:** Running as PM2 daemon (PID 54830)
- **Location:** `/Users/quinnmay/developer/happy/zen-mode-mcp-server`
- **Service:** `zen-notifications`
- **Logs:** `./logs/zen-notifications-*.log`

### ❌ Backend WebSocket Endpoint (Server-side)
- **Expected URL:** `wss://api.zenflo.dev/v1/kv/watch`
- **Current Status:** 502 Bad Gateway
- **Error:** "Unexpected server response: 502"
- **Backend Location:** NAS at `nas-1`, access via `ssh nas@nas-1`
- **Backend Path:** `/home/nas/developer/Happy Server/` (in Docker)

## What Needs to Be Implemented

### WebSocket Endpoint: `/v1/kv/watch`

**Purpose:** Stream real-time `kv-batch-update` messages when todo.* keys change

**Protocol:** WebSocket (wss://)

**Authentication:** Bearer token via Authorization header
```
Authorization: Bearer <HAPPY_AUTH_TOKEN>
```

**Message Format:**
```typescript
interface KVBatchUpdateMessage {
  type: 'kv-batch-update';
  keys: Array<{
    key: string;      // e.g., "todo.abc-123-def"
    version: number;  // Version/timestamp of change
  }>;
}
```

**Example Message:**
```json
{
  "type": "kv-batch-update",
  "keys": [
    {
      "key": "todo.f649bd9d-f01f-45df-ae24-d95e82478d13",
      "version": 1731090123456
    },
    {
      "key": "todo.855202a8-5c20-4106-8365-e7a5df54c36d",
      "version": 1731090123457
    }
  ]
}
```

## Client Behavior

The notification service client:

1. **Connects** to `wss://api.zenflo.dev/v1/kv/watch`
2. **Sends** `Authorization: Bearer <token>` header
3. **Receives** `kv-batch-update` messages when todo.* keys change
4. **Filters** for `todo.*` keys (excluding `todo.index`)
5. **Fetches** full task data via HTTP GET `/v1/kv/todo.<id>`
6. **Sends** Telegram notification with task details

## Implementation Requirements

### Backend (on NAS)

1. **WebSocket Server Setup**
   - Add WebSocket support to Happy backend
   - Endpoint: `/v1/kv/watch`
   - Use existing auth middleware (JWT Bearer token)

2. **KV Change Detection**
   - Listen for changes to KV store keys
   - When `todo.*` key is created/updated/deleted, emit WebSocket message
   - Use existing encryption (NaCl secretbox) for data at rest
   - WebSocket messages only contain key names + versions (not encrypted data)

3. **Message Broadcasting**
   - When todo key changes:
     - Build `kv-batch-update` message
     - Broadcast to all connected WebSocket clients
     - Include key name and version number
   - Can batch multiple changes into single message

4. **Connection Management**
   - Support multiple simultaneous WebSocket connections
   - Authenticate each connection via Bearer token
   - Handle client disconnects gracefully
   - Auto-cleanup stale connections

### Technologies

The backend already uses:
- **WebSocket:** Socket.IO (as noted in SuperMemory)
- **Docker:** Running in containers on NAS
- **Storage:** PostgreSQL, Redis, MinIO
- **Encryption:** NaCl secretbox for KV data

## Testing Plan

Once the endpoint is implemented:

1. **Manual Test:**
   ```bash
   # On local machine
   cd /Users/quinnmay/developer/happy/zen-mode-mcp-server
   npm run notifications:logs

   # Should see: "✅ Connected to Happy WebSocket"
   ```

2. **Create Test Task:**
   ```bash
   # Via MCP or Happy mobile app
   # Create a new task or update existing task
   ```

3. **Verify Notification:**
   - Check Telegram for notification from @ZenFlo_bot
   - Should include task title, description, status, priority
   - Should have inline buttons: "Work on This", "Open in Happy", "Dismiss"

4. **Test Deep Link:**
   - Click "Open in Happy" button
   - Should open `happy://zen/task/<id>` in Happy mobile app

## File References

### Notification Service (Local)
- `/Users/quinnmay/developer/happy/zen-mode-mcp-server/src/websocket-client.ts` - WebSocket client
- `/Users/quinnmay/developer/happy/zen-mode-mcp-server/src/notification-service.ts` - Main service
- `/Users/quinnmay/developer/happy/zen-mode-mcp-server/.env` - Configuration
- `/Users/quinnmay/developer/happy/zen-mode-mcp-server/ecosystem.config.cjs` - PM2 config

### Backend (NAS)
- **Access:** `ssh nas@nas-1`
- **Location:** `/home/nas/developer/Happy Server/`
- **Docker:** Backend runs in containers
- **URL:** https://api.zenflo.dev

## Next Steps

1. **SSH to NAS:**
   ```bash
   ssh nas@nas-1
   cd /home/nas/developer/Happy\ Server/
   ```

2. **Locate Backend Code:**
   - Find WebSocket/Socket.IO setup
   - Find KV store implementation
   - Find existing `/v1/kv/*` HTTP endpoints

3. **Implement WebSocket Endpoint:**
   - Add `/v1/kv/watch` WebSocket route
   - Use existing auth middleware
   - Emit `kv-batch-update` messages on todo.* changes

4. **Deploy Backend:**
   - Build Docker image
   - Restart containers
   - Verify endpoint is accessible

5. **Test Integration:**
   - Watch notification service logs
   - Create/update tasks
   - Verify Telegram notifications arrive

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Happy Mobile App / Claude Code MCP                          │
│ - Create/Update tasks via HTTP POST /v1/kv                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP POST
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Happy Backend (NAS - Docker)                                 │
│ https://api.zenflo.dev                            │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ KV Store (PostgreSQL + Encryption)                    │   │
│ │ - Stores todo.* keys with NaCl encryption            │   │
│ └──────────────────────┬───────────────────────────────┘   │
│                        │                                     │
│                        │ Change detected                     │
│                        │                                     │
│                        ▼                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ WebSocket Endpoint: /v1/kv/watch                     │   │
│ │ - Emits kv-batch-update messages                     │   │
│ │ - Includes key name + version                        │   │
│ └──────────────────────┬───────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │
                         │ WebSocket (wss://)
                         │ kv-batch-update messages
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ ZenFlo Notification Service (PM2 Daemon)                     │
│ /Users/quinnmay/developer/happy/zen-mode-mcp-server         │
│                                                              │
│ 1. Receives kv-batch-update message                         │
│ 2. Filters for todo.* keys                                  │
│ 3. Fetches full task via GET /v1/kv/todo.<id>              │
│ 4. Builds notification message                              │
│ 5. Sends to Telegram                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Telegram Bot API
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Telegram (@ZenFlo_bot)                                       │
│ - Sends notification to Quinn's chat (8384113768)           │
│ - Includes inline buttons                                   │
│ - Deep links to happy://zen/task/<id>                       │
└─────────────────────────────────────────────────────────────┘
```

## Questions to Answer

1. **Does the backend already have WebSocket/Socket.IO set up?**
   - Yes, per SuperMemory: "Happy Coder employs Socket.IO for WebSocket communication"

2. **Where is the KV store implementation?**
   - Need to locate in `/home/nas/developer/Happy Server/`

3. **How are KV changes currently detected?**
   - Need to check backend code for change detection mechanism

4. **Can we piggyback on existing WebSocket infrastructure?**
   - Likely yes, just need to add `/v1/kv/watch` endpoint

## Success Criteria

✅ Notification service connects successfully to WebSocket
✅ Service receives kv-batch-update messages when tasks change
✅ Telegram notifications arrive within 5 seconds of task changes
✅ Deep links work correctly from Telegram to Happy app
✅ Service auto-reconnects if backend restarts

---

**Status:** Ready for backend implementation on NAS
**Blocker:** WebSocket endpoint `/v1/kv/watch` needs to be added to Happy backend
