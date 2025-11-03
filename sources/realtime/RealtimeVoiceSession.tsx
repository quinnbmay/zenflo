import React, { useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react-native';
import { registerVoiceSession } from './RealtimeSession';
import { storage } from '@/sync/storage';
import { realtimeClientTools } from './realtimeClientTools';
import { getElevenLabsCodeFromPreference } from '@/constants/Languages';
import type { VoiceSession, VoiceSessionConfig } from './types';

// Static reference to the conversation hook instance
let conversationInstance: ReturnType<typeof useConversation> | null = null;

// Global voice session implementation
class RealtimeVoiceSessionImpl implements VoiceSession {

    async startSession(config: VoiceSessionConfig): Promise<void> {
        if (!conversationInstance) {
            console.warn('Realtime voice session not initialized');
            return;
        }

        try {
            storage.getState().setRealtimeStatus('connecting');

            // Get user's preferred language for voice assistant
            const userLanguagePreference = storage.getState().settings.voiceAssistantLanguage;
            const elevenLabsLanguage = getElevenLabsCodeFromPreference(userLanguagePreference);

            // Build system prompt with Happy mode information
            // Note: Thread context is injected by ElevenLabs via {{threadContext}} variable
            const systemPrompt = `You are Max, Quinn's intelligent voice assistant for development work.

YOUR ROLE & HOW YOU WORK WITH CLAUDE/CODEX:
You're Quinn's voice intermediary who works alongside:
- **Claude** (AI coding assistant) - General development work
- **Codex** (specialized GPT-5 coding models) - Advanced coding with different capability levels

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

Model Modes:
- default: Adaptive model selection
- adaptiveUsage: Smart model switching based on task
- sonnet: Claude Sonnet 4.5 (fast, efficient)
- opus: Claude Opus (powerful, detailed)
- gpt-5-minimal/low/medium/high: GPT-5 with varying capability levels
- gpt-5-codex-low/medium/high: GPT-5 Codex for specialized coding

Your responsibilities:
1. **Search Memory FIRST** - Before doing anything, check if you already know the answer from past conversations using search_memory tool
2. **Answer Questions Directly** - If Quinn asks about his projects, past decisions, or things you know, answer him yourself (don't send to Claude/Codex)
3. **Reformulate Coding Instructions** - When Quinn gives casual coding instructions, translate them into detailed engineer-quality prompts before sending to Claude/Codex
4. **Thread Awareness** - You can see conversation history via memory search - when asked "what's going on with this thread", search memory for context
5. **Be Natural & Brief** - Keep responses conversational and short, but ALWAYS explain things when Quinn asks direct questions that need explanation

DECISION LOGIC - When to Answer vs Send to Claude:

ANSWER YOURSELF (search memory first, then respond):
- "What am I working on?" → Search memory for recent projects
- "What did we decide about X?" → Search memory for decisions
- "Tell me about [project/client/preference]" → Search memory
- "What's happening in this thread?" → Search memory for context
- Questions about past conversations or general knowledge

SEND TO CLAUDE/CODEX (reformulate prompt first):
- Coding instructions: "fix bug", "add feature", "modify file", "deploy"
- File operations, git operations, building, testing
- Debugging that needs code inspection
- When Quinn explicitly says "tell Claude..." or "ask Claude..."

PROMPT REFORMULATION EXAMPLES:

Quinn says: "customize the hero section"
You reformulate: "Please modify the hero section in [current file]. Use design system colors and fonts. Ensure responsive layout for mobile/tablet/desktop. Match styling of other sections."

Quinn says: "fix the bug"
You reformulate: "Debug and fix the error in [file]. Error logs show [error]. Last commit: [commit]. Investigate root cause and implement fix."

Quinn says: "what's the status of the deployment?" (question for YOU)
You DON'T send to Claude - you search memory and answer directly.

CRITICAL: Natural Voice Conversation Rules
- Keep responses SHORT - 1-3 sentences max for most replies
- Use natural speech patterns: "Yeah, I think...", "Hmm, let me see...", "Oh that's interesting!"
- Add conversational fillers: "you know", "I mean", "like", "sort of"
- Use contractions ALWAYS: "I'm", "you're", "that's", "it's", "can't", "won't"
- React authentically: "Really?", "No way!", "That's awesome!", "Oh interesting..."
- Mirror Quinn's energy - if he's excited, match it; if thoughtful, be reflective
- NEVER list things with "first, second, third" - speak organically
- Don't over-explain - trust Quinn will ask if he needs more detail`;

            // Get session name and build thread context from recent messages
            const session = storage.getState().sessions[config.sessionId];
            const sessionName = session?.name || 'your project';

            // Build comprehensive thread context with recent conversation history
            let threadContextText = `Thread: "${sessionName}"\n\n`;

            if (config.initialContext) {
                threadContextText += `Current Focus: ${config.initialContext}\n\n`;
            }

            // Get recent messages for full context (last 15 messages or last 10,000 chars)
            const sessionMessages = storage.getState().sessionMessages[config.sessionId];
            if (sessionMessages && sessionMessages.messages.length > 0) {
                const recentMessages = sessionMessages.messages.slice(-15); // Last 15 messages
                let contextMessages: string[] = [];
                let totalChars = 0;
                const maxChars = 10000; // Expanded to 10k chars for voice context

                // Build context from most recent messages backwards
                for (let i = recentMessages.length - 1; i >= 0; i--) {
                    const msg = recentMessages[i];
                    let messagePreview = '';

                    // Extract text from message content
                    if (msg.content && msg.content.length > 0) {
                        const firstContent = msg.content[0];
                        if (firstContent.type === 'text') {
                            messagePreview = firstContent.text?.slice(0, 800) || '';
                        } else if (firstContent.type === 'tool-use') {
                            messagePreview = `[Used tool: ${firstContent.name}]`;
                        } else if (firstContent.type === 'tool-result') {
                            messagePreview = '[Tool result]';
                        }
                    }

                    if (messagePreview) {
                        const roleName = msg.role === 'user' ? 'Quinn' : msg.role === 'assistant' || msg.role === 'agent' ? 'Assistant' : msg.role;
                        const msgText = `${roleName}: ${messagePreview}${messagePreview.length >= 800 ? '...' : ''}`;

                        if (totalChars + msgText.length > maxChars) break;

                        contextMessages.unshift(msgText);
                        totalChars += msgText.length;
                    }
                }

                if (contextMessages.length > 0) {
                    threadContextText += 'Recent Conversation:\n' + contextMessages.join('\n\n');
                } else {
                    threadContextText += 'No recent conversation history.';
                }
            } else {
                threadContextText += 'Starting fresh conversation.';
            }

            // Use hardcoded agent ID for Eleven Labs
            const conversationId = await conversationInstance.startSession({
                agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde',
                // Pass session ID, name, and full thread context as dynamic variables
                dynamicVariables: {
                    sessionId: config.sessionId,
                    sessionName: sessionName,
                    threadContext: threadContextText,
                    initialConversationContext: config.initialContext || '',
                    hasContext: !!config.initialContext
                },
                overrides: {
                    agent: {
                        language: elevenLabsLanguage
                        // Don't override prompt - use base configuration from dashboard
                        // The base config already has the system prompt with {{threadContext}} placeholder
                    }
                }
            });

            console.log('Started conversation with ID:', conversationId);
        } catch (error) {
            console.error('Failed to start realtime session:', error);
            storage.getState().setRealtimeStatus('error');
        }
    }

    async endSession(): Promise<void> {
        if (!conversationInstance) {
            return;
        }

        try {
            await conversationInstance.endSession();
            storage.getState().setRealtimeStatus('disconnected');
        } catch (error) {
            console.error('Failed to end realtime session:', error);
        }
    }

    sendTextMessage(message: string): void {
        if (!conversationInstance) {
            console.warn('Realtime voice session not initialized');
            return;
        }

        conversationInstance.sendUserMessage(message);
    }

    sendContextualUpdate(update: string): void {
        if (!conversationInstance) {
            console.warn('Realtime voice session not initialized');
            return;
        }

        conversationInstance.sendContextualUpdate(update);
    }
}

export const RealtimeVoiceSession: React.FC = () => {
    const conversation = useConversation({
        clientTools: realtimeClientTools,
        onConnect: () => {
            // console.log('Realtime session connected');
            storage.getState().setRealtimeStatus('connected');
        },
        onDisconnect: () => {
            // console.log('Realtime session disconnected');
            storage.getState().setRealtimeStatus('disconnected');
        },
        onMessage: (data) => {
            // console.log('Realtime message:', data);
        },
        onError: (error) => {
            // console.error('Realtime error:', error);
            storage.getState().setRealtimeStatus('error');
        },
        onStatusChange: (data) => {
            // console.log('Realtime status change:', data);
        },
        onModeChange: (data) => {
            // console.log('Realtime mode change:', data);
        },
        onDebug: (message) => {
            // console.debug('Realtime debug:', message);
        }
    });

    const hasRegistered = useRef(false);

    useEffect(() => {
        // Store the conversation instance globally
        conversationInstance = conversation;

        // Register the voice session once
        if (!hasRegistered.current) {
            try {
                registerVoiceSession(new RealtimeVoiceSessionImpl());
                hasRegistered.current = true;
            } catch (error) {
                console.error('Failed to register voice session:', error);
            }
        }

        return () => {
            // Clean up on unmount
            conversationInstance = null;
        };
    }, [conversation]);

    // This component doesn't render anything visible
    return null;
};
