# Zen Voice Assistant - Client-Side Tool Ideas
**Created:** 2025-11-10
**Status:** Planning Phase

## Overview
This document outlines potential client-side tools that could be given to the Zen voice assistant to expand its capabilities beyond task management.

## Current Tools (✅ Implemented)
1. **list_tasks** - Get current tasks with optional priority filter
2. **create_task** - Create new tasks with smart priority inference
3. **update_task** - Update task status (TODO/IN_PROGRESS/DONE/CANCELLED)

---

## Proposed Tools (By Category)

### 1️⃣ Session Management
**Why:** Users spend most time in ZenFlo working with Claude sessions

#### `list_sessions`
- **Description:** Get list of active or recent sessions
- **Parameters:**
  - `filter?: 'active' | 'today' | 'recent'`
- **Returns:** Array of sessions with titles and status
- **Use Cases:**
  - "What sessions are active?"
  - "Show me today's sessions"
  - "What was I working on recently?"

#### `open_session`
- **Description:** Navigate to a specific session
- **Parameters:**
  - `sessionId: string` (from list_sessions)
  - OR `title?: string` (fuzzy match)
- **Returns:** Confirmation
- **Use Cases:**
  - "Open my zenflo session"
  - "Go to the backend work session"
  - "Switch to the most recent session"

#### `create_session`
- **Description:** Create a new Claude session
- **Parameters:**
  - `title?: string`
  - `projectPath?: string`
- **Returns:** Session ID and confirmation
- **Use Cases:**
  - "Start a new session for the mobile app"
  - "Create a debugging session"

#### `delete_session`
- **Description:** Delete a session
- **Parameters:**
  - `sessionId: string`
- **Returns:** Confirmation
- **Use Cases:**
  - "Delete that test session"
  - "Clean up old sessions from yesterday"

---

### 2️⃣ Settings & Preferences
**Why:** Quick access to common settings without navigating UI

#### `update_settings`
- **Description:** Update user preferences
- **Parameters:**
  - `key: keyof Settings`
  - `value: any`
- **Settings Available:**
  - `theme`: 'light' | 'dark' | 'auto'
  - `haptics`: boolean
  - `statusBarStyle`: 'auto' | 'light' | 'dark'
  - `language`: 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja'
- **Use Cases:**
  - "Enable dark mode"
  - "Turn off haptics"
  - "Change language to Spanish"

#### `get_settings`
- **Description:** Get current settings
- **Parameters:** None or specific key
- **Returns:** Current settings object or value
- **Use Cases:**
  - "What's my current theme?"
  - "Show me my settings"

---

### 3️⃣ Notifications & Presence
**Why:** Stay connected and manage attention

#### `update_presence`
- **Description:** Change user's presence status
- **Parameters:**
  - `status: 'available' | 'busy' | 'away' | 'dnd'`
- **Use Cases:**
  - "Set me as busy"
  - "Mark me as available"
  - "Go do not disturb"

#### `check_notifications`
- **Description:** Check for unread notifications or inbox
- **Parameters:** None
- **Returns:** Count and preview
- **Use Cases:**
  - "Any notifications?"
  - "Check my inbox"

---

### 4️⃣ Social & Friends
**Why:** Quick access to social features

#### `list_friends`
- **Description:** Get list of friends
- **Parameters:**
  - `filter?: 'online' | 'all' | 'pending'`
- **Returns:** Array of friends with status
- **Use Cases:**
  - "Who's online?"
  - "Show my friend requests"
  - "List all friends"

#### `send_friend_request`
- **Description:** Send friend request by username
- **Parameters:**
  - `username: string`
- **Use Cases:**
  - "Add quinn as a friend"

---

### 5️⃣ Search & Navigation
**Why:** Fast access to any content

#### `search`
- **Description:** Search across sessions, tasks, artifacts
- **Parameters:**
  - `query: string`
  - `scope?: 'sessions' | 'tasks' | 'artifacts' | 'all'`
- **Returns:** Search results
- **Use Cases:**
  - "Find sessions about deployment"
  - "Search for API tasks"
  - "Look for that bug fix from yesterday"

#### `navigate_to`
- **Description:** Navigate to specific app routes
- **Parameters:**
  - `route: string` (e.g., '/zen', '/settings', '/feed')
- **Use Cases:**
  - "Go to settings"
  - "Open the feed"
  - "Take me to zen"

---

### 6️⃣ Quick Actions
**Why:** Common tasks done with single voice command

#### `share_session`
- **Description:** Share current or specified session
- **Parameters:**
  - `sessionId?: string` (defaults to current)
  - `shareType: 'link' | 'copy'`
- **Use Cases:**
  - "Share this session"
  - "Copy session link"

#### `take_screenshot`
- **Description:** Capture and save screenshot
- **Parameters:** None
- **Returns:** File path
- **Use Cases:**
  - "Take a screenshot"
  - "Capture this"

