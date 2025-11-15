# Zen Mode Notification Integration

**Created:** 2025-11-08T01:15:00Z
**Status:** Design & Implementation Plan

---

## 🎯 Goals

1. **Push notifications** when tasks are created/updated
2. **Reply to notifications** to work on tasks
3. **Session linking** - see which Claude Code session is working on a task
4. **Deep linking** - tap notification → open task in Happy app

---

## 🏗️ Architecture

### Components

```
┌──────────────────────────────────────────────────────────┐
│  1. WebSocket Listener (Node.js service)                 │
│     - Connects to api.zenflo.dev WebSocket     │
│     - Listens for kv-batch-update messages               │
│     - Filters for todo.* changes                         │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  2. Notification Dispatcher                               │
│     - Telegram Bot API (instant messaging)                │
│     - APNS (iOS native push)                              │
│     - FCM (Android native push)                           │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  3. User Device                                           │
│     - Receives notification                               │
│     - Shows: Task title, priority, session info           │
│     - Actions: "Open Task", "Work on This", "Dismiss"    │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  4. Response Handler                                      │
│     - "Open Task" → happy://zen/task/{id}                │
│     - "Work on This" → Links current Claude Code session │
│     - Updates task.linkedSessions                        │
└──────────────────────────────────────────────────────────┘
```

---

## 📱 Notification Formats

### Telegram Message
```
🔥 New Task: Deploy to production
Priority: HIGH
Status: TODO
Created: 2 minutes ago

🎯 Work on this task
📱 Open in Happy
🔕 Dismiss
```

### iOS Push Notification
```
Title: 🔥 New Task: Deploy to production
Body: Priority: HIGH • Created by Claude Code
Actions: [Work on This] [Open App] [Dismiss]
```

---

## 🔗 Session Linking Flow

### When Claude Creates a Task

```typescript
// 1. Claude Code MCP creates task
const taskId = await mcp__zen_mode__create_task({
  title: "Fix deployment bug",
  priority: "HIGH"
});

// 2. MCP automatically links current session
const sessionId = process.env.CLAUDE_SESSION_ID || "unknown";
const sessionTitle = process.env.CLAUDE_SESSION_TITLE || "Claude Code Session";

await updateTaskLinkedSessions(taskId, {
  [sessionId]: {
    title: sessionTitle,
    linkedAt: Date.now()
  }
});

// 3. Notification sent with session info
"🔥 New Task: Fix deployment bug
Created in: Claude Code Session
🎯 Work on this task (links current session)"
```

### When User Replies "Work on This"

```typescript
// 1. User taps "Work on This" in Telegram
// Telegram sends callback: /work {taskId}

// 2. Bot updates task with new session
const currentSessionId = detectCurrentClaudeCodeSession();
await updateTaskLinkedSessions(taskId, {
  ...existingLinkedSessions,
  [currentSessionId]: {
    title: "Working on task from notification",
    linkedAt: Date.now()
  }
});

// 3. Happy app shows all linked sessions
// User sees: "2 sessions working on this task"
```

---

## 🎯 Implementation Steps

### Phase 1: WebSocket Listener (30 min)
```bash
/Users/quinnmay/developer/happy/zen-mode-mcp-server/
├── src/
│   ├── notification-service.ts  # NEW
│   └── websocket-client.ts      # NEW
```

**Features:**
- Connect to Happy backend WebSocket
- Listen for `kv-batch-update` messages
- Filter for `todo.*` keys
- Decrypt task data
- Emit notification events

### Phase 2: Telegram Integration (20 min)
```bash
/Users/quinnmay/developer/happy/zen-mode-mcp-server/
├── src/
│   ├── telegram-bot.ts          # NEW
│   └── notification-templates.ts # NEW
```

**Features:**
- Send task notifications to Telegram
- Inline keyboard: [Work on This] [Open App] [Dismiss]
- Handle callback queries
- Link sessions when user replies

