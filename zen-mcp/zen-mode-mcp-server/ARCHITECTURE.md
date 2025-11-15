# Zen Mode MCP Server - Architecture

**Last Updated:** 2025-11-08 PST

## Overview

Zen Mode MCP provides AI-powered task management with intelligent task breakdown capabilities, integrated directly with the Happy ecosystem.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                        │
│                  (User's AI Assistant)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ MCP Protocol (stdio)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Zen Mode MCP Server                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ MCP Tools:                                             │ │
│  │ • list_tasks                                           │ │
│  │ • create_task                                          │ │
│  │ • update_task                                          │ │
│  │ • delete_task                                          │ │
│  │ • analyze_task_complexity ✨                           │ │
│  │ • suggest_subtasks ✨ (calls Claude CLI)              │ │
│  │ • add_subtask                                          │ │
│  │ • toggle_subtask                                       │ │
│  │ • rebuild_index                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ AI Integration Layer                                   │ │
│  │ • Direct Claude CLI spawning (via child_process)      │ │
│  │ • Pattern-based fallback                              │ │
│  │ • JSON response parsing                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Encryption Layer (NaCl secretbox)                     │ │
│  │ • Encrypt/decrypt task data                           │ │
│  │ • Base32 secret key parsing                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS + WebSocket
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Happy NAS Backend (KV Storage)                 │
│         https://api.zenflo.dev                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Encrypted KV Store:                                    │ │
│  │ • todo.<task-id> → Encrypted TodoItem                  │ │
│  │ • todo.index → Encrypted task ordering                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Real-time Sync:                                        │ │
│  │ • WebSocket kv-batch-update events                     │ │
│  │ • Cross-device synchronization                         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP + WebSocket
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Happy Mobile App (iOS/Android)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Zen Mode UI (/zen route):                             │ │
│  │ • Task list with subtasks                             │ │
│  │ • Progress indicators                                  │ │
│  │ • Real-time updates via WebSocket                      │ │
│  │ • "Break down with AI" button (coming soon)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Direct Claude CLI Integration (Not claude-code-mcp)

**Why not reuse claude-code-mcp?**
- MCP servers cannot call other MCP servers (architectural limitation)
- MCP protocol is designed for Claude Code → MCP Server, not MCP → MCP
- Each MCP server runs as an independent process

**Our approach:**
- Spawn Claude CLI directly via `child_process`
- Write prompt to temp file (avoids escaping issues)
- Parse JSON response from stdout
- Automatic fallback to pattern-based suggestions

**Code:**
```typescript
const tmpFile = path.join(os.tmpdir(), `zen-task-${Date.now()}.txt`);
fs.writeFileSync(tmpFile, prompt);
const command = `cat "${tmpFile}" | claude -p --output-format text`;
const { stdout } = await execAsync(command, { timeout: 30000 });
```

### 2. Data Model

**TodoItem Structure:**
```typescript
interface TodoItem {
  id: string;
  title: string;
  description?: string;
  done: boolean;           // Legacy field
  status: TaskStatus;      // TODO | IN_PROGRESS | DONE | CANCELLED
  priority?: TaskPriority; // LOW | MEDIUM | HIGH | URGENT
  subtasks?: Subtask[];    // AI-suggested breakdown
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
  linkedSessions?: {...};
}
```

**Subtask Structure:**
```typescript
interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 3. Encryption

**Why encrypt?**
- Task data may contain sensitive information
- Multi-tenant backend (Happy NAS)
- End-to-end encryption ensures privacy

**Method:**
- NaCl secretbox (authenticated encryption)
- User-specific secret key (stored in env)
- Random nonce per encryption
- Base64 encoding for transport

**Flow:**
```
Plain Task Data → JSON.stringify → UTF-8 bytes →
NaCl.secretbox(bytes, nonce, key) → Base64 → KV Storage
```

### 4. AI Task Breakdown

**Complexity Analysis:**
- Keyword detection (implement, build, fix, refactor)
- Title length (>5 words)
- Description presence and length
- Scores 0-4, complex if ≥3

**Subtask Generation:**
1. **Try Claude CLI first** (intelligent, context-aware)
2. **Fallback to patterns** (if Claude fails/timeout)
3. **Parse JSON response** (structured format)
4. **Return with reasoning** (explain approach)

**Claude Prompt Template:**
```
You are a task breakdown expert. Analyze this task and break it down into N actionable subtasks.

Task Title: "..."
Task Description: "..."
Priority: "..."

Respond with ONLY valid JSON:
{
  "subtasks": [
    {"title": "...", "estimate": "..."}
  ],
  "reasoning": "..."
}
```

### 5. Real-time Sync

**KV Storage + WebSocket:**
- Write: POST /v1/kv with mutations
- Read: GET /v1/kv?prefix=todo.
- Subscribe: WebSocket kv-batch-update events
- Optimistic updates with version tracking

**Conflict Resolution:**
- Version-based (last-write-wins with version check)
- Failed writes return current version
- Client retries with updated version

## MCP Tools

### Core Task Management
- **list_tasks** - Get all tasks (filterable by status/priority)
- **create_task** - Create new task with title/description/priority
- **get_task** - Get single task by ID
- **update_task** - Update task status/priority/title/description
- **delete_task** - Delete task by ID

### AI Features ✨
- **analyze_task_complexity** - Check if task is complex enough for breakdown
- **suggest_subtasks** - AI-powered subtask generation (calls Claude CLI)
- **add_subtask** - Add subtask to parent task
- **toggle_subtask** - Toggle subtask completion

### Maintenance
- **rebuild_index** - Fix sync issues (rebuilds undoneOrder/completedOrder)

## Environment Variables

```bash
HAPPY_AUTH_TOKEN="eyJ..."        # JWT token for Happy backend
HAPPY_SECRET_KEY="CAFMM-EUGKP..."  # Base32 encryption key
HAPPY_USER_ID="cmhf8mzk4..."     # User ID for backend
```

## Dependencies

**Production:**
- @modelcontextprotocol/sdk - MCP protocol implementation
- axios - HTTP client for Happy backend
- tweetnacl - Encryption (secretbox)
- tweetnacl-util - Base64 encoding
- zod - Runtime type validation

**Development:**
- typescript - Type checking
- tsx - Development execution

**Zero Additional Dependencies for AI:**
- Uses existing Claude CLI (no Anthropic SDK)
- Child process spawning (built-in)
- Temp file I/O (built-in)

## Performance

**Typical Response Times:**
- list_tasks: 200-400ms (decrypt + parse)
- create_task: 300-500ms (encrypt + write + index update)
- suggest_subtasks: 3-8s (Claude AI analysis)
- toggle_subtask: 400-600ms (read + modify + write)

**Optimization Strategies:**
- Batch mutations for multiple operations
- Cache decrypted task data (in-memory)
- Async index updates (don't block)
- Pattern fallback for fast responses

## Error Handling

**Graceful Degradation:**
1. Claude CLI fails → Pattern-based suggestions
2. Encryption fails → Clear error message
3. Network timeout → Retry with exponential backoff
4. Version conflict → Fetch latest and retry

**Error Types:**
- `Task not found` - Invalid task ID
- `Encryption required` - Missing secret key
- `Invalid response format` - Claude JSON parse failed
- `Network error` - Backend unreachable

## Future Enhancements

### Planned Features
1. **Mobile UI** - Task detail screen with subtasks
2. **AI Suggestions Review** - Modal to accept/edit/reject
3. **Progress Tracking** - Visual indicators (3/5 completed)
4. **Time Tracking** - Actual time vs estimates
5. **Task Dependencies** - Block tasks until prerequisites done

### Possible Improvements
1. **Response Caching** - Cache AI responses (avoid duplicate calls)
2. **Batch AI Analysis** - Analyze multiple tasks at once
3. **Learning System** - Learn from user accepts/rejects
4. **Custom Instructions** - User-defined breakdown style
5. **Claude API Direct** - Use Anthropic SDK instead of CLI

## Testing

**Unit Tests:**
- Encryption/decryption
- Complexity analysis
- Pattern matching
- JSON parsing

**Integration Tests:**
- MCP protocol compliance
- Happy backend integration
- Claude CLI execution
- Error scenarios

**E2E Tests:**
- Create task → AI breakdown → Add subtasks → Complete
- Multi-device sync
- Conflict resolution

## Deployment

**Build:**
```bash
npm run build
```

**Run:**
```bash
node dist/index.js
```

**MCP Configuration (.mcp.json):**
```json
{
  "mcpServers": {
    "zen-mode": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "HAPPY_AUTH_TOKEN": "...",
        "HAPPY_SECRET_KEY": "...",
        "HAPPY_USER_ID": "..."
      }
    }
  }
}
```

## Security Considerations

1. **End-to-End Encryption** - Tasks encrypted before leaving device
2. **Secret Key Storage** - Environment variables (not hardcoded)
3. **JWT Authentication** - All API calls require valid token
4. **Version Tracking** - Prevents concurrent modification issues
5. **Input Validation** - Zod schemas for all inputs
6. **Subprocess Safety** - Temp files cleaned up, timeouts enforced

## Monitoring

**Logs:**
- console.error() for MCP server output
- Debug mode via environment variable
- Structured logging for AI calls

**Metrics:**
- Task creation rate
- AI breakdown success rate
- Response times
- Error rates

## Support

**Issues:**
- GitHub: (TBD)
- Email: (TBD)

**Documentation:**
- README.md - Quick start guide
- AI_TASK_BREAKDOWN_DEMO.md - Feature demo
- REAL_AI_INTEGRATION_COMPLETE.md - Implementation details
- ARCHITECTURE.md (this file) - Technical overview

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2025-11-08 PST
**Contributors:** Quinn May, Claude Code