---

### 7️⃣ Feed & Activity
**Why:** Stay updated on what's happening

#### `check_feed`
- **Description:** Get recent feed items
- **Parameters:**
  - `limit?: number` (default 10)
- **Returns:** Array of feed items
- **Use Cases:**
  - "What's new in my feed?"
  - "Show recent activity"

#### `react_to_item`
- **Description:** React to a feed item or message
- **Parameters:**
  - `itemId: string`
  - `reaction: '👍' | '❤️' | '🎉' | etc.`
- **Use Cases:**
  - "React with heart to the last item"

---

### 8️⃣ Projects & Git
**Why:** Common developer workflows

#### `list_projects`
- **Description:** Get list of projects
- **Parameters:** None
- **Returns:** Array of projects with git status
- **Use Cases:**
  - "What projects do I have?"
  - "Show my projects"

#### `get_git_status`
- **Description:** Get git status for project or session
- **Parameters:**
  - `projectId?: string`
  - `sessionId?: string`
- **Returns:** Git status (branch, changes, etc.)
- **Use Cases:**
  - "What branch am I on?"
  - "Any uncommitted changes?"
  - "Show git status for this project"

---

### 9️⃣ Artifacts
**Why:** Quick access to saved code/content

#### `list_artifacts`
- **Description:** Get list of artifacts
- **Parameters:**
  - `filter?: 'recent' | 'draft' | 'all'`
- **Returns:** Array of artifacts
- **Use Cases:**
  - "Show my recent artifacts"
  - "List my drafts"

#### `open_artifact`
- **Description:** Open/view an artifact
- **Parameters:**
  - `artifactId: string`
  - OR `title?: string` (fuzzy match)
- **Use Cases:**
  - "Open the API documentation artifact"

---

### 🔟 Focus & Productivity
**Why:** Help users stay focused and productive

#### `start_focus_mode`
- **Description:** Enable focus mode (mutes notifications, etc.)
- **Parameters:**
  - `duration?: number` (minutes, default 25)
  - `taskId?: string` (link to task)
- **Use Cases:**
  - "Start focus mode for 45 minutes"
  - "Focus on the backend deployment task"

#### `end_focus_mode`
- **Description:** Disable focus mode
- **Use Cases:**
  - "End focus"
  - "Stop focusing"

#### `get_session_stats`
- **Description:** Get stats for current or specified session
- **Parameters:**
  - `sessionId?: string`
- **Returns:** Message count, token usage, duration, etc.
- **Use Cases:**
  - "How many messages in this session?"
  - "Show session stats"

---

## Implementation Priority

### High Priority (Phase 1)
1. **Session Management** - Core workflow
   - list_sessions
   - open_session
   - create_session

2. **Settings** - Common requests
   - update_settings (theme, haptics)
   - get_settings

3. **Navigation** - Essential UX
   - navigate_to

### Medium Priority (Phase 2)
1. **Search** - Discovery
   - search

2. **Projects & Git** - Developer features
   - list_projects
   - get_git_status

3. **Feed** - Social engagement
   - check_feed

### Low Priority (Phase 3)
1. **Focus Mode** - Productivity
2. **Artifacts** - Content management
3. **Social Features** - Advanced

---

## Technical Implementation Notes

### Function Call Schema Pattern
```typescript
{
  type: 'function',
  name: 'tool_name',
  description: 'Clear description for LLM',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'What this param does',
        enum: ['option1', 'option2']  // if applicable
      }
    },
    required: ['param1']
  }
}
```

### Tool Implementation Pattern
```typescript
export const zenTools = {
  tool_name: async ({ param1 }: { param1: string }) => {
    try {
      // 1. Get state if needed
      const state = storage.getState();

      // 2. Perform action
      const result = await someAction(param1);

      // 3. Return clear, concise result
      return {
        success: true,
        message: "Action completed",
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed: ${error.message}`
      };
    }
  }
};
```

### Key Considerations
1. **Brevity:** Zen should speak 1-2 sentences, so tool responses should be clear and concise
2. **Context:** Tools should provide enough context for Zen to form natural responses
3. **Error Handling:** Always return structured errors, never throw
4. **State Management:** Use storage.getState() for reads, storage.getState().applyX() for updates
5. **Async:** All tools should be async for consistency

---

## Next Steps
1. Review and prioritize tools with user
2. Implement Phase 1 tools
3. Test with Zen voice assistant
4. Gather feedback
5. Iterate and add Phase 2/3 tools

---

## Questions for User
1. Which tools would be most useful for your workflow?
2. Are there any tools you'd use multiple times per day?
3. Any specific integrations you'd like (GitHub, calendar, etc.)?
4. How much control should Zen have? (read-only vs mutations)
