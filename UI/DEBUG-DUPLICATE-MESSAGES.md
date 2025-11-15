# Debug: Duplicate Message Sending in Max Voice Assistant

**Issue:** Max sends prompts twice when forwarding messages to Claude Code

**Date:** 2025-01-11

---

## Investigation Summary

Added detailed logging to trace the entire message flow from Max's voice command to Claude Code.

### Code Changes

**Files Modified:**
1. `mobile/sources/realtime/realtimeClientTools.ts` - Added logging to `messageClaudeCode` tool
2. `mobile/sources/sync/sync.ts` - Added logging to `sendMessage` and `applyMessages` methods

**What the logs show:**
- Each function call gets a unique ID (e.g., `[abc123]`)
- Timestamps for every critical step
- Clear markers for when functions are called and completed

---

## How to Debug

### Step 1: Reproduce the Issue

1. Start the mobile app with logging enabled
2. Activate Max voice assistant
3. Ask Max to send a message to Claude (e.g., "Send Claude a message saying 'test'")
4. Watch the console output

### Step 2: Analyze the Logs

Look for these log patterns:

#### **Pattern A: Tool Called Once (Expected)**
```
🎤 [timestamp] [abc123] messageClaudeCode CALLED
📨 [timestamp] [xyz456] sync.sendMessage CALLED
📨 [xyz456] CALLING apiSocket.send NOW with localId: uuid-1234
✅ [xyz456] apiSocket.send COMPLETED
```

#### **Pattern B: Tool Called Twice (BUG)**
```
🎤 [timestamp] [abc123] messageClaudeCode CALLED
📨 [timestamp] [xyz456] sync.sendMessage CALLED
🎤 [timestamp] [def789] messageClaudeCode CALLED  ← DUPLICATE CALL
📨 [timestamp] [uvw012] sync.sendMessage CALLED  ← DUPLICATE CALL
```

#### **Pattern C: Message Applied Twice (DIFFERENT BUG)**
```
📨 [xyz456] CALLING apiSocket.send NOW with localId: uuid-1234
📝 [aaa111] applyMessages CALLED with 1 messages
📝 [bbb222] applyMessages CALLED with 1 messages  ← DUPLICATE APPLICATION
```

### Step 3: Determine Root Cause

Based on the log pattern:

1. **If Pattern B appears:**
   - Root cause: ElevenLabs is calling the `messageClaudeCode` tool twice
   - Location: Client-side issue (ElevenLabs SDK or server)
   - Solution: Check ElevenLabs conversation configuration, look for duplicate tool registrations

2. **If Pattern C appears:**
   - Root cause: Message is being applied to storage twice
   - Location: `sync.ts` applyMessages or storage reducer
   - Solution: Check for duplicate event listeners or race conditions

3. **If messages appear twice in UI but only one call in logs:**
   - Root cause: UI rendering issue
   - Location: Message list component
   - Solution: Check React key props and memo dependencies

---

## Key Questions to Answer

1. **Does `messageClaudeCode` get called once or twice?**
   - Count the `🎤 messageClaudeCode CALLED` logs
   - Each should have a unique callId

2. **Does `sync.sendMessage` get called once or twice?**
   - Count the `📨 sync.sendMessage CALLED` logs
   - Each should have a unique sendId

3. **Does `apiSocket.send` get called once or twice?**
   - Count the `CALLING apiSocket.send NOW` logs
   - Should match the number of sendMessage calls

4. **Does `applyMessages` get called multiple times for the same message?**
   - Look for `📝 applyMessages CALLED` logs
   - Check if the same localId appears in multiple applyMessages calls

---

## Expected Flow (Single Message)

```
User speaks to Max
    ↓
ElevenLabs agent decides to use messageClaudeCode tool
    ↓
🎤 messageClaudeCode CALLED [abc123]
    ↓
📨 sync.sendMessage CALLED [xyz456]
    ↓
Message added to local storage via applyMessages
📝 applyMessages CALLED [aaa111]
    ↓
Message encrypted and sent to backend
📨 CALLING apiSocket.send NOW with localId: uuid-1234
    ↓
✅ apiSocket.send COMPLETED
    ↓
Backend processes and returns message to Claude
    ↓
Claude receives ONE message
```

---

## Next Steps After Debugging

Once you've identified the pattern from the logs:

### If ElevenLabs is calling the tool twice:
1. Check `RealtimeVoiceSession.tsx` - look for duplicate `useConversation` hooks
2. Check if `clientTools` is being registered multiple times
3. Verify `hasRegistered.current` ref is working correctly
4. Check ElevenLabs server-side agent configuration for duplicate tool definitions

### If applyMessages is being called twice:
1. Check `handleUpdate` in sync.ts for duplicate processing
2. Look for duplicate WebSocket event listeners
3. Check if message is being sent both locally and from server echo

### If it's a UI issue:
1. Check message list component for duplicate rendering
2. Verify React keys are unique and stable
3. Check if message deduplication is working in the reducer

---

## Cleanup

Once debugging is complete, you can either:

1. **Keep the logs** (recommended for production debugging)
   - They're low overhead and very helpful for troubleshooting
   - Consider wrapping them in `VOICE_CONFIG.ENABLE_DEBUG_LOGGING` checks

2. **Remove the logs**
   - Remove all log statements added in this session
   - Restore original function signatures
