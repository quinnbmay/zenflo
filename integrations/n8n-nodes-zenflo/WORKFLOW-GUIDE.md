# ZenFlo n8n Workflow Guide

**Created:** 2025-11-13
**Package:** `n8n-nodes-zenflo@1.0.0`
**n8n Instance:** https://n8n.zenflo.dev

---

## Setup Instructions

### 1. Configure ZenFlo API Credentials

Before creating workflows, you need to set up the API credentials in n8n:

1. Log into n8n: https://n8n.zenflo.dev
2. Go to **Settings** → **Credentials**
3. Click **Add Credential**
4. Search for **"ZenFlo API"**
5. Fill in the credentials:
   - **API URL:** `https://api.zenflo.dev`
   - **API Key:** (Get this from ZenFlo mobile app → Settings → Agents → Create Agent → Copy API Key)
6. Click **Test** to verify the connection
7. Click **Save**

### 2. Create an Agent in ZenFlo Mobile App

1. Open ZenFlo mobile app
2. Go to **Agents** tab (bottom navigation)
3. Tap **+** button (top right)
4. Fill in the form:
   - **Name:** n8n Test Workflow
   - **Type:** N8N Webhook
   - **Webhook URL:** (you'll get this from n8n after creating the workflow)
   - **API Key:** (this is what you'll use in n8n credentials)
   - **Active:** ON
5. Tap **Create**
6. Copy the **Agent ID** (you'll need this for the workflow)

---

## Available Operations

The ZenFlo node provides 4 operations:

### 1. Send Message (Non-blocking)

Sends a message to a ZenFlo session without waiting for a response.

**Parameters:**
- `sessionId` (string, required) - The session ID to send the message to
- `message` (string, required) - The message content to send

**Returns:**
```json
{
  "success": true,
  "messageId": "msg_abc123",
  "sessionId": "session_xyz789"
}
```

**Use Case:** Send notifications, updates, or information to the user without expecting a reply.

---

### 2. Send and Wait (Blocking with Polling)

Sends a message and waits for the user to reply. This operation polls the backend until:
- User replies (success)
- Timeout is reached (failure)

**Parameters:**
- `sessionId` (string, required) - The session ID to send the question to
- `message` (string, required) - The question to ask the user
- `timeout` (number, optional, default: 60) - Maximum seconds to wait for reply
- `pollInterval` (number, optional, default: 2) - Seconds between polling attempts

**Returns:**
```json
{
  "success": true,
  "messageId": "msg_abc123",
  "userReply": "User's response text",
  "repliedAt": 1699999999999
}
```

**Use Case:** Ask the user questions and wait for their input before continuing the workflow.

**Example Flow:**
1. n8n asks: "What's your email address?"
2. User sees message in ZenFlo with reply interface
3. User types: "user@example.com"
4. n8n receives the reply and continues workflow

---

### 3. Get Session

Retrieves details about a ZenFlo session.

**Parameters:**
- `sessionId` (string, required) - The session ID to retrieve

**Returns:**
```json
{
  "sessionId": "session_xyz789",
  "type": "N8N_AGENT",
  "agentConfigId": "agent_abc123",
  "status": "active",
  "createdAt": 1699999999999,
  "metadata": {
    "title": "n8n Test Workflow",
    "lastMessageAt": 1699999999999
  }
}
```

**Use Case:** Check session status, get metadata, verify session exists before sending messages.

---

### 4. End Session

Closes a ZenFlo session.

**Parameters:**
- `sessionId` (string, required) - The session ID to end

**Returns:**
```json
{
  "success": true,
  "sessionId": "session_xyz789"
}
```

**Use Case:** Clean up sessions when workflow is complete, implement session timeouts.

---

## Example Workflows

### Basic Notification Workflow

**Scenario:** Send a simple notification to the user.

**Workflow:**
1. **Manual Trigger** → (You click "Execute" to test)
2. **Send Message** → Sends "Hello from n8n!" to session

**Node Configuration:**
```javascript
// Send Message node
{
  "resource": "message",
  "operation": "send",
  "sessionId": "session_xyz789", // Your session ID
  "message": "Hello from n8n! This is a test notification."
}
```

---

### Interactive Q&A Workflow

**Scenario:** Ask the user questions and process their answers.

**Workflow:**
1. **Manual Trigger**
2. **Ask Question 1** (Send and Wait) → "What's your name?"
3. **Ask Question 2** (Send and Wait) → "What's your email?"
4. **Send Summary** → "Thanks {{ name }}, we'll contact you at {{ email }}"

**Node Configurations:**

```javascript
// Ask Question 1 node
{
  "resource": "message",
  "operation": "sendAndWait",
  "sessionId": "={{ $json.sessionId }}",
  "message": "What's your name?",
  "timeout": 60,
  "pollInterval": 2
}

// Ask Question 2 node
{
  "resource": "message",
  "operation": "sendAndWait",
  "sessionId": "={{ $json.sessionId }}",
  "message": "What's your email address?",
  "timeout": 60,
  "pollInterval": 2
}

// Send Summary node (access previous answers)
{
  "resource": "message",
  "operation": "send",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Thanks {{ $('Ask Question 1').item.json.userReply }}! We'll contact you at {{ $('Ask Question 2').item.json.userReply }}"
}
```

---

### Webhook-Triggered Workflow

**Scenario:** Trigger a workflow from external service, ask user for approval.

**Workflow:**
1. **Webhook Trigger** → Receives data from external service
2. **Send and Wait** → "Approve this request? (yes/no)"
3. **IF Node** → Check if reply is "yes"
   - **Yes:** Send success message + call external API
   - **No:** Send cancellation message

**Node Configurations:**

```javascript
// Webhook node - receives:
{
  "sessionId": "session_xyz789",
  "requestData": {
    "type": "expense",
    "amount": 500,
    "description": "Office supplies"
  }
}

// Send and Wait node
{
  "resource": "message",
  "operation": "sendAndWait",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Approve expense request for ${{ $json.requestData.amount }}? (yes/no)",
  "timeout": 300, // 5 minutes
  "pollInterval": 3
}

// IF node
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $json.userReply.toLowerCase() }}",
        "operation": "equals",
        "value2": "yes"
      }
    ]
  }
}
```

---

### Session Management Workflow

**Scenario:** Create session, send messages, clean up when done.

**Workflow:**
1. **Manual Trigger**
2. **Get Session** → Verify session exists
3. **Send Welcome** → "Welcome! Starting your workflow..."
4. **Do Work** → (Your workflow logic here)
5. **Send Complete** → "All done! Closing session..."
6. **End Session** → Clean up

**Node Configurations:**

```javascript
// Get Session node
{
  "resource": "session",
  "operation": "get",
  "sessionId": "={{ $json.sessionId }}"
}

// End Session node (at the end)
{
  "resource": "session",
  "operation": "end",
  "sessionId": "={{ $json.sessionId }}"
}
```

---

## Testing the Workflow

### Step 1: Import Test Workflow

1. In n8n, click **Workflows** → **Import from File**
2. Select `examples/test-workflow.json`
3. The workflow will open in the editor

### Step 2: Configure Session ID

The test workflow needs a session ID. You'll get this when you trigger the agent from ZenFlo mobile:

1. Open ZenFlo mobile app
2. Go to **Agents** tab
3. Tap your agent → **Trigger**
4. Enter runtime data (optional):
   ```json
   {
     "test": true
   }
   ```
5. Tap **Trigger Now**
6. Copy the **Session ID** from the success alert
7. In n8n, update the Manual Trigger node to output:
   ```json
   {
     "sessionId": "session_xyz789"
   }
   ```

### Step 3: Execute Workflow

1. Click **Execute Workflow** button
2. The workflow will:
   - Send a message
   - Ask you a question (shows reply interface in ZenFlo)
   - Wait for your reply
   - Send a follow-up message with your answer
   - Get session details

### Step 4: Monitor Execution

1. Watch the workflow execution in n8n
2. Check your ZenFlo mobile app for messages
3. Reply to the question when prompted
4. See the workflow continue after receiving your reply

---

## Common Patterns

### Pattern 1: Session ID from Webhook

Most workflows will receive the session ID from a webhook trigger when the agent is triggered from ZenFlo:

```javascript
// Webhook receives:
{
  "sessionId": "session_xyz789",
  "agentConfigId": "agent_abc123",
  "triggeredAt": 1699999999999,
  "runtimeData": {
    // Custom data from trigger
  }
}
```

### Pattern 2: Error Handling

Wrap operations in try-catch and send error messages to the user:

```javascript
// After Send and Wait node, add IF node:
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.success }}",
        "operation": "equals",
        "value2": true
      }
    ]
  }
}

// On failure path:
{
  "resource": "message",
  "operation": "send",
  "sessionId": "={{ $json.sessionId }}",
  "message": "Sorry, something went wrong. Please try again."
}
```

### Pattern 3: Multi-Step Forms

Chain multiple "Send and Wait" operations to build complex forms:

```javascript
// Step 1: Ask name
// Step 2: Ask email
// Step 3: Ask preference
// Step 4: Confirm all details
// Step 5: Process submission
```

### Pattern 4: Conditional Branching

Use user replies to determine workflow path:

```javascript
// Ask: "What would you like to do? (option1/option2/option3)"
// IF reply contains "option1" → Path A
// ELSE IF reply contains "option2" → Path B
// ELSE → Path C
```

---

## Troubleshooting

### Issue: "Unauthorized" Error

**Solution:** Check API credentials:
1. Verify API URL is `https://api.zenflo.dev`
2. Verify API Key matches the one from your agent config
3. Test credentials in Settings → Credentials

### Issue: "Session not found"

**Solution:** Verify session ID:
1. Make sure you're using the session ID from the agent trigger
2. Check if session is still active (hasn't been closed)
3. Try triggering the agent again to get a fresh session

### Issue: "Timeout waiting for reply"

**Solution:**
1. Increase the `timeout` parameter (default is 60 seconds)
2. Check if user has the ZenFlo app open
3. Verify push notifications are enabled
4. Check if message reached the user in ZenFlo app

### Issue: Node not appearing in n8n

**Solution:**
1. Check if package is installed: Settings → Community Nodes
2. If missing, check Railway deployment logs
3. Verify `N8N_COMMUNITY_PACKAGES` environment variable includes `n8n-nodes-zenflo`
4. Restart n8n service

---

## Best Practices

### 1. Always Handle Timeouts

Set reasonable timeout values based on your use case:
- Quick confirmations: 30-60 seconds
- Form inputs: 2-5 minutes
- Long-running tasks: 10-15 minutes (max)

### 2. Provide Clear Instructions

When asking questions, be specific:
- ❌ "Input data"
- ✅ "Please enter your email address (e.g., user@example.com)"

### 3. Validate User Input

Use IF nodes to validate replies:
- Check for expected format (email, phone, etc.)
- Handle invalid input with retry logic
- Provide helpful error messages

### 4. Close Sessions When Done

Always end sessions when workflow completes:
- Frees up resources
- Provides closure to the user
- Prevents stale sessions

### 5. Test with Manual Trigger

Before activating webhooks:
1. Test with Manual Trigger
2. Verify all operations work
3. Test error scenarios
4. Then switch to Webhook Trigger

---

## API Endpoints Reference

The ZenFlo node calls these backend endpoints:

### Send Message
```
POST /v1/agents/message
{
  "sessionId": "string",
  "content": "string"
}
```

### Send and Wait
```
POST /v1/agents/question
{
  "sessionId": "string",
  "content": "string"
}

GET /v1/agents/reply/:messageId
// Polls until reply is received
```

### Get Session
```
GET /v1/sessions/:sessionId
```

### End Session
```
POST /v1/sessions/:sessionId/end
```

---

## Next Steps

1. **Create your first workflow** using the test workflow as a template
2. **Configure webhook trigger** to receive events from ZenFlo agent
3. **Test interactive Q&A** to validate the reply interface works
4. **Build production workflows** for your use cases

For more examples, check the `examples/` folder in the package repository.

**Support:** For issues or questions, create an issue at https://github.com/combinedmemory/zenflo/issues
