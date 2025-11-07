# Max Code - Voice Assistant Configuration

**Agent ID:** `agent_1001k8zw6qdvfz7v2yabcqs8zwde`
**Platform:** ElevenLabs Conversational AI
**Owner:** Quinn May
**Last Updated:** 2025-11-07

---

## Overview

Max Code is Quinn's intelligent voice assistant for development work. He works alongside Claude (AI coding assistant) and Codex (specialized GPT-5 models) to provide voice-based interaction with coding sessions.

## Architecture

```
User (Voice)
  ↓
Max Code (ElevenLabs Agent)
  ↓
Happy Mobile App (React Native)
  ↓
Client Tools (realtimeClientTools.ts)
  ↓
Claude Code Backend (WebSocket sync)
```

## Key Features

### 1. Voice Intermediary
- Listens to voice commands
- Reformulates casual instructions into engineer-quality prompts
- Sends to Claude/Codex for execution

### 2. Cross-Session Browsing
- See all active sessions in real-time
- Browse message history across sessions
- Check status of background work

### 3. Thread Awareness
- Knows which session you're in
- Prevents cross-thread contamination
- Verifies context before sending messages

### 4. Natural Conversation
- Brief responses (1-3 sentences)
- Uses contractions and natural speech
- Mirrors user energy

---

## Client Tools

Max Code has 6 registered client tools:

### Core Tools

1. **`messageClaudeCode(message)`**
   - Sends coding instructions to Claude/Codex
   - Used for: fix bugs, add features, deploy, build, test
   - Example: "Fix the authentication bug in the login flow"

2. **`processPermissionRequest(decision)`**
   - Handles permission approvals
   - Decisions: `allow`, `allow_all`, `deny`

### Cross-Session Browsing Tools

3. **`browseAllSessions()`**
   - Returns all active sessions with full details
   - Shows: titles, paths, message counts, last activity, online status
   - Use when: "What sessions are active?"

4. **`getSessionDetails(sessionId)`**
   - Deep dive into specific session
   - Shows: recent 10 messages, message count, permission requests
   - Use when: "What's happening in [session-name]?"

5. **`getSessionMessages(sessionId, limit, offset)`**
   - Browse paginated message history
   - Limit: 1-50 messages (default 10)
   - Returns: full message content, timestamps, tool usage

6. **`listActiveSessions()`**
   - Quick overview of active sessions
   - Lighter weight than `browseAllSessions()`
   - Use when: Quick status check needed

---

## Configuration Files

### Server-Side (ElevenLabs)
- Agent configuration stored on ElevenLabs platform
- Access via API: `https://api.elevenlabs.io/v1/convai/agents/{agent_id}`
- Tools must be registered server-side

### Client-Side (Happy Mobile)
- Tool implementations: `/sources/realtime/realtimeClientTools.ts`
- Voice session setup: `/sources/realtime/RealtimeVoiceSession.tsx`
- Session utilities: `/sources/utils/sessionUtils.ts`

### Documentation
- Changelog: `/docs/max-code/CHANGELOG.md`
- This README: `/docs/max-code/README.md`
- Configuration guide: `/docs/max-code/CONFIGURATION.md` (coming soon)

---

## How to Update Max Code

### 1. Update System Prompt
```bash
# Use ElevenLabs MCP tool
mcp__elevenlabs-agent-local__update_agent_prompt \
  --agent_id agent_1001k8zw6qdvfz7v2yabcqs8zwde \
  --system_prompt "Your new prompt here"
```

### 2. Update Voice Settings
```bash
mcp__elevenlabs-agent-local__update_agent_voice \
  --agent_id agent_1001k8zw6qdvfz7v2yabcqs8zwde \
  --voice_id "Fz7HYdHHCP1EF1FLn46C" \
  --stability 0.5 \
  --similarity_boost 0.8
```

### 3. Register New Client Tool
```bash
# Update tools array via ElevenLabs API
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
              "description": "What this tool does",
              "parameters": { ... }
            }
          ]
        }
      }
    }
  }'
```

### 4. Implement Tool Locally
```typescript
// In sources/realtime/realtimeClientTools.ts
export const realtimeClientTools = {
  yourNewTool: async (parameters: unknown) => {
    // Implementation here
    return "result";
  }
};
```

---

## Testing

### Voice Commands to Test
- "What session are we in?" → Should say session name (e.g., "voice-agent-hub")
- "What sessions are active?" → Should call `browseAllSessions()` and list them
- "Tell Claude to fix the bug" → Should call `messageClaudeCode()` with reformulated prompt

### Expected Behavior
- ✅ Brief, natural responses
- ✅ Uses tools instead of explaining limitations
- ✅ Speaks in first person as Quinn
- ✅ Verifies thread context before sending messages

---

## Common Issues

### Issue: Max says session ID instead of name
**Fix:** Session name extraction now uses `getSessionName()` from sessionUtils

### Issue: Max explains he "can't access" something
**Fix:** Update prompt with "NEVER explain limitations - USE YOUR TOOLS"

### Issue: Tools not working
**Check:**
1. Are tools registered server-side on ElevenLabs? ✓
2. Are tools implemented in `realtimeClientTools.ts`? ✓
3. Is prompt explicit about when to use tools? ✓

---

## Links

- [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
- [API Documentation](https://elevenlabs.io/docs/api-reference/conversational-ai)
- [Happy Mobile Repository](https://github.com/quinnbmay/happy)

---

**Last Updated:** 2025-11-07T05:50:00Z
**Maintained By:** Quinn May via Claude Code