### Phase 3: Session Detection (15 min)
```bash
/Users/quinnmay/developer/happy/zen-mode-mcp-server/
├── src/
│   └── session-detector.ts      # NEW
```

**Features:**
- Detect current Claude Code session ID
- Read from environment variables
- Fallback to process metadata
- Generate session titles

### Phase 4: Deep Linking (10 min)
```bash
/Users/quinnmay/developer/happy/happy-mobile/
├── sources/
│   └── linking/
│       └── ZenDeepLinks.tsx     # NEW
```

**Features:**
- Register URL scheme: `happy://zen/task/{id}`
- Handle incoming deep links
- Navigate to Zen task view
- Highlight linked sessions

---

## 🔐 Security

**Authentication:**
- Telegram Bot Token (stored in env)
- User ID verification (Telegram user must match Happy user)
- Session tokens for linking

**Encryption:**
- Task data encrypted in transit (HTTPS/WSS)
- Bot messages ephemeral (auto-delete after 24h)

---

## 📊 Data Flow Example

### Scenario: Claude creates a task

```
1. Claude Code (User's Mac)
   │ mcp__zen_mode__create_task("Fix API bug")
   │
2. Zen Mode MCP Server (localhost:3000)
   │ POST /v1/kv {key: "todo.abc123", value: encrypted}
   │ session_id: "claude-code-session-xyz"
   │
3. Happy Backend (NAS)
   │ Stores encrypted task
   │ Broadcasts WebSocket: kv-batch-update
   │
4. Notification Service (Listening to WebSocket)
   │ Receives: {key: "todo.abc123", version: 1}
   │ Fetches & decrypts task
   │ Sees linkedSessions: {"claude-code-session-xyz": {...}}
   │
5. Telegram Bot
   │ Sends message to Quinn:
   │ "🔥 New Task: Fix API bug
   │  Created in: Claude Code Session
   │  Priority: HIGH"
   │ Buttons: [Work on This] [Open App]
   │
6. Quinn taps "Work on This"
   │ Bot updates task.linkedSessions
   │ Adds current session to task
   │ Confirms: "✅ You're now working on this task!"
   │
7. Happy App (/zen)
   │ Shows task with 2 linked sessions
   │ User can see Claude Code is working on it
```

---

## 🚀 Quick Start Command

```bash
# Start notification service
cd /Users/quinnmay/developer/happy/zen-mode-mcp-server
TELEGRAM_BOT_TOKEN="your-token" \
HAPPY_AUTH_TOKEN="..." \
HAPPY_SECRET_KEY="..." \
node dist/notification-service.js
```

---

## 🎨 UI Mockup (Happy App)

```
┌─────────────────────────────────────┐
│ ✨ Fix API bug                      │
│ Priority: HIGH • In Progress        │
├─────────────────────────────────────┤
│ 👥 Linked Sessions (2):             │
│                                     │
│ 🖥️  Claude Code Session             │
│     Started 5 minutes ago           │
│     [Open Session]                  │
│                                     │
│ 📱 Working from notification        │
│     Started 2 minutes ago           │
│     [You] [Current]                 │
│                                     │
│ ➕ Link Current Session             │
└─────────────────────────────────────┘
```

---

## 📝 Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
TELEGRAM_CHAT_ID="your-telegram-user-id"

# Happy Backend
HAPPY_AUTH_TOKEN="eyJhbGci..."
HAPPY_SECRET_KEY="CAFMM-EUGKP..."

# Claude Code Session Detection
CLAUDE_SESSION_ID="auto-detected"
CLAUDE_SESSION_TITLE="auto-detected"
```

---

## 🎯 Next Steps

1. **Build WebSocket listener**
2. **Integrate Telegram bot**
3. **Add session detection**
4. **Test end-to-end flow**
5. **Deploy notification service** (run 24/7)

---

**Total Implementation Time:** ~1.5 hours
**Complexity:** Medium
**Impact:** HIGH - Complete task workflow integration! 🚀
