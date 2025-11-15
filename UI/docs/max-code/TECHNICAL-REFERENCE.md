# Max Code Technical Reference & Debugging Guide

**Last Updated:** 2025-11-07T06:15:00Z
**Session:** voice-agent-hub debugging session
**Agent ID:** agent_1001k8zw6qdvfz7v2yabcqs8zwde

---

## Table of Contents

1. [Session Title Context Flow](#session-title-context-flow)
2. [Looping Issue Analysis](#looping-issue-analysis)
3. [Client Tool Architecture](#client-tool-architecture)
4. [Debugging Procedures](#debugging-procedures)
5. [Common Issues & Root Causes](#common-issues--root-causes)
6. [Configuration Verification](#configuration-verification)

---

## Session Title Context Flow

### Complete Data Flow

```
User starts voice call in SessionView.tsx
  ↓
  getSessionName(session) extracts title
  ↓
  startRealtimeSession(sessionId, initialContext, sessionTitle)
  ↓
RealtimeVoiceSession.tsx receives config
  ↓
  Uses getSessionName(session) again (line 104)
  ↓
  Builds threadContextText with session name (line 106)
  ↓
  Passes to ElevenLabs via dynamicVariables (line 163-169):
    - sessionId: technical ID
    - sessionName: readable title
    - threadContext: full context with recent messages
  ↓
ElevenLabs Agent receives {{sessionName}} and {{threadContext}}
  ↓
Max Code uses in responses and first_message
```

### Key Functions

**`getSessionName(session: Session): string`**
Location: `/sources/utils/sessionUtils.ts:79`

```typescript
export function getSessionName(session: Session): string {
    // Priority 1: User-defined summary
    if (session.metadata?.summary) {
        return session.metadata.summary.text;
    }
    // Priority 2: Extract from path
    else if (session.metadata) {
        const segments = session.metadata.path.split('/').filter(Boolean);
        const lastSegment = segments.pop()!;
        return lastSegment;  // e.g., "voice-agent-hub"
    }
    // Priority 3: Fallback
    return t('status.unknown');
}
```

**Why This Matters:**
- Session IDs are technical: `cmhp3lfm02ji8k313shnxglm4`
- Session names are readable: `voice-agent-hub`
- Path-based extraction works for most sessions: `/Users/quinnmay/developer/voice-agent-hub` → `voice-agent-hub`

### Session Title in Voice Context

**File:** `/sources/realtime/RealtimeVoiceSession.tsx`

**Line 102-104:**
```typescript
// Get session name and build thread context from recent messages
const session = storage.getState().sessions[config.sessionId];
const sessionName = session ? getSessionName(session) : 'your project';
```

**Line 106:**
```typescript
let threadContextText = `Thread: "${sessionName}"\n\n`;
```

**Line 163-169:**
```typescript
dynamicVariables: {
    sessionId: config.sessionId,        // Technical ID
    sessionName: sessionName,           // Readable title ⭐
    threadContext: threadContextText,   // Full context with name ⭐
    initialConversationContext: config.initialContext || '',
    hasContext: !!config.initialContext
}
```

### First Message Configuration

**ElevenLabs Agent Config:**
```json
{
  "first_message": "Hey Quinn! Ready to work on {{sessionName}}?",
  "dynamic_variables": {
    "dynamic_variable_placeholders": {
      "sessionName": "{{sessionName}}",
      "sessionId": "{{sessionId}}",
      "threadContext": "{{threadContext}}"
    }
  }
}
```

**Result:** Max says "Hey Quinn! Ready to work on voice-agent-hub?" instead of generic greeting

---

## Looping Issue Analysis

### Symptoms Observed
- Max repeating the same response multiple times
- Getting stuck in response loop
- Not completing thought before starting again

### Root Causes Identified

#### 1. Prompt Too Long (Primary Cause)
**Problem:**
- Original prompt: ~4000 characters
- Included verbose explanations, redundant examples
- Too much context for model to process efficiently

**Solution:**
- Reduced to ~2200 characters
- Removed redundant sections
- Kept only essential rules and examples

**Before:**
```
YOUR ROLE & HOW YOU WORK WITH CLAUDE/CODEX:
You're Quinn's voice intermediary who works alongside:
- **Claude** (AI coding assistant) - General development work
- **Codex** (specialized GPT-5 coding models) - Advanced coding...

HAPPY CODING ASSISTANT MODES:
Quinn can configure different modes for Claude/Codex through the Happy mobile app:

Permission Modes:
- default: Standard approval workflow
- plan: Planning-only mode (creates plans, asks for approval)
- acceptEdits: Auto-accept file edits
- bypassPermissions: Skip all approvals
- read-only: Can only read files, no writes
- safe-yolo: Auto-approve safe operations
- yolo: Full auto-pilot mode

[... many more sections ...]
```

**After:**
```
YOUR ROLE:
You're Quinn's voice intermediary working alongside Claude (AI coding assistant) and Codex (specialized GPT-5 models).

WHEN QUINN ASKS ABOUT SESSIONS/THREADS:
[Clear trigger phrases]

DECISION LOGIC - When to Answer vs Send to Claude:
[Concise rules]

IMPORTANT:
[Key points only]
```

#### 2. Model Settings Check

**Verified Settings:**
```json
{
  "llm": "glm-45-air-fp8",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

✅ All settings are appropriate
- `max_tokens: 1000` - Sufficient for responses
- `temperature: 0.7` - Good balance
- Model: `glm-45-air-fp8` - ElevenLabs Flash model for low latency

**NOT the cause:** Initially suspected low `max_tokens` (was checking if set to 10 or too restrictive), but 1000 is fine.

#### 3. Unclear Tool Usage

**Problem:** Max wasn't sure when to use tools vs when to explain

**Solution:**
```
DO NOT explain why you can't check - JUST USE THE TOOL.

"What sessions are active?" → IMMEDIATELY call browseAllSessions()
```

### Prevention Checklist

When updating Max's prompt:

- [ ] Keep total length under 2500 characters
- [ ] Use clear trigger phrases for tools
- [ ] Avoid verbose explanations
- [ ] Test with simple questions first
- [ ] Monitor for repeated responses in logs

---

## Client Tool Architecture

### Two-Part System

**Critical Understanding:** Client tools need BOTH parts to work:

1. **Server-Side Registration** (ElevenLabs API)
   - Tells Max which tools exist
   - Defines parameters and descriptions
   - Sets trigger conditions

2. **Client-Side Implementation** (Happy Mobile)
   - Located in `realtimeClientTools.ts`
   - Actual code that executes
   - Returns results to Max

### How It Works

```
User: "What sessions are active?"
  ↓
Max Code (ElevenLabs Agent)
  Processes: Prompt says "call browseAllSessions()"
  ↓
  Calls: browseAllSessions()
  ↓
ElevenLabs SDK (@elevenlabs/react-native)
  Receives: Tool call request
  ↓
  Routes to: realtimeClientTools.browseAllSessions()
  ↓
Happy Mobile App (Client-Side)
  Executes: async function browseAllSessions()
  Reads: storage.getState().sessions
  Returns: JSON.stringify({ sessions: [...], count: N })
  ↓
ElevenLabs SDK
  Sends result back to agent
  ↓
Max Code
  Receives: {"sessions": [...], "count": 3}
  Responds: "You have 3 active sessions: voice-agent-hub, Happy mobile, CombinedMemory"
```

### Tool Registration Process

**1. Check Current Tools:**
```bash
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
tools = d['conversation_config']['agent']['prompt']['tools']
for t in tools:
    if t['type'] == 'client':
        print(f'{t[\"name\"]}')"
```

**2. Register New Tool:**
```bash
curl -X PATCH 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "conversation_config": {
      "agent": {
        "prompt": {
          "tools": [
            {
              "type": "client",
              "name": "yourNewTool",
              "description": "EXECUTE THIS TOOL when...",
              "parameters": {
                "type": "object",
                "required": ["param1"],
                "properties": {
                  "param1": {
                    "type": "string",
                    "description": "What this does"
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

**3. Implement Locally:**
```typescript
// In sources/realtime/realtimeClientTools.ts
export const realtimeClientTools = {
  // ... existing tools ...

  yourNewTool: async (parameters: unknown) => {
    const schema = z.object({
      param1: z.string().min(1)
    });
    const parsed = schema.safeParse(parameters);

    if (!parsed.success) {
      console.error('❌ Invalid parameters:', parsed.error);
      return "error (invalid parameters)";
    }

    const { param1 } = parsed.data;
    const result = await doSomething(param1);
    return JSON.stringify(result);
  }
};
```

**4. No OTA/Deployment Needed:**
- Server-side changes apply immediately
- Client-side implementation already in code (if using existing tools)
- New tool implementations need OTA deployment

---

## Debugging Procedures

### Check Agent Configuration

**Get Full Config:**
```bash
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: sk_f9bf84125ea4a0dcbbe4adcf9e655439a9c08ea8fef16ab6' \
  > /tmp/max_config.json

# View specific sections
cat /tmp/max_config.json | jq '.conversation_config.agent.prompt.prompt' | head -50
cat /tmp/max_config.json | jq '.conversation_config.agent.first_message'
cat /tmp/max_config.json | jq '.conversation_config.agent.prompt.llm'
cat /tmp/max_config.json | jq '.conversation_config.agent.prompt.temperature'
cat /tmp/max_config.json | jq '.conversation_config.agent.prompt.max_tokens'
```

### Check Client Tools Registration

**List All Tools:**
```bash
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
tools = d['conversation_config']['agent']['prompt']['tools']
print('Client Tools:')
for t in tools:
    if t['type'] == 'client':
        print(f'  - {t[\"name\"]}: {t[\"description\"][:80]}...')
"
```

### Check Dynamic Variables

**List Dynamic Variables:**
```bash
cat /tmp/max_config.json | jq '.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders'
```

Expected output:
```json
{
  "threadContext": "{{threadContext}}",
  "sessionName": "{{sessionName}}",
  "sessionId": "{{sessionId}}"
}
```

### Verify Session Name Extraction

**Test getSessionName locally:**
```typescript
// In a test file or console
import { getSessionName } from '@/utils/sessionUtils';

const testSession = {
  id: "cmhp3lfm02ji8k313shnxglm4",
  metadata: {
    path: "/Users/quinnmay/developer/voice-agent-hub",
    summary: null
  }
};

console.log(getSessionName(testSession));
// Expected: "voice-agent-hub"
```

### Check Voice Session Logs

**Mobile App Console:**
Look for these log messages in React Native debugger:

```
[Max Code] Session context: {
  sessionId: "cmhp3lfm02ji8k313shnxglm4",
  sessionName: "voice-agent-hub",
  explicitTitle: "voice-agent-hub",
  hasSummary: false,
  hasName: false
}

🔍 messageClaudeCode called with: "Fix the authentication bug..."
📤 Sending message to session: cmhp3lfm02ji8k313shnxglm4

📋 listActiveSessions called, found: 3 sessions
🗂️ browseAllSessions called, found: 3 sessions
```

---

## Common Issues & Root Causes

### Issue 1: Session ID Instead of Name

**Symptoms:**
- Max says "cmhp3lfm02ji8k313shnxglm4" instead of "voice-agent-hub"
- Welcome message shows session ID
- Tool responses mention IDs

**Root Causes:**
1. Not using `getSessionName()` utility
2. Directly accessing `session.metadata?.summary?.text` (doesn't exist for all sessions)
3. Prompt doesn't instruct Max to use "title" field from tool responses

**Solution:**
1. Use `getSessionName(session)` everywhere (line 104 in RealtimeVoiceSession.tsx)
2. Update all tools to use `getSessionName()` (realtimeClientTools.ts)
3. Update prompt with "NEVER SAY SESSION IDs" section

**Verification:**
```bash
# Check if getSessionName is imported
grep "getSessionName" sources/realtime/RealtimeVoiceSession.tsx
# Should show: import { getSessionName } from '@/utils/sessionUtils';

# Check if tools use getSessionName
grep "getSessionName" sources/realtime/realtimeClientTools.ts
# Should show multiple usages
```

### Issue 2: Tools Not Working

**Symptoms:**
- Max explains he "can't access" something
- Max doesn't call tools when he should
- Tools return errors

**Root Causes:**
1. Tools not registered on ElevenLabs server (only client-side implementation exists)
2. Prompt doesn't have clear trigger phrases
3. Tool implementation has bugs

**Solution:**
1. Register tools on ElevenLabs via API (see Client Tool Architecture section)
2. Update prompt with explicit triggers: "IMMEDIATELY call toolName()"
3. Test tool implementation locally first

**Verification:**
```bash
# Check server-side registration
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/AGENT_ID' \
  -H 'xi-api-key: KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
tools = [t['name'] for t in d['conversation_config']['agent']['prompt']['tools'] if t['type'] == 'client']
print('Registered tools:', tools)
"

# Check client-side implementation
grep "export const realtimeClientTools" sources/realtime/realtimeClientTools.ts -A 100
```

### Issue 3: Looping Responses

**Symptoms:**
- Max repeats same response multiple times
- Gets stuck mid-sentence
- Doesn't complete thought

**Root Causes:**
1. Prompt too long (>3000 chars)
2. Conflicting instructions in prompt
3. Model settings too restrictive

**Solution:**
1. Reduce prompt to <2500 characters
2. Remove redundant explanations
3. Verify `max_tokens >= 500`

**Verification:**
```bash
# Check prompt length
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/AGENT_ID' \
  -H 'xi-api-key: KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
prompt = d['conversation_config']['agent']['prompt']['prompt']
print(f'Prompt length: {len(prompt)} chars')
print(f'Max tokens: {d[\"conversation_config\"][\"agent\"][\"prompt\"][\"max_tokens\"]}')
"
```

### Issue 4: Dynamic Variables Not Working

**Symptoms:**
- First message shows `{{sessionName}}` literally
- Thread context is empty
- Variables show as placeholders

**Root Causes:**
1. Variables not registered in `dynamic_variable_placeholders`
2. Variable names don't match between client and server
3. Variables not passed from client-side code

**Solution:**
1. Register in ElevenLabs config:
```json
{
  "dynamic_variables": {
    "dynamic_variable_placeholders": {
      "sessionName": "{{sessionName}}"
    }
  }
}
```

2. Pass from client (RealtimeVoiceSession.tsx line 163):
```typescript
dynamicVariables: {
    sessionName: sessionName  // Variable name must match
}
```

---

## Configuration Verification

### Complete Verification Checklist

Run these checks to verify Max Code is properly configured:

```bash
# 1. Check agent exists and is active
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Agent Name:', d['name'])
print('Agent ID:', d['agent_id'])
print('Voice ID:', d['conversation_config']['tts']['voice_id'])
"

# 2. Check prompt has critical sections
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
prompt = d['conversation_config']['agent']['prompt']['prompt']
checks = {
    'Has CRITICAL section': 'CRITICAL: NEVER SAY SESSION IDs' in prompt,
    'Has tool triggers': 'browseAllSessions()' in prompt,
    'Has examples': '✅' in prompt,
    'Length OK': len(prompt) < 2500
}
for check, passed in checks.items():
    status = '✓' if passed else '✗'
    print(f'{status} {check}')
"

# 3. Check all 6 tools registered
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
expected = ['messageClaudeCode', 'processPermissionRequest', 'browseAllSessions',
            'getSessionDetails', 'getSessionMessages', 'listActiveSessions']
tools = [t['name'] for t in d['conversation_config']['agent']['prompt']['tools'] if t['type'] == 'client']
for tool in expected:
    status = '✓' if tool in tools else '✗'
    print(f'{status} {tool}')
"

# 4. Check dynamic variables registered
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
dvars = d['conversation_config']['agent']['dynamic_variables']['dynamic_variable_placeholders']
expected = ['sessionName', 'sessionId', 'threadContext']
for var in expected:
    status = '✓' if var in dvars else '✗'
    print(f'{status} {var}')
"

# 5. Check first message has variable
curl -s -X GET 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' | python3 -c "
import sys, json
d = json.load(sys.stdin)
first_msg = d['conversation_config']['agent']['first_message']
print('First message:', first_msg)
print('✓ Has variable' if '{{sessionName}}' in first_msg else '✗ Missing variable')
"
```

### Expected Output (All Passing)

```
Agent Name: Max Code
Agent ID: agent_1001k8zw6qdvfz7v2yabcqs8zwde
Voice ID: Fz7HYdHHCP1EF1FLn46C

✓ Has CRITICAL section
✓ Has tool triggers
✓ Has examples
✓ Length OK

✓ messageClaudeCode
✓ processPermissionRequest
✓ browseAllSessions
✓ getSessionDetails
✓ getSessionMessages
✓ listActiveSessions

✓ sessionName
✓ sessionId
✓ threadContext

First message: Hey Quinn! Ready to work on {{sessionName}}?
✓ Has variable
```

---

## Quick Reference Commands

### Update Prompt
```bash
curl -X PATCH 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d @/tmp/new_prompt.json
```

### Update First Message
```bash
curl -X PATCH 'https://api.elevenlabs.io/v1/convai/agents/agent_1001k8zw6qdvfz7v2yabcqs8zwde' \
  -H 'xi-api-key: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "conversation_config": {
      "agent": {
        "first_message": "New greeting here with {{sessionName}}"
      }
    }
  }'
```

### Deploy OTA (if client code changed)
```bash
cd /Users/quinnmay/developer/happy/happy-mobile
yarn ota:production
```

---

**End of Technical Reference**
**For user-facing docs, see README.md and TOOLS.md**
