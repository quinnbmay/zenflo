# AI Task Breakdown Feature - Demo

## Overview

The AI task breakdown feature automatically analyzes complex tasks and suggests subtasks to break them down into manageable steps.

## Features Implemented

### 1. Data Model ✅
- Added `Subtask` interface with id, title, done, timestamps
- Extended `TodoItem` with optional `subtasks` array
- Added `parentTaskId` for linking subtasks to parent tasks

### 2. MCP Tools ✅

#### `analyze_task_complexity`
Analyzes a task to determine if it's complex enough to benefit from breakdown.

**Example:**
```json
{
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db"
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "isComplex": true,
  "reason": "Task appears complex based on: 6 indicators",
  "estimatedSubtasks": 5
}
```

#### `suggest_subtasks`
Uses AI patterns to suggest subtasks for breaking down a complex task.

**Example:**
```json
{
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "max_subtasks": 5
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "subtasks": [
    {
      "title": "Design the data model and interfaces",
      "estimate": "30-60 min"
    },
    {
      "title": "Implement core functionality",
      "estimate": "1-2 hours"
    },
    {
      "title": "Add error handling and validation",
      "estimate": "30-45 min"
    },
    {
      "title": "Write tests",
      "estimate": "45-60 min"
    },
    {
      "title": "Update documentation",
      "estimate": "15-30 min"
    }
  ],
  "reasoning": "Analyzed task \"Implement AI task breakdown feature for Zen Mode\" and suggested 5 subtasks based on common implementation patterns."
}
```

#### `add_subtask`
Adds a subtask to a parent task.

**Example:**
```json
{
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "subtask_title": "Design the data model and interfaces"
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "subtask_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Subtask added: Design the data model and interfaces"
}
```

#### `toggle_subtask`
Toggles a subtask's completion status.

**Example:**
```json
{
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "subtask_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "c98c9a65-d1b5-443d-a5e2-b897846eb5db",
  "subtask_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Subtask toggled successfully"
}
```

## Pattern-Based AI Suggestions

The system uses intelligent pattern matching to provide context-aware suggestions:

### For "Implement" or "Add" tasks:
1. Design the data model and interfaces (30-60 min)
2. Implement core functionality (1-2 hours)
3. Add error handling and validation (30-45 min)
4. Write tests (45-60 min)
5. Update documentation (15-30 min)

### For "Fix" or "Bug" tasks:
1. Reproduce and isolate the issue (30-45 min)
2. Identify root cause (30-60 min)
3. Implement fix (30-60 min)
4. Test the fix (20-30 min)
5. Deploy and verify (15-20 min)

### For "Refactor" tasks:
1. Analyze current code structure (30-45 min)
2. Plan refactoring approach (20-30 min)
3. Refactor in small increments (1-2 hours)
4. Ensure tests still pass (15-30 min)
5. Review and optimize (30-45 min)

### Generic breakdown:
1. Research and plan approach (20-30 min)
2. Implement main functionality (1-2 hours)
3. Test and validate (30-45 min)
4. Document changes (15-20 min)

## Complexity Analysis

Tasks are analyzed based on these indicators:
- Title contains keywords: implement, build, create, design, refactor
- Title has more than 5 words
- Has description longer than 50 characters
- Description longer than 200 characters

A task is considered "complex" if it has 3 or more indicators.

## Next Steps

### Mobile UI (Next Phase)
1. **Task Detail View Enhancement**
   - Add "Break down with AI" button
   - Show subtasks list with checkboxes
   - Display progress bar (e.g., "3/5 subtasks completed")
   - Swipe actions on subtasks

2. **AI Suggestion Modal**
   - Show suggested subtasks with estimates
   - Allow editing subtask titles
   - Accept/reject individual suggestions
   - "Add all" button

3. **Visual Design**
   - Indented subtask list
   - Completion percentage badge
   - Time estimates display
   - Animated progress indicator

### Real AI Integration (Future)
Replace pattern-based suggestions with actual Claude API calls:
- Analyze task context and description
- Generate contextual subtasks
- Provide better time estimates
- Learn from user's task completion patterns

## Usage Example

```typescript
// 1. Analyze task complexity
const analysis = await mcp__zen_mode__analyze_task_complexity({
  task_id: "abc123"
});

if (analysis.isComplex) {
  // 2. Get AI suggestions
  const suggestions = await mcp__zen_mode__suggest_subtasks({
    task_id: "abc123",
    max_subtasks: 5
  });

  // 3. Add subtasks
  for (const subtask of suggestions.subtasks) {
    await mcp__zen_mode__add_subtask({
      task_id: "abc123",
      subtask_title: subtask.title
    });
  }
}
```

## Status

✅ **Implemented:**
- Data model with subtasks
- MCP tools for AI analysis and suggestions
- Pattern-based subtask generation
- Subtask CRUD operations
- Encrypted storage in Happy backend

🚧 **In Progress:**
- Mobile UI integration
- Visual design for subtasks

📋 **Planned:**
- Real Claude API integration
- Learning from user patterns
- Time tracking per subtask
- Dependency tracking between subtasks
