# SuperMemory Integration in Zen Voice Assistant

**Date:** 2025-11-09
**Status:** ✅ Implemented (Awaiting API key configuration)

## Overview

Native SuperMemory integration has been implemented in the Zen voice assistant using the `@supermemory/tools/openai` package. This replaces the previous MCP-based approach that only worked on desktop/CLI.

## Changes Made

### 1. Package Installation
```bash
npm install @supermemory/tools
```
- Version: `1.3.2`
- Adds ~55 packages to dependencies

### 2. Updated Files

#### `mobile/sources/-zen/tools/zenTools.ts`
- **Import added:** `createToolCallExecutor` from `@supermemory/tools/openai`
- **Configuration:** API key via `process.env.EXPO_PUBLIC_SUPERMEMORY_API_KEY`
- **Executor initialization:** Creates tool executor if API key is available
- **Updated `search_memory`:**
  - Now uses SDK instead of MCP
  - Works on mobile + desktop
  - Returns concise summaries (top 3 results)
  - Graceful fallback if API key missing
- **Updated `remember_this`:**
  - Now uses SDK instead of MCP
  - Works on mobile + desktop
  - Stores to 'zenflo' project by default
  - Graceful fallback if API key missing

#### `mobile/sources/-zen/hooks/useZenVoice.ts`
- **System instructions updated:**
  - Memory capabilities now listed as "mobile + desktop"
  - Removed "desktop/CLI only" restrictions
  - Updated availability messaging
  - Removed example showing mobile unavailability

### 3. Tool Schema Updates

Updated OpenAI function descriptions in `zenToolsSchema`:
- `search_memory`: Removed "desktop only" note
- `remember_this`: Removed "desktop only" note

## Configuration Required

### Environment Variable
Set the SuperMemory API key in one of these ways:

**Option 1: Local development** (`.env.local` in mobile directory)
```bash
EXPO_PUBLIC_SUPERMEMORY_API_KEY=your_api_key_here
```

**Option 2: EAS Build** (via `eas.json` secrets)
```bash
eas secret:create --name EXPO_PUBLIC_SUPERMEMORY_API_KEY --value your_api_key_here
```

**Option 3: Settings UI** (future enhancement)
- Add settings screen for API key configuration
- Store securely in device keychain
- Allow users to configure their own SuperMemory instance

## Architecture

### Before (MCP-based)
```
Desktop/CLI → MCP Server → SuperMemory API
Mobile → ❌ Not available
```

### After (Native SDK)
```
Desktop → SuperMemory SDK → SuperMemory API
Mobile → SuperMemory SDK → SuperMemory API
```

### Tool Call Flow
1. User speaks: "Remember that we're using PostgreSQL"
2. OpenAI Realtime API calls `remember_this` function
3. `zenTools.remember_this()` validates parameters
4. Calls `executeSupermemoryTool()` with tool definition
5. SuperMemory SDK makes API request
6. Response returned to OpenAI
7. Zen responds: "Got it, I'll remember that."

## API Compatibility

The implementation uses OpenAI's tool call format:
```typescript
{
  type: 'function',
  function: {
    name: 'searchMemories' | 'addMemory',
    arguments: JSON.stringify({...})
  }
}
```

SuperMemory tools used:
- `searchMemories`: Search user memories (limit: 5, includeFullDocs: false)
- `addMemory`: Store new memory (projectId: 'zenflo')

## Error Handling

### No API Key
```json
{
  "success": false,
  "message": "Memory features aren't configured yet."
}
```

### Search - No Results
```json
{
  "success": true,
  "message": "I don't have any memories about that yet."
}
```

### Search - Found Results
```json
{
  "success": true,
  "message": "I found 3 memories: [summary]."
}
```

### API Failure
```json
{
  "success": false,
  "message": "Memory search failed." | "Failed to save memory."
}
```

## Testing Checklist

- [ ] Set EXPO_PUBLIC_SUPERMEMORY_API_KEY environment variable
- [ ] Test search_memory with existing memories
- [ ] Test search_memory with no results
- [ ] Test remember_this to store new memory
- [ ] Verify stored memories appear in searches
- [ ] Test without API key (should show "not configured" message)
- [ ] Test on physical device (not just simulator)
- [ ] Verify TypeScript compilation passes
- [ ] Test with different projectId values

## Future Enhancements

### 1. Settings UI
- Add SuperMemory API key configuration screen
- Store in secure storage (expo-secure-store)
- Allow users to test connection
- Show usage statistics

### 2. Project Management
- Allow users to select project when storing memories
- List available projects in settings
- Filter searches by project

### 3. Enhanced Features
- Memory search with filters (date range, tags)
- Export/import memories
- Sync status indicator
- Memory management (edit, delete)

### 4. Performance
- Cache recent searches
- Batch memory operations
- Offline queue for pending stores

## Known Issues

None currently. TypeScript compilation passes.

## Related Files

- `mobile/sources/-zen/tools/zenTools.ts` - Tool implementations
- `mobile/sources/-zen/hooks/useZenVoice.ts` - System instructions
- `mobile/package.json` - Dependencies
- `.dev/ZEN_VOICE_TOOLS.md` - Voice assistant documentation

## References

- SuperMemory Tools: https://github.com/supermemoryai/supermemory/tree/main/packages/tools
- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
- Expo Environment Variables: https://docs.expo.dev/guides/environment-variables/
