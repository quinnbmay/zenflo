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
        console.log('[DeepgramVoice] 🚀 Starting session...');

        if (!this.connectFn) {
            const error = new Error('Deepgram voice agent hooks not initialized');
            console.error('[DeepgramVoice] ❌ Fatal:', error.message);
            throw error;
        }

        this.sessionId = config.sessionId;
        storage.getState().setDeepgramStatus('connecting');

        try {
            // Get user preferences for voice and language
            const settings = storage.getState().settings;
            const voice = settings.deepgramVoice || 'aura-asteria-en';
            const language = settings.deepgramLanguage || 'en';

            console.log('[DeepgramVoice] 🔌 Connecting with user preferences:', { voice, language });

            // Connect with user preferences
            // IMPORTANT: Must include ALL required fields, not just overrides
            // The connect function expects a complete settings object
            await this.connectFn({
                audio: {
                    input: { encoding: 'linear16', sample_rate: 16000 },
                    output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
                },
                agent: {
                    language,
                    listen: {
                        provider: {
                            type: 'deepgram',
                            model: 'nova-3',
                            smart_format: true,
                            endpointing: 2000 // CRITICAL: 2 second silence threshold
                        },
                    },
                    think: {
                        provider: {
                            type: 'open_ai',
                            model: 'gpt-4o-mini',
                            temperature: 0.7,
                            api_key: process.env.EXPO_PUBLIC_OPENAI_API_KEY
                        },
                        prompt: config.initialContext || 'You are a helpful AI coding assistant. You assist with programming tasks through natural voice conversation. Be concise and helpful.',
                        first_message: "Hey! I'm ready to help you code. What are you working on?",
                        functions: [],
                    },
                    speak: {
                        provider: { type: 'deepgram', model: voice },
                    },
                },
            });

            console.log('[DeepgramVoice] ✅ Connected successfully');
            storage.getState().setDeepgramStatus('connected');
        } catch (error) {
            console.error('[DeepgramVoice] ❌ Connection failed:', error);
            console.error('[DeepgramVoice] Error details:', {
                type: typeof error,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
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
        defaultSettings: {
            audio: {
                input: { encoding: 'linear16', sample_rate: 16000 }, // Best practice for mobile
                output: { encoding: 'linear16', sample_rate: 24000, container: 'none' }, // High quality output
            },
            agent: {
                language: 'en', // Default language (will be overridden in connect() if user has preference)
                listen: {
                    provider: {
                        type: 'deepgram',
                        model: 'nova-3', // Latest, most accurate model
                        smart_format: true, // Automatic formatting
                        endpointing: 2000 // CRITICAL: Wait 2 seconds of silence before considering user done speaking (default is 10ms which causes mic to turn off immediately)
                    },
                },
                think: {
                    provider: {
                        type: 'open_ai',
                        model: 'gpt-4o-mini',
                        temperature: 0.7,
                        api_key: process.env.EXPO_PUBLIC_OPENAI_API_KEY
                    },
                    prompt: 'You are a helpful AI coding assistant. You assist with programming tasks through natural voice conversation. Be concise and helpful.',
                    functions: [], // Enable client-side tool calling (empty = auto-discover)
                },
                speak: {
                    provider: { type: 'deepgram', model: 'aura-asteria-en' }, // Default voice (will be overridden in connect() if user has preference)
                },
            },
        },
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
