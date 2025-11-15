# ZenFlo n8n Node Validation Checklist

**Date:** 2025-11-13
**Package:** n8n-nodes-zenflo@1.0.0
**n8n Instance:** https://n8n.zenflo.dev

---

## Pre-Validation Checklist

Before testing the n8n node, ensure:

- [ ] Package is published to npm: https://www.npmjs.com/package/n8n-nodes-zenflo
- [ ] Railway n8n instance has redeployed
- [ ] ZenFlo mobile Build #78 is installed on your device
- [ ] You have a test agent created in ZenFlo mobile app

---

## Validation Steps

### 1. Verify Package Installation

**In n8n UI:**
1. Log into https://n8n.zenflo.dev
2. Go to **Settings** → **Community Nodes**
3. Look for **n8n-nodes-zenflo** in the installed packages list
4. Check version is `1.0.0`

**Expected Result:** ✅ Package appears in the list with correct version

**If Package Missing:**
```bash
# SSH to Railway container or check logs
railway logs --tail 200 | grep -i "zenflo\|community"

# Should see:
# "Community package installed: n8n-nodes-zenflo"
```

---

### 2. Configure API Credentials

**In n8n UI:**
1. Go to **Settings** → **Credentials** → **Add Credential**
2. Search for **"ZenFlo API"**
3. Fill in:
   - **API URL:** `https://api.zenflo.dev`
   - **API Key:** `test-api-key-from-agent-config`
4. Click **Test**
5. Click **Save**

**Expected Result:** ✅ Credential test passes (returns 200 OK)

**If Test Fails:**
- Check API URL is correct (no trailing slash)
- Verify API Key matches your agent config
- Check backend logs: `ssh nas@nas-1 "sudo docker logs zenflo-server --tail 50"`

---

### 3. Create Test Agent in Mobile App

**In ZenFlo Mobile:**
1. Open app and go to **Agents** tab
2. Tap **+** button
3. Create agent:
   - **Name:** n8n Test Workflow
   - **Type:** N8N Webhook
   - **Webhook URL:** `https://primary-production-efa5.up.railway.app/webhook/test`
   - **API Key:** (generate new or use existing)
   - **Active:** ON
4. Tap **Create**
5. **Note the Agent ID** for later use

**Expected Result:** ✅ Agent created successfully, appears in agents list

---

### 4. Verify Node Appears in n8n

**In n8n Workflow Editor:**
1. Create new workflow or open existing
2. Click **+** to add node
3. Search for **"ZenFlo"**
4. Click on **ZenFlo** node

**Expected Result:** ✅ ZenFlo node appears with:
- ZenFlo icon (metallic Z)
- 2 resource types: Message, Session
- 4 operations total

**Check All Operations Appear:**
- [ ] Message → Send
- [ ] Message → Send and Wait
- [ ] Session → Get
- [ ] Session → End

---

### 5. Test Operation: Send Message

**Setup:**
1. Add **Manual Trigger** node
2. Configure Manual Trigger to output:
   ```json
   {
     "sessionId": "YOUR_SESSION_ID_HERE"
   }
   ```
3. Add **ZenFlo** node
4. Configure:
   - **Credential:** Your ZenFlo API credential
   - **Resource:** Message
   - **Operation:** Send
   - **Session ID:** `={{ $json.sessionId }}`
   - **Message:** `Hello from n8n! This is a test message.`
5. Connect Manual Trigger → ZenFlo node
6. Trigger your test agent in mobile app to get a session ID
7. Update the Manual Trigger with the session ID
8. Click **Execute Workflow**

**Expected Result:** ✅
- Workflow executes successfully
- Message appears in ZenFlo mobile app session
- Node output shows:
  ```json
  {
    "success": true,
    "messageId": "msg_...",
    "sessionId": "session_..."
  }
  ```

**If Fails:**
- Check session ID is valid and active
- Verify message in mobile app → Messages tab
- Check backend logs for errors

---

### 6. Test Operation: Send and Wait

**Setup:**
1. Use same workflow from Test #5
2. Add another **ZenFlo** node
3. Configure:
   - **Credential:** Your ZenFlo API credential
   - **Resource:** Message
   - **Operation:** Send and Wait
   - **Session ID:** `={{ $json.sessionId }}`
   - **Message:** `What's your favorite color? (Please reply)`
   - **Timeout:** `60`
   - **Poll Interval:** `2`
4. Connect Send Message → Send and Wait node
5. Click **Execute Workflow**
6. **Immediately switch to mobile app**
7. Reply to the question in ZenFlo

