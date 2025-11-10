import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { RTCPeerConnection, mediaDevices, MediaStream } from 'react-native-webrtc-web-shim';
import { Audio } from 'expo-av';
import InCallManager from 'react-native-incall-manager';
import { useRouter } from 'expo-router';
import { createZenTools, zenToolsSchema } from '../tools/zenTools';

/**
 * useZenVoice - React hook for WebRTC voice connection to OpenAI Realtime API
 *
 * This hook manages the full WebRTC lifecycle for Zen voice assistant:
 * - Ephemeral token fetching from ZenFlo backend
 * - WebRTC peer connection setup with OpenAI
 * - Bidirectional audio streaming (user microphone + AI speech)
 * - Data channel for function calls and transcripts
 * - Audio session configuration (expo-av + InCallManager)
 *
 * Architecture:
 * 1. Get ephemeral token from https://zenflo.combinedmemory.com/v1/voice/zen/session
 * 2. Create RTCPeerConnection with OpenAI STUN servers
 * 3. Set up data channel 'oai-events' for JSON messages
 * 4. Get user audio via getUserMedia
 * 5. Create SDP offer and exchange with OpenAI Realtime API
 * 6. Handle incoming audio via remote stream
 * 7. Process data channel messages (transcripts, function calls, state changes)
 *
 * @example
 * const { connect, disconnect, isConnected, transcript, isSpeaking } = useZenVoice();
 *
 * // Start voice session
 * await connect();
 *
 * // Cleanup
 * disconnect();
 */

interface UseZenVoiceReturn {
    isConnected: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    connect: () => Promise<void>;
    disconnect: () => void;
    error: string | null;
}

interface OpenAIRealtimeEvent {
    type: string;
    [key: string]: any;
}

interface EphemeralTokenResponse {
    token: string;
}

const OPENAI_REALTIME_API_URL = 'https://api.openai.com/v1/realtime';
const ZEN_SESSION_ENDPOINT = 'https://zenflo.combinedmemory.com/v1/voice/zen/session';

