# ZenFlo n8n Node - Quick Reference

**Package:** `n8n-nodes-zenflo@1.0.0`
**npm:** https://www.npmjs.com/package/n8n-nodes-zenflo
**n8n Instance:** https://n8n.zenflo.dev

---

## Quick Start (30 seconds)

1. **Configure Credentials**
   - Settings → Credentials → Add Credential → "ZenFlo API"
   - API URL: `https://api.zenflo.dev`
   - API Key: (from ZenFlo agent config)

2. **Create Agent in Mobile**
   - Agents tab → + button
   - Type: N8N Webhook
   - Copy the API Key

3. **Test Send Message**
   ```javascript
   // ZenFlo node config:
   {
     "resource": "message",
     "operation": "send",
     "sessionId": "session_xyz",
     "message": "Hello!"
   }
   ```

---

## Operations Cheat Sheet

| Operation | Use Case | Blocking? | Returns |
|-----------|----------|-----------|---------|
| **Send Message** | Notifications, updates | No | `{success, messageId}` |
| **Send and Wait** | Questions, confirmations | Yes | `{success, userReply}` |
| **Get Session** | Status check, metadata | No | `{sessionId, type, status}` |
| **End Session** | Cleanup, completion | No | `{success}` |

---

## Common Patterns

### Pattern: Simple Notification
```
Trigger → Send Message → Done
```

### Pattern: Ask Question
```
Trigger → Send and Wait → Process Reply → Send Confirmation
```

### Pattern: Multi-Step Form
```
Trigger → Q1 (wait) → Q2 (wait) → Q3 (wait) → Summary → End
```

### Pattern: Approval Workflow
```
Trigger → Send and Wait → IF (yes/no) → Branch A/B → End
```

---

## Configuration Examples

### Send Message (Non-blocking)
```javascript
{
  "resource": "message",
  "operation": "send",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Your order #{{ $json.orderId }} has shipped!"
}
```

### Send and Wait (Blocking)
```javascript
{
  "resource": "message",
  "operation": "sendAndWait",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Approve this expense? (yes/no)",
  "timeout": 120,        // 2 minutes
  "pollInterval": 2      // Check every 2 seconds
}
```

### Get Session
```javascript
{
  "resource": "session",
  "operation": "get",
  "sessionId": "={{ $json.sessionId }}"
}
```

### End Session
```javascript
{
  "resource": "session",
  "operation": "end",
  "sessionId": "={{ $json.sessionId }}"
}
```

---

## Accessing Previous Replies

In subsequent nodes, access replies from "Send and Wait" operations:

```javascript
// If "Send and Wait" node is named "Ask Name"
{{ $('Ask Name').item.json.userReply }}

// If "Send and Wait" node is named "Ask Email"
{{ $('Ask Email').item.json.userReply }}
```

Example:
```javascript
{
  "message": "Thanks {{ $('Ask Name').item.json.userReply }}! " +
             "We'll email you at {{ $('Ask Email').item.json.userReply }}"
}
```

---

## Error Handling

### Check for Success
```javascript
// Add IF node after ZenFlo operation:
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.success }}",
        "value2": true
      }
    ]
  }
}
```

### Handle Timeout
```javascript
// On failure path, send error message:
{
  "resource": "message",
  "operation": "send",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Sorry, request timed out. Please try again."
}
```

---

## Webhook Setup

When triggering from ZenFlo agent:

1. **In n8n:** Add Webhook node
   - Method: POST
   - Path: `/webhook/your-agent-name`
   - Response: Return Last Node

2. **In ZenFlo Mobile:** Create agent
   - Webhook URL: `https://primary-production-efa5.up.railway.app/webhook/your-agent-name`
   - Copy the webhook URL from n8n

3. **Webhook receives:**
   ```json
   {
     "sessionId": "session_xyz",
     "agentConfigId": "agent_abc",
     "triggeredAt": 1699999999999,
     "runtimeData": {
       // Your custom data
     }
   }
   ```

---

## Timeouts

| Timeout | Use Case |
|---------|----------|
| 30s | Quick confirmations (yes/no) |
| 60s | Short text inputs |
| 120s | Medium forms (2-3 questions) |
| 300s | Long forms or file uploads |
| 600s | Complex approvals |

**Best Practice:** Always set timeout based on expected user response time + buffer.

---

## Testing Workflow

### 1. Get Session ID
- Trigger agent in ZenFlo mobile
- Copy session ID from success alert

### 2. Manual Trigger Setup
```json
{
  "sessionId": "session_xyz789"
}
```

### 3. Execute & Monitor
- Click "Execute Workflow"
- Watch execution in n8n
- Check mobile app for messages
- Reply when prompted

---

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Node not appearing | Check Settings → Community Nodes |
| Unauthorized error | Verify API credentials |
| Session not found | Check session ID is valid |
| Timeout waiting | Increase timeout value |
| Reply not working | Check `requiresUserInput` flag |

---

## API Endpoints (Reference)

The node calls these backend endpoints:

```
POST /v1/agents/message          # Send Message
POST /v1/agents/question         # Send and Wait (part 1)
GET  /v1/agents/reply/:messageId # Send and Wait (part 2, polling)
GET  /v1/sessions/:sessionId     # Get Session
POST /v1/sessions/:sessionId/end # End Session
```

---

## Best Practices

✅ **DO:**
- Set reasonable timeouts
- Handle errors gracefully
- Close sessions when done
- Provide clear instructions
- Test with Manual Trigger first

❌ **DON'T:**
- Use timeout < 10 seconds
- Skip error handling
- Leave sessions open
- Use vague questions
- Deploy untested workflows

---

## Resources

- **Full Guide:** `WORKFLOW-GUIDE.md`
- **Validation:** `VALIDATION.md`
- **Examples:** `examples/test-workflow.json`
- **npm Package:** https://www.npmjs.com/package/n8n-nodes-zenflo
- **GitHub Issues:** https://github.com/combinedmemory/zenflo/issues

---

## Support

For help:
1. Check `WORKFLOW-GUIDE.md` for detailed examples
2. Review `VALIDATION.md` for testing procedures
3. Check Railway logs: `railway logs --tail 200`
4. Create GitHub issue with reproduction steps

**Last Updated:** 2025-11-13