**Expected Result:** ✅
- Workflow pauses waiting for reply
- Question appears in mobile with reply interface
- After you reply, workflow continues
- Node output shows:
  ```json
  {
    "success": true,
    "messageId": "msg_...",
    "userReply": "Your reply text",
    "repliedAt": 1699999999999
  }
  ```

**If Fails:**
- Check if reply interface appears in mobile
- Verify timeout is long enough (try 120 seconds)
- Check if polling is working (should see API calls in backend logs)
- Make sure you reply within timeout period

---

### 7. Test Operation: Get Session

**Setup:**
1. Add **ZenFlo** node
2. Configure:
   - **Credential:** Your ZenFlo API credential
   - **Resource:** Session
   - **Operation:** Get
   - **Session ID:** `={{ $json.sessionId }}`
3. Connect to previous node
4. Click **Execute Workflow**

**Expected Result:** ✅
- Workflow executes successfully
- Node output shows session details:
  ```json
  {
    "sessionId": "session_...",
    "type": "N8N_AGENT",
    "agentConfigId": "agent_...",
    "status": "active",
    "createdAt": 1699999999999
  }
  ```

**If Fails:**
- Verify session exists and is active
- Check backend endpoint: `GET /v1/sessions/:sessionId`

---

### 8. Test Operation: End Session

**Setup:**
1. Add **ZenFlo** node
2. Configure:
   - **Credential:** Your ZenFlo API credential
   - **Resource:** Session
   - **Operation:** End
   - **Session ID:** `={{ $json.sessionId }}`
3. Connect to previous node
4. Click **Execute Workflow**

**Expected Result:** ✅
- Workflow executes successfully
- Node output shows:
  ```json
  {
    "success": true,
    "sessionId": "session_..."
  }
  ```
- Session closes in mobile app

**If Fails:**
- Check if session was already closed
- Verify backend logs

---

### 9. Test Full Workflow (Import)

**Setup:**
1. In n8n, go to **Workflows**
2. Click **Import from File**
3. Select `integrations/n8n-nodes-zenflo/examples/test-workflow.json`
4. Update credentials for all ZenFlo nodes
5. Trigger agent in mobile to get session ID
6. Update Manual Trigger with session ID
7. Click **Execute Workflow**
8. Watch the workflow and respond in mobile when asked

**Expected Result:** ✅
- All nodes execute in sequence
- Messages appear in mobile app
- Reply interface works
- Workflow completes successfully

---

### 10. Test Error Handling

**Test Invalid Session ID:**
1. Create workflow with Send Message node
2. Use fake session ID: `session_invalid123`
3. Execute workflow

**Expected Result:** ✅
- Workflow fails gracefully
- Error message is clear: "Session not found" or similar
- No crashes or undefined errors

**Test Timeout:**
1. Create workflow with Send and Wait node
2. Set timeout to `10` seconds
3. Execute workflow
4. **Don't reply** in mobile

**Expected Result:** ✅
- Workflow waits for 10 seconds
- After timeout, returns error
- Error message: "Timeout waiting for reply" or similar

---

## Validation Summary

After completing all tests, fill in:

- [ ] Package installed correctly in n8n
- [ ] Credentials configured and tested
- [ ] Test agent created in mobile app
- [ ] Node appears in n8n editor with correct icon
- [ ] All 4 operations available
- [ ] Send Message operation works
- [ ] Send and Wait operation works
- [ ] Get Session operation works
- [ ] End Session operation works
- [ ] Full test workflow imported and executed
- [ ] Error handling works as expected

---

## Known Issues

### Issue: Polling Too Frequent

If polling interval is too short (< 1 second), backend might rate-limit requests.

**Solution:** Use poll interval of 2-3 seconds minimum.

### Issue: Reply Interface Not Showing

If `requiresUserInput` flag isn't set correctly, reply interface won't appear.

**Solution:** Verify backend is setting the flag when using `/v1/agents/question` endpoint.

### Issue: Session Closes Unexpectedly

Sessions might auto-close after inactivity timeout.

**Solution:** Check backend session timeout settings.

---

## Next Steps After Validation

Once all tests pass:

1. **Document any issues found** and create GitHub issues
2. **Update package if needed** and publish patch version
3. **Create production workflows** for real use cases
4. **Share workflows** with team or publish examples
5. **Monitor usage** in Railway logs and n8n execution logs

---

## Support

For issues found during validation:

1. Check Railway logs: `railway logs --tail 200`
2. Check backend logs: `ssh nas@nas-1 "sudo docker logs zenflo-server --tail 100"`
3. Create GitHub issue: https://github.com/combinedmemory/zenflo/issues
4. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Logs/error messages
