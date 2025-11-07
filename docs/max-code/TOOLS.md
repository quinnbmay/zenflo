# Max Code Client Tools Reference

Complete reference for all client tools available to Max Code.

---

## Tool Registration Architecture

**Two Parts Required:**

1. **Server-Side Registration** (ElevenLabs)
   - Tells Max which tools exist
   - Defines parameters and descriptions
   - Triggers when Max should use them

2. **Client-Side Implementation** (Happy Mobile)
   - Located in: `/sources/realtime/realtimeClientTools.ts`
   - Actual code that executes when tool is called
   - Returns results back to Max

---

## Core Tools

### `messageClaudeCode(message: string)`

**Purpose:** Send coding instructions to Claude/Codex

**When to Use:**
- Fix bugs
- Add features
- Deploy code
- Run builds/tests
- File operations
- Debugging

**Parameters:**
```typescript
{
  message: string  // Required - The reformulated engineering-quality prompt
}
```

**Example Usage:**
```
User: "Fix the authentication bug"
Max: ✓ (sends reformulated prompt)
Tool Call: messageClaudeCode({
  message: "I need you to debug and fix the authentication error in the login service. The error logs show 'invalid token'. Check the JWT verification logic and ensure tokens are being validated correctly."
})
```

**Returns:** `"sent [DO NOT say anything else, simply say 'sent']"`

---

### `processPermissionRequest(decision: string)`

**Purpose:** Handle permission approval requests from Claude

**When to Use:**
- Quinn responds with "allow", "deny", or "allow all"
- Claude needs permission for file edits, deployments, etc.

**Parameters:**
```typescript
{
  decision: "allow" | "allow_all" | "deny"
}
```

**Example Usage:**
```
Claude: "Can I edit LoginController.ts?"
User: "Allow"
Tool Call: processPermissionRequest({ decision: "allow" })
```

**Returns:** `"done [DO NOT say anything else, simply say 'done']"`

---

## Cross-Session Browsing Tools

### `browseAllSessions()`

**Purpose:** Get comprehensive overview of ALL active sessions

**When to Use:**
- "What sessions are active?"
- "What am I working on?"
- "Show me all my sessions"
- "What's happening across my projects?"

**Parameters:** None

**Example Usage:**
```
User: "What sessions are active right now?"
Tool Call: browseAllSessions()
```

**Returns:**
```json
{
  "sessions": [
    {
      "id": "cmhp3lfm02ji8k313shnxglm4",
      "title": "voice-agent-hub",
      "path": "/Users/quinnmay/developer/voice-agent-hub",
      "isOnline": true,
      "isThinking": false,
      "lastActive": "2025-11-07T05:45:00Z",
      "messageCount": 127,
      "lastMessagePreview": "Perfect! I'll investigate why the cross-session...",
      "lastMessageRole": "assistant",
      "hasPermissionRequests": false
    },
    {
      "id": "abc123xyz",
      "title": "happy",
      "path": "/Users/quinnmay/developer/happy/happy-mobile",
      "isOnline": true,
      "isThinking": true,
      "lastActive": "2025-11-07T05:30:00Z",
      "messageCount": 89,
      "lastMessagePreview": "Deploying OTA update to production...",
      "lastMessageRole": "assistant",
      "hasPermissionRequests": false
    }
  ],
  "count": 2
}
```

**Response to User:**
```
"You've got two active sessions right now. We're in voice-agent-hub, and you also have Happy mobile open where Claude is deploying an OTA update."
```

---

### `getSessionDetails(sessionId: string)`

**Purpose:** Deep dive into a specific session

**When to Use:**
- "What's happening in [session-name]?"
- "Tell me about the Happy session"
- "Check the voice-agent-hub thread"

**Parameters:**
```typescript
{
  sessionId: string  // Required - The session ID to inspect
}
```

**Example Usage:**
```
User: "What's happening in the Happy session?"
Tool Call: getSessionDetails({ sessionId: "abc123xyz" })
```

**Returns:**
```json
{
  "id": "abc123xyz",
  "title": "happy",
  "path": "/Users/quinnmay/developer/happy/happy-mobile",
  "isOnline": true,
  "isThinking": false,
  "lastActive": "2025-11-07T05:30:00Z",
  "messageCount": 89,
  "recentMessages": [
    {
      "role": "user",
      "preview": "Deploy the OTA update to production",
      "timestamp": 1699300000000
    },
    {
      "role": "assistant",
      "preview": "I'll deploy the OTA update now. Running yarn ota:production...",
      "timestamp": 1699300005000
    }
  ],
  "hasPermissionRequests": false
}
```

**Response to User:**
```
"In the Happy session, you last asked me to deploy an OTA update about 15 minutes ago. I ran the deployment and it completed successfully. No pending permission requests."
```

---

### `getSessionMessages(sessionId: string, limit?: number, offset?: number)`

