/**
 * Deepgram Voice Session - Alternative conversational AI using Deepgram Voice Agent
 *
 * Provides real-time voice conversations using Deepgram's Voice Agent API
 * Similar to Max (ElevenLabs) but uses Deepgram's infrastructure
 *
 * Key feature: autoStartMicrophone: true enables hands-free conversation
 * - Microphone starts automatically when session begins
 * - After agent finishes speaking, mic automatically re-enables
 * - User can reply immediately without pressing any buttons
 */

import React, { useEffect, useRef } from 'react';
import { configure, useDeepgramVoiceAgent } from 'react-native-deepgram';
import { storage } from '@/sync/storage';
import { registerDeepgramVoiceSession } from './DeepgramRealtimeSession';
import type { VoiceSession, VoiceSessionConfig } from './types';

/**
 * VoiceSession implementation for Deepgram Voice Agent
 * Wraps the useDeepgramVoiceAgent hook for use with our session management system
 */
export class DeepgramVoiceSessionImpl implements VoiceSession {
    private connectFn: ((settings?: any) => Promise<void>) | null = null;
    private disconnectFn: (() => void) | null = null;
    private injectUserMessageFn: ((content: string) => boolean) | null = null;
    public sessionId: string | null = null;

    setHooks(
        connect: (settings?: any) => Promise<void>,
        disconnect: () => void,
        injectUserMessage: (content: string) => boolean
    ) {
        this.connectFn = connect;
        this.disconnectFn = disconnect;
        this.injectUserMessageFn = injectUserMessage;
    }

    async startSession(config: VoiceSessionConfig): Promise<void> {
        if (!this.connectFn) {
            throw new Error('Deepgram voice agent hooks not initialized');
        }

        this.sessionId = config.sessionId;
        storage.getState().setDeepgramStatus('connecting');

        try {
            // Get user settings
            const settings = storage.getState().settings;
            const voice = settings.deepgramVoice || 'aura-asteria-en';
            const language = settings.deepgramLanguage || 'en';

            // Start Deepgram voice agent with best practices + user settings
            // autoStartMicrophone: true (default) enables hands-free conversation
            await this.connectFn({
                audio: {
                    input: { encoding: 'linear16', sample_rate: 16000 }, // Best practice for mobile
                    output: { encoding: 'linear16', sample_rate: 24000, container: 'none' }, // High quality output
                },
                agent: {
                    language,
                    listen: {
                        provider: {
                            type: 'deepgram',
                            model: 'nova-3', // Latest, most accurate model
                            smart_format: true, // Automatic formatting
                            endpointing: 2000 // Wait 2 seconds of silence before considering user done speaking (default is 10ms which is too aggressive)
                        },
                    },
                    think: {
                        provider: {
                            type: 'open_ai',
                            model: 'gpt-4o-mini', // Cost-effective and fast
                            temperature: 0.7 // Balanced creativity
                        },
                        prompt: config.initialContext || 'You are a helpful AI coding assistant. You assist with programming tasks through natural voice conversation. Be concise and helpful.',
                        functions: [], // Enable client-side tool calling (empty = auto-discover)
                        first_message: "Hey! I'm ready to help you code. What are you working on?", // Welcome message when session starts
                    },
                    speak: {
                        provider: { type: 'deepgram', model: voice },
                    },
                },
            });

            storage.getState().setDeepgramStatus('connected');
        } catch (error) {
            console.error('[DeepgramVoice] Failed to start session:', error);
            storage.getState().setDeepgramStatus('error');
            throw error;
        }
    }

    async endSession(): Promise<void> {
        if (this.disconnectFn) {
            this.disconnectFn();
        }
        storage.getState().setDeepgramStatus('disconnected');
        this.sessionId = null;
    }

    sendTextMessage(message: string): void {
        if (this.injectUserMessageFn) {
            this.injectUserMessageFn(message);
        }
    }

    sendContextualUpdate(update: string): void {
        // Deepgram Voice Agent doesn't have separate context updates like ElevenLabs
        // We can inject it as a user message with a prefix
        if (this.injectUserMessageFn) {
            this.injectUserMessageFn(`[Context] ${update}`);
        }
    }
}

// Static reference to the voice agent hook instance
let voiceAgentInstance: ReturnType<typeof useDeepgramVoiceAgent> | null = null;

/**
 * React component that initializes and registers Deepgram Voice Session
 * Should be mounted at app root (similar to RealtimeVoiceSession)
 *
 * Hands-free conversation flow:
 * 1. User presses Deepgram button → startDeepgramSession()
 * 2. connect() is called with autoStartMicrophone: true
 * 3. Microphone automatically starts capturing audio
 * 4. User speaks → Agent responds
 * 5. Agent finishes (onAgentAudioDone) → Mic automatically re-enables
 * 6. User can reply immediately without pressing anything
 */
export const DeepgramVoiceSession: React.FC = () => {
    const hasConfigured = useRef(false);
    const hasRegistered = useRef(false);

    // Configure Deepgram API key once
    useEffect(() => {
        if (!hasConfigured.current) {
            const apiKey = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;
            if (apiKey) {
                configure({ apiKey });
                hasConfigured.current = true;
                console.log('[DeepgramVoice] API key configured');
            } else {
                console.warn('[DeepgramVoice] No API key found in environment');
            }
        }
    }, []);

    const voiceAgent = useDeepgramVoiceAgent({
        autoStartMicrophone: true, // 🎤 Enables hands-free conversation
        onConversationText: (msg) => {
            console.log('[DeepgramVoice] 💬', msg.role + ':', msg.content);
        },
        onConnect: () => {
            console.log('[DeepgramVoice] ✅ Connected to Deepgram Voice Agent');
            storage.getState().setDeepgramStatus('connected');
        },
        onClose: () => {
            console.log('[DeepgramVoice] ❌ Disconnected from Deepgram Voice Agent');
            storage.getState().setDeepgramStatus('disconnected');
        },
        onError: (error) => {
            console.error('[DeepgramVoice] ❌ Error:', JSON.stringify(error, null, 2));
            storage.getState().setDeepgramStatus('error');
        },
        onAgentThinking: (msg) => {
            console.log('[DeepgramVoice] 🤔 Agent thinking:', msg.content);
        },
        onAgentStartedSpeaking: (msg) => {
            console.log('[DeepgramVoice] 🔊 Agent started speaking:', msg.content);
        },
        onAgentAudioDone: () => {
            console.log('[DeepgramVoice] ✅ Agent finished speaking - mic auto-restarting for hands-free reply');
        },
        onUserStartedSpeaking: () => {
            console.log('[DeepgramVoice] 🎤 User started speaking');
        },
    });

    // Register the Deepgram voice session once
    useEffect(() => {
        // Store the voice agent instance globally
        voiceAgentInstance = voiceAgent;

        // Register the voice session once
        if (!hasRegistered.current) {
            try {
                const session = new DeepgramVoiceSessionImpl();

                // Set up the hooks for the session
                session.setHooks(
                    voiceAgent.connect,
                    voiceAgent.disconnect,
                    voiceAgent.injectUserMessage
                );

                registerDeepgramVoiceSession(session);
                hasRegistered.current = true;
                console.log('[DeepgramVoice] Session registered successfully');
            } catch (error) {
                console.error('Failed to register Deepgram voice session:', error);
            }
        }

        return () => {
            // Clean up on unmount
            voiceAgentInstance = null;
        };
    }, [voiceAgent]);

    // This component doesn't render anything visible
    return null;
}
