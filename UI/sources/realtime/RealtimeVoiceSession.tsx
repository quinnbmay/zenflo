import React, { useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react-native';
import { registerVoiceSession } from './RealtimeSession';
import { storage } from '@/sync/storage';
import { buildMessagePreview } from '@/sync/messagePreview';
import { realtimeClientTools } from './realtimeClientTools';
import { getElevenLabsCodeFromPreference } from '@/constants/Languages';
import { getSessionName } from '@/utils/sessionUtils';
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
            // Stop TTS before starting Max to avoid conflicts
            const { voiceModeManager } = await import('../voice/VoiceModeManager');
            const isTTSSpeaking = await voiceModeManager.isSpeaking();
            if (isTTSSpeaking) {
                console.log('[RealtimeVoice] 🛑 Stopping TTS before starting Max');
                await voiceModeManager.stop();
            }

            storage.getState().setRealtimeStatus('connecting');

            // Get user's preferred language for voice assistant
            const userLanguagePreference = storage.getState().settings.voiceAssistantLanguage;
            const elevenLabsLanguage = getElevenLabsCodeFromPreference(userLanguagePreference);

            /**
             * NOTE: Max's system prompt is configured on ElevenLabs servers, not in this code.
             *
             * To update Max's prompt:
             * 1. Edit: mobile/scripts/update-elevenlabs-agent.ts
             * 2. Run: npx tsx scripts/update-elevenlabs-agent.ts --update
             *
             * The prompt receives dynamic context via {{threadContext}} variable at runtime.
             * See mobile/docs/max-code/README.md for configuration details.
             */

            // Get session name and build thread context from recent messages
            const session = storage.getState().sessions[config.sessionId];
            const sessionName = session ? getSessionName(session) : 'your project';

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
                    const preview = buildMessagePreview(recentMessages[i]);
                    if (!preview || !preview.text) {
                        continue;
                    }

                    const roleName =
                        preview.speaker === 'user'
                            ? 'Quinn'
                            : preview.speaker === 'assistant'
                                ? 'Assistant'
                                : 'System';

                    const truncatedText = preview.text.length > 800
                        ? `${preview.text.slice(0, 800)}...`
                        : preview.text;

                    if (!truncatedText) {
                        continue;
                    }

                    const msgText = `${roleName}: ${truncatedText}`;

                    if (totalChars + msgText.length > maxChars) break;

                    contextMessages.unshift(msgText);
                    totalChars += msgText.length;
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