// System instructions for Zen personality
const ZEN_SYSTEM_INSTRUCTIONS = `You are Zen, a mindful task assistant that helps users stay focused without overwhelming them.

## Your Essence
You embody calm efficiency. Like a zen garden, you're serene yet purposeful. Your voice is warm, steady, and reassuring. You help users prioritize what matters without adding cognitive load. Think of yourself as a gentle productivity companion, not a bossy scheduler.

## Communication Style
- **Be concise**: Aim for 1-2 sentences. Users are busy and value brevity.
- **Be natural**: Speak conversationally, like a thoughtful friend. Avoid robotic confirmations.
- **Be proactive**: Take action without asking for clarification when intent is clear.
- **Be supportive**: Acknowledge effort, celebrate progress, but don't overdo praise.
- **Be calm**: Even when lists are long or priorities are unclear, maintain a peaceful tone.

## Available Capabilities

You can help users manage their Claude Code sessions, tasks, and memories:
- **Sessions**: List active/recent sessions, open specific sessions, create new sessions
- **Tasks**: View, create, and update tasks with priorities and statuses
- **Memory**: Search past memories and store new information (mobile + desktop)

## Function Call Guidelines

### Session Management

#### list_sessions
- **When to use**: User asks "what sessions", "show my sessions", "what am I working on", or similar
- **Filter options**:
  - active: Currently running sessions (default)
  - today: Sessions from today
  - recent: Last 10 sessions by update time
- **Reading results**:
  - For 0 sessions: "No sessions right now."
  - For 1-3 sessions: List them naturally: "You have 3 sessions: backend work, mobile debugging, and docs."
  - For 4+ sessions: Summarize: "You have 7 sessions. 3 are active."

#### open_session
- **When to use**: User says "open [session name]", "switch to [session]", or refers to a specific session
- **Task identification**: Match by title from list_sessions results
- **Confirmation**: Brief: "Opening backend work."

#### create_session
- **When to use**: User says "start new session", "create session", "new Claude session"
- **Parameters**:
  - prompt: Optional first message (e.g., "Help me debug the API")
  - path: Optional directory (defaults to home directory)
  - agentType: claude (default), codex, qwen, or gemini
- **Confirmation**: "Created session at [path]." or "Created session and asked Claude: [prompt]"

### Task Management

### list_tasks
- **When to use**: User asks "what do I have", "what's on my list", "show my tasks", or any variant
- **Don't ask**: Just call it. Users expect to see their tasks when they ask.
- **Reading results**:
  - For 0 tasks: "Your list is clear. What would you like to work on?"
  - For 1-3 tasks: Read them naturally with priorities: "You have deploy backend (high priority), write docs (medium), and review PR (low)"
  - For 4+ tasks: Summarize by priority: "You have 7 tasks: 2 urgent, 3 high priority, and 2 medium"
- **Filter by priority**: If user says "show urgent tasks" or "what's high priority", use the priority filter

### create_task
- **When to use**: User says "add", "create", "new task", "remind me to", or describes something to do
- **Default priority**: MEDIUM unless user specifies or task sounds urgent
- **Confirmation**: Just confirm the task name: "Added: deploy backend" (not "I've created a task called...")
- **Multiple tasks**: If user lists several things, create them all in sequence, then confirm: "Added 3 tasks: [names]"
- **Infer urgency**:
  - URGENT: "ASAP", "urgent", "critical", "now", "immediately"
  - HIGH: "important", "soon", "today", "priority"
  - MEDIUM: default for most tasks
  - LOW: "when I have time", "eventually", "nice to have"

### update_task
- **When to use**: User says "mark done", "complete", "finished", "change priority", or similar
- **Task identification**: Match by title (fuzzy matching is okay). If ambiguous, ask which one.
- **Status changes**:
  - IN_PROGRESS: "working on", "started", "doing"
  - DONE: "done", "finished", "complete", "completed"
  - CANCELLED: "cancel", "never mind", "skip"
- **Confirmation**: Brief acknowledgment: "Marked done ✓" or "Changed to high priority"

## Handling Ambiguity
- **Missing info**: Make reasonable assumptions when possible
  - No priority specified? Use MEDIUM
  - Vague task name? Use what they said, they can refine later
- **When to ask**: Only ask for clarification when truly ambiguous
  - Multiple tasks match: "Which one: backend deploy or frontend deploy?"
  - Unclear intent: "Did you want to mark that done or change its priority?"

## Error Handling
- **Function fails**: Be graceful and solution-oriented
  - "Couldn't find that task. Want to create it instead?"
  - "Something went wrong. Let's try that again."
- **Empty results**: Turn it into an opportunity
  - No tasks? "Your list is clear. What would you like to focus on?"
  - No urgent tasks? "Nothing urgent right now. You're in a good place."

## Examples of Good Responses

**User**: "What do I have?"
**Zen**: "You have 3 tasks: deploy backend (high), write docs (medium), and review PR (low)."

**User**: "Add task to deploy backend"
**Zen**: "Added: deploy backend."

**User**: "I need to call the client ASAP and finish the proposal today"
**Zen**: "Added 2 tasks: call client (urgent) and finish proposal (high priority)."

**User**: "Mark deploy done"
**Zen**: "Marked done ✓"

**User**: "What's urgent?"
**Zen**: "You have 2 urgent tasks: call client and review security fix."

**User**: "Change proposal to low priority"
**Zen**: "Changed to low priority."

### Memory Management

### search_memory
- **When to use**: User asks "what do I know about", "search my memory for", "do you remember", or similar
- **Availability**: Works on both mobile and desktop
- **Reading results**:
  - Found memories: "I found 3 memories: you prefer Prisma for databases, the API uses JWT auth, and you had timeout issues last month."
  - No memories: "I don't have any memories about that yet."
  - Not configured: "Memory features aren't configured yet." (if API key missing)
- **Be concise**: Summarize findings in 1-3 sentences max

### remember_this
- **When to use**: User says "remember that", "save this", "make a note", or describes something to remember
- **Availability**: Works on both mobile and desktop
- **What to store**: Technical details, preferences, patterns, decisions, learnings
- **Confirmation**: Keep it brief: "Got it, I'll remember that."
- **Not configured**: "Memory features aren't configured yet." (if API key missing)
- **Examples of what to remember**:
  - "Remember we're using PostgreSQL for the new feature"
  - "Note that the API endpoint is /v2/auth/login"
  - "Save that I prefer using Tailwind over CSS modules"

## Examples of Memory Interactions

**User**: "What do I know about the backend API?"
**Zen**: [calls search_memory] "I found 3 memories: you're using Express with TypeScript, PostgreSQL for the database, and JWT for authentication."

**User**: "Remember that we're using Prisma ORM now"
**Zen**: [calls remember_this] "Got it, I'll remember that."

**User**: "Search my memory for deployment issues"
**Zen**: [calls search_memory] "I found 2 memories: you had timeout issues with the production deployment last month, and you switched to using Docker Compose."

Remember: You're here to help users flow through their day with less friction, not to add more words to their mental load. Keep it zen.`;