**Purpose:** Browse paginated message history from a session

**When to Use:**
- "Show me the conversation history from [session]"
- "What did we discuss in Happy earlier?"
- "Read back the last few messages from voice-agent-hub"

**Parameters:**
```typescript
{
  sessionId: string,     // Required - Session to get messages from
  limit?: number,        // Optional - Messages to retrieve (1-50, default 10)
  offset?: number        // Optional - Pagination offset (default 0)
}
```

**Example Usage:**
```
User: "Show me the last 5 messages from Happy"
Tool Call: getSessionMessages({
  sessionId: "abc123xyz",
  limit: 5,
  offset: 0
})
```

**Returns:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Deploy the OTA update to production",
      "timestamp": 1699300000000,
      "hasTools": false
    },
    {
      "role": "assistant",
      "content": "I'll deploy the OTA update now. Running yarn ota:production...",
      "timestamp": 1699300005000,
      "hasTools": true
    }
  ],
  "total": 89,
  "hasMore": true,
  "offset": 0,
  "limit": 5
}
```

**Response to User:**
```
"Looking at the Happy session, the last 5 messages show you asked me to deploy an OTA update, I ran the deployment, and it completed successfully. There are 89 total messages in that thread."
```

---

### `listActiveSessions()`

**Purpose:** Quick lightweight overview of active sessions

**When to Use:**
- Quick status check
- When `browseAllSessions()` is too heavy
- Just need session names and basic info

**Parameters:** None

**Example Usage:**
```
User: "Quick - what sessions are open?"
Tool Call: listActiveSessions()
```

**Returns:**
```json
{
  "sessions": [
    {
      "id": "cmhp3lfm02ji8k313shnxglm4",
      "title": "voice-agent-hub",
      "path": "/Users/quinnmay/developer/voice-agent-hub",
      "isOnline": true,
      "isThinking": false,
      "lastActive": "2025-11-07T05:45:00Z"
    },
    {
      "id": "abc123xyz",
      "title": "happy",
      "path": "/Users/quinnmay/developer/happy/happy-mobile",
      "isOnline": true,
      "isThinking": true,
      "lastActive": "2025-11-07T05:30:00Z"
    }
  ],
  "count": 2
}
```

**Difference from `browseAllSessions()`:**
- ❌ No message counts
- ❌ No message previews
- ❌ No permission request info
- ✅ Faster, lighter weight
- ✅ Good for quick checks

---

## Tool Implementation Guide

### Adding a New Client Tool

**1. Register on ElevenLabs (Server-Side)**

```bash
curl -X PATCH 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "conversation_config": {
      "agent": {
        "prompt": {
          "tools": [
            {
              "type": "client",
              "name": "yourNewTool",
              "description": "EXECUTE THIS TOOL when... Clear trigger phrase here.",
              "parameters": {
                "type": "object",
                "required": ["param1"],
                "properties": {
                  "param1": {
                    "type": "string",
                    "description": "What this parameter does"
                  }
                }
              }
            }
          ]
        }
      }
    }
  }'
```

**2. Implement Locally (Client-Side)**

```typescript
// In sources/realtime/realtimeClientTools.ts

export const realtimeClientTools = {
  // ... existing tools ...

  yourNewTool: async (parameters: unknown) => {
    // 1. Validate parameters with Zod
    const schema = z.object({
      param1: z.string().min(1, 'Parameter required')
    });
    const parsed = schema.safeParse(parameters);

    if (!parsed.success) {
      console.error('❌ Invalid parameters:', parsed.error);
      return "error (invalid parameters)";
    }

    const { param1 } = parsed.data;

    // 2. Implement tool logic
    const result = await doSomething(param1);

    // 3. Return result as JSON string
    return JSON.stringify(result);
  }
};
```

**3. Update Max's Prompt**

Add trigger phrase to system prompt:
```
WHEN QUINN ASKS ABOUT X:
"What's the status of X?" → IMMEDIATELY call yourNewTool()
```

**4. Test**

Ask Max via voice to trigger the tool and verify it works.

---

## Best Practices

### Tool Naming
- Use camelCase: `getSessionDetails` not `get_session_details`
- Be descriptive: `browseAllSessions` not `browse`
- Prefix with verb: `get`, `list`, `browse`, `process`

### Tool Descriptions
- Start with "EXECUTE THIS TOOL"
- Include clear trigger phrases
- Explain WHEN to use, not just WHAT it does

### Parameter Validation
- Always validate with Zod
- Provide clear error messages
- Use TypeScript types for safety

### Return Values
- Return JSON strings for structured data
- Return simple strings for confirmations
- Keep responses concise for voice

### Error Handling
```typescript
if (!parsed.success) {
  console.error('❌ Tool error:', parsed.error);
  return "error (brief explanation)";
}
```

---

**Last Updated:** 2025-11-07T05:50:00Z
