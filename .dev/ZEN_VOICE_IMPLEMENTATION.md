# Zen Voice Assistant Implementation Guide

## Template Analysis Complete ✅

### Key Learnings from expo-webrtc-openai-realtime

**1. WebRTC Setup Pattern:**
```typescript
// Get ephemeral token from backend
const { data } = await supabase.functions.invoke('token');
const EPHEMERAL_KEY = data.client_secret.value;

// Create peer connection
const pc = new RTCPeerConnection();

// Add local audio track
const ms = await mediaDevices.getUserMedia({ audio: true });
pc.addTrack(ms.getTracks()[0]);

// Create data channel for events
const dc = pc.createDataChannel('oai-events');

// Create SDP offer
const offer = await pc.createOffer({});
await pc.setLocalDescription(offer);

// Send to OpenAI
const sdpResponse = await fetch(
  `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`,
  {
    method: 'POST',
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      'Content-Type': 'application/sdp'
    }
  }
);

// Set remote description
const answer = { type: 'answer', sdp: await sdpResponse.text() };
await pc.setRemoteDescription(answer);
```

**2. Tool Calling Pattern:**
```typescript
// Define tools schema
const clientToolsSchema = [
  {
    type: "function",
    name: "getBatteryLevel",
    description: "Gets the device battery level",
  }
];

// Define tool implementations
const clientTools = {
  getBatteryLevel: async () => {
    const batteryLevel = await Battery.getBatteryLevelAsync();
    return { success: true, batteryLevel };
  }
};

// Configure session with tools
dataChannel.send(JSON.stringify({
  type: 'session.update',
  session: {
    modalities: ['text', 'audio'],
    instructions: 'You are a helpful assistant...',
    tools: clientToolsSchema
  }
}));

// Handle function calls
dataChannel.addEventListener('message', async (e) => {
  const data = JSON.parse(e.data);

  if (data.type === 'response.function_call_arguments.done') {
    const functionName = data.name;
    const args = JSON.parse(data.arguments);
    const result = await clientTools[functionName](args);

    // Send result back
    dataChannel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: data.call_id,
        output: JSON.stringify(result)
      }
    }));

    // Force response
    dataChannel.send(JSON.stringify({ type: 'response.create' }));
  }
});
```

**3. Audio Handling:**
```typescript
// Enable audio in silent mode (iOS)
await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

// Use InCallManager for speaker control
InCallManager.start({ media: 'audio' });
InCallManager.setForceSpeakerphoneOn(true);

// Clean up
InCallManager.stop();
```

**4. Transcript Handling:**
```typescript
if (data.type === 'response.audio_transcript.done') {
  setTranscript(data.transcript);
}
```

## Our Implementation Plan

### Phase 1: Backend Endpoint ✅ NEXT

Create `/v1/voice/zen/session` on ZenFlo NAS to provide ephemeral tokens.

**File:** `sources/app/api/routes/voiceRoutes.ts`

```typescript
export async function voiceRoutes(app: FastifyInstance) {
  app.post('/v1/voice/zen/session', async (request, reply) => {
    const { userId } = request.auth;

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-realtime-2025-08-28',
        voice: 'marin'
      })
    });

    return response.json();
  });
}
```

### Phase 2: Mobile Components

**Files to Create:**
1. `mobile/sources/-zen/hooks/useZenVoice.ts` - WebRTC hook
2. `mobile/sources/-zen/components/ZenVoiceButton.tsx` - Header button
3. `mobile/sources/-zen/tools/zenTools.ts` - Tool definitions
4. `mobile/sources/app/(app)/zen/voice.tsx` - Voice chat screen

**Tool Definitions:**
```typescript
export const zenToolsSchema = [
  {
    type: 'function',
    name: 'list_tasks',
    description: 'Get current tasks, optionally filtered',
    parameters: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
        }
      }
    }
  },
  {
    type: 'function',
    name: 'create_task',
    description: 'Create a new task',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }
      },
      required: ['title']
    }
  }
];

export const zenTools = {
  list_tasks: async ({ priority }: { priority?: string }) => {
    const todoState = storage.getState().todoState;
    let tasks = todoState.undoneOrder
      .map(id => todoState.todos[id])
      .filter(Boolean);

    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }

    return {
      success: true,
      tasks: tasks.map(t => ({
        title: t.title,
        priority: t.priority || 'MEDIUM'
      }))
    };
  },

  create_task: async ({ title, priority }: any) => {
    const auth = getCurrentAuth();
    if (!auth?.credentials) return { success: false };

    const taskId = await addTodo(auth.credentials, title, priority);
    return { success: true, task_id: taskId };
  }
};
```

### Phase 3: Voice Personality

**System Instructions for Marin voice:**
```
You are Zen, a calm and focused AI assistant specializing in task management.

Your personality:
- Speak in a calm, encouraging, zen-like tone
- Be concise but helpful
- When reading tasks, mention their priority level
- Always confirm actions before executing them
- Use natural language, avoid robotic responses

Your capabilities:
- List tasks (with optional priority filter)
- Create new tasks with priority levels
- Update task status and priority
- Search past work and context

Guidelines:
- When user asks "what's on my plate", call list_tasks
- When user says "create a task", call create_task
- Always ask for priority if not specified
- Summarize task lists naturally (e.g., "You have 3 tasks: ...")
```

## Dependencies to Add

```json
{
  "dependencies": {
    "react-native-webrtc-web-shim": "latest",
    "expo-av": "latest",
    "react-native-incall-manager": "latest"
  }
}
```

## Next Steps

1. ✅ Study templates (DONE)
2. 🔄 SSH to NAS and create backend endpoint
3. Install dependencies in mobile app
4. Create useZenVoice hook
5. Build ZenVoiceButton component
6. Create voice chat screen
7. Test on iOS device

## Notes

- Template uses old model name (`gpt-4o-realtime-preview-2024-12-17`)
- We'll use production model: `gpt-realtime-2025-08-28`
- We'll use `marin` voice instead of `verse`
- Backend token generation is critical for security