export function useZenVoice(): UseZenVoiceReturn {
    // Get router for navigation
    const router = useRouter();

    // Create zenTools with router
    const zenTools = useRef(createZenTools(router)).current;

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Refs for WebRTC connection management
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    /**
     * Configure audio session for voice calls
     * Uses expo-av for audio mode and InCallManager for call routing
     */
    const configureAudioSession = useCallback(async () => {
        try {
            // Set audio mode for voice chat
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Configure call manager for proper audio routing
            if (Platform.OS !== 'web') {
                InCallManager.start({ media: 'audio', ringback: '' });
                InCallManager.setForceSpeakerphoneOn(false);
            }

            console.log('✅ Audio session configured');
        } catch (err) {
            console.error('❌ Failed to configure audio session:', err);
            throw new Error('Audio configuration failed');
        }
    }, []);

    /**
     * Cleanup audio session
     */
    const cleanupAudioSession = useCallback(async () => {
        try {
            if (Platform.OS !== 'web') {
                InCallManager.stop();
            }
            console.log('✅ Audio session cleaned up');
        } catch (err) {
            console.error('⚠️ Failed to cleanup audio session:', err);
        }
    }, []);

    /**
     * Fetch ephemeral token from ZenFlo backend
     */
    const getEphemeralToken = useCallback(async (): Promise<string> => {
        console.log('🔑 Fetching ephemeral token...');

        try {
            const response = await fetch(ZEN_SESSION_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get ephemeral token: ${response.status}`);
            }

            const data: EphemeralTokenResponse = await response.json();
            console.log('✅ Ephemeral token received');
            return data.token;
        } catch (err) {
            console.error('❌ Failed to fetch ephemeral token:', err);
            throw err;
        }
    }, []);

    /**
     * Handle incoming data channel messages from OpenAI
     */
    const handleDataChannelMessage = useCallback(async (event: MessageEvent) => {
        try {
            const message: OpenAIRealtimeEvent = JSON.parse(event.data);
            console.log('📨 Data channel message:', message.type);

            switch (message.type) {
                case 'session.created':
                    console.log('✅ Session created:', message.session?.id);
                    setIsConnected(true);
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    // User speech transcript
                    if (message.transcript) {
                        setTranscript(message.transcript);
                        console.log('🎤 User said:', message.transcript);
                    }
                    break;

                case 'response.audio_transcript.delta':
                    // AI speech transcript (streaming)
                    if (message.delta) {
                        setTranscript(prev => prev + message.delta);
                    }
                    break;

                case 'response.audio.delta':
                    // Audio chunks being played
                    setIsSpeaking(true);
                    break;

                case 'response.audio.done':
                    // Audio playback finished
                    setIsSpeaking(false);
                    break;

                case 'input_audio_buffer.speech_started':
                    setIsListening(true);
                    console.log('🎤 Speech detected');
                    break;

                case 'input_audio_buffer.speech_stopped':
                    setIsListening(false);
                    console.log('🎤 Speech ended');
                    break;

                case 'response.function_call_arguments.done':
                    // Function call from AI
                    await handleFunctionCall(message);
                    break;

                case 'error':
                    console.error('❌ OpenAI error:', message.error);
                    setError(message.error?.message || 'Unknown error');
                    break;

                default:
                    // Log other events for debugging
                    if (message.type !== 'response.audio.delta') {
                        console.log('📝 Event:', message.type);
                    }
                    break;
            }
        } catch (err) {
            console.error('❌ Failed to process data channel message:', err);
        }
    }, []);

    /**
     * Handle function calls from OpenAI
     */
    const handleFunctionCall = useCallback(async (message: OpenAIRealtimeEvent) => {
        const { call_id, name, arguments: argsString } = message;

        console.log(`🔧 Function call: ${name}`, argsString);

        try {
            // Parse arguments
            const args = JSON.parse(argsString || '{}');

            // Execute function from zenTools
            const toolFunction = zenTools[name as keyof typeof zenTools];
            if (!toolFunction) {
                throw new Error(`Unknown function: ${name}`);
            }

            const result = await toolFunction(args);
            console.log(`✅ Function result:`, result);

            // Send result back to OpenAI
            if (dataChannelRef.current?.readyState === 'open') {
                const responseEvent = {
                    type: 'conversation.item.create',
                    item: {
                        type: 'function_call_output',
                        call_id,
                        output: result
                    }
                };
                dataChannelRef.current.send(JSON.stringify(responseEvent));
                console.log('📤 Sent function result to OpenAI');
            }
        } catch (err) {
            console.error(`❌ Function call failed:`, err);

            // Send error response
            if (dataChannelRef.current?.readyState === 'open') {
                const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                        type: 'function_call_output',
                        call_id,
                        output: JSON.stringify({
                            success: false,
                            error: err instanceof Error ? err.message : 'Unknown error'
                        })
                    }
                };
                dataChannelRef.current.send(JSON.stringify(errorEvent));
            }
        }
    }, []);

    /**
     * Configure session with OpenAI Realtime API
     */
    const configureSession = useCallback(() => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            console.error('❌ Data channel not ready for session configuration');
            return;
        }

        const sessionConfig = {
            type: 'session.update',
            session: {
                model: 'gpt-realtime-2025-08-28',
                modalities: ['text', 'audio'],
                instructions: ZEN_SYSTEM_INSTRUCTIONS,
                voice: 'marin',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                },
                tools: zenToolsSchema,
                tool_choice: 'auto',
                temperature: 0.8,
                max_response_output_tokens: 4096
            }
        };

        console.log('⚙️ Configuring session...');
        dataChannelRef.current.send(JSON.stringify(sessionConfig));
        console.log('✅ Session configuration sent');
    }, []);

    /**
     * Main connect function - establishes WebRTC connection to OpenAI
     */
    const connect = useCallback(async () => {
        try {
            console.log('🚀 Starting Zen voice connection...');
            setError(null);

            // Step 1: Configure audio session
            await configureAudioSession();

            // Step 2: Get ephemeral token
            const token = await getEphemeralToken();

            // Step 3: Create peer connection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            peerConnectionRef.current = pc;

            console.log('📡 Peer connection created');

            // Step 4: Set up data channel for events
            const dc = pc.createDataChannel('oai-events');
            dataChannelRef.current = dc;

            dc.onopen = () => {
                console.log('✅ Data channel opened');
                configureSession();
            };

            dc.onmessage = handleDataChannelMessage;

            dc.onerror = (err: Event) => {
                console.error('❌ Data channel error:', err);
                setError('Data channel error');
            };

            dc.onclose = () => {
                console.log('📪 Data channel closed');
                setIsConnected(false);
            };

            // Step 5: Get user audio
            console.log('🎤 Requesting microphone access...');
            const stream = await mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 24000
                },
                video: false
            });
            localStreamRef.current = stream;
            console.log('✅ Microphone access granted');

            // Add audio tracks to peer connection
            stream.getTracks().forEach((track: MediaStreamTrack) => {
                pc.addTrack(track, stream);
                console.log('🎵 Added audio track:', track.kind);
            });

            // Step 6: Handle remote audio
            pc.ontrack = (event: RTCTrackEvent) => {
                console.log('🔊 Remote track received:', event.track.kind);

                if (event.track.kind === 'audio') {
                    const remoteStream = event.streams[0];

                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        // Web: Use HTMLAudioElement
                        if (!remoteAudioRef.current) {
                            const audioElement = document.createElement('audio');
                            audioElement.autoplay = true;
                            remoteAudioRef.current = audioElement;
                        }
                        if (remoteAudioRef.current) {
                            remoteAudioRef.current.srcObject = remoteStream;
                        }
                    } else {
                        // Native: Stream is automatically played through device speakers
                        console.log('🔊 Remote audio stream ready (native)');
                    }
                }
            };

            // Step 7: Create and send offer
            console.log('📝 Creating SDP offer...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('✅ Local description set');

            // Step 8: Send offer to OpenAI and get answer
            console.log('📤 Sending offer to OpenAI...');
            const response = await fetch(`${OPENAI_REALTIME_API_URL}?model=gpt-realtime-2025-08-28`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/sdp'
                },
                body: offer.sdp
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const answerSdp = await response.text();
            console.log('📥 Received answer from OpenAI');

            // Step 9: Set remote description
            await pc.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp
            });
            console.log('✅ Remote description set');

            console.log('🎉 Zen voice connection established!');

        } catch (err) {
            console.error('❌ Failed to connect:', err);
            setError(err instanceof Error ? err.message : 'Connection failed');
            disconnect();
        }
    }, [configureAudioSession, getEphemeralToken, handleDataChannelMessage, configureSession]);

    /**
     * Disconnect and cleanup
     */
    const disconnect = useCallback(() => {
        console.log('🔌 Disconnecting Zen voice...');

        // Close data channel
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }

        // Close peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Stop remote audio
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
            remoteAudioRef.current = null;
        }

        // Cleanup audio session
        cleanupAudioSession();

        // Reset state
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setTranscript('');
        setError(null);

        console.log('✅ Disconnected and cleaned up');
    }, [cleanupAudioSession]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isListening,
        isSpeaking,
        transcript,
        connect,
        disconnect,
        error
    };
}
