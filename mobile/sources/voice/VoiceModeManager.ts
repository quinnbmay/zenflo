/**
 * VoiceModeManager - TTS using ElevenLabs
 *
 * Handles text-to-speech playback for Claude responses using ElevenLabs API.
 * Provides high-quality voice synthesis with professional voices.
 */

import { Audio } from 'expo-av';

interface TTSOptions {
    speed: number;
    skipCodeBlocks: boolean;
    maxLength: number;
    voiceId?: string;
}

class VoiceModeManager {
    private isCurrentlySpeaking = false;
    private messageQueue: Array<{ text: string; messageId: string; options: TTSOptions }> = [];
    private currentMessageId: string | null = null;
    private queuedMessageIds: Set<string> = new Set(); // Track queued messages to prevent duplicates
    private sound: Audio.Sound | null = null;
    private apiKey: string | null = null;

    constructor() {
        // Initialize audio mode
        this.initializeAudio();
    }

    private async initializeAudio() {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true, // Important: play even in silent mode
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });
        } catch (error) {
            console.error('[VoiceMode] Failed to initialize audio:', error);
        }
    }

    /**
     * Set ElevenLabs API key
     */
    setApiKey(key: string) {
        console.log('[VoiceMode] Setting API key:', key ? `${key.substring(0, 10)}...` : 'EMPTY');
        this.apiKey = key;
        console.log('[VoiceMode] API key stored successfully');
    }

    /**
     * Speak a message using ElevenLabs TTS
     */
    async speak(text: string, messageId: string, options: TTSOptions): Promise<void> {
        console.log('[VoiceMode] ====== SPEAK CALLED ======');
        console.log('[VoiceMode] MessageId:', messageId);
        console.log('[VoiceMode] Currently speaking:', this.isCurrentlySpeaking);
        console.log('[VoiceMode] Current messageId:', this.currentMessageId);
        console.log('[VoiceMode] Queue length:', this.messageQueue.length);

        // Check API key
        if (!this.apiKey) {
            console.error('[VoiceMode] ❌ API key not set - ABORTING');
            return;
        }

        // Check if this message is already queued or currently playing
        if (this.currentMessageId === messageId || this.queuedMessageIds.has(messageId)) {
            console.log('[VoiceMode] ⏭️  Message already queued/playing, skipping:', messageId);
            return;
        }

        // Prepare text for TTS
        const preparedText = this.prepareTextForTTS(text, options);
        console.log('[VoiceMode] Prepared text length:', preparedText.length);

        // Skip if text is too long or empty
        if (!preparedText || preparedText.length > options.maxLength) {
            console.log('[VoiceMode] ❌ Skipping message (empty or too long):', preparedText.length, 'max:', options.maxLength);
            return;
        }

        // If currently speaking, add to queue instead of interrupting
        if (this.isCurrentlySpeaking) {
            console.log('[VoiceMode] 📋 Adding to queue (currently speaking):', messageId);
            this.messageQueue.push({ text: preparedText, messageId, options });
            this.queuedMessageIds.add(messageId);
            return;
        }

        // Start speaking immediately
        console.log('[VoiceMode] 🎤 Starting speech immediately:', messageId);
        await this.speakNow(preparedText, messageId, options);
    }

    /**
     * Internal method to actually speak (used by speak() and queue processing)
     */
    private async speakNow(preparedText: string, messageId: string, options: TTSOptions): Promise<void> {
        // Double-check API key (should never happen due to check in speak())
        if (!this.apiKey) {
            console.error('[VoiceMode] ❌ API key not set in speakNow - ABORTING');
            return;
        }

        this.isCurrentlySpeaking = true;
        this.currentMessageId = messageId;
        console.log('[VoiceMode] State: isCurrentlySpeaking=true, currentMessageId=', messageId);

        try {
            console.log('[VoiceMode] 🎤 Requesting TTS from ElevenLabs...');

            // Use voice_id from options or default to Adam
            const voiceId = options.voiceId || 'pNInz6obpgDQGcFmaJgB';
            console.log('[VoiceMode] Using voice ID:', voiceId);

            // Call ElevenLabs TTS API
            console.log('[VoiceMode] Making API call...');
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey, // TypeScript knows it's non-null now
                    },
                    body: JSON.stringify({
                        text: preparedText,
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: 0,
                            use_speaker_boost: true,
                        },
                    }),
                }
            );

            console.log('[VoiceMode] API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[VoiceMode] ❌ API error:', response.status, errorText);
                throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
            }

            console.log('[VoiceMode] ✅ Received audio from ElevenLabs');

            // Get audio data as ArrayBuffer
            console.log('[VoiceMode] Converting to ArrayBuffer...');
            const arrayBuffer = await response.arrayBuffer();
            console.log('[VoiceMode] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

            // Convert ArrayBuffer to base64
            console.log('[VoiceMode] Converting to base64...');
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);
            const uri = `data:audio/mpeg;base64,${base64Audio}`;
            console.log('[VoiceMode] Base64 URI length:', uri.length);

            console.log('[VoiceMode] 🔊 Creating sound object...');

            // Create and play sound
            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true, rate: options.speed },
                this.onPlaybackStatusUpdate.bind(this)
            );

            this.sound = sound;
            console.log('[VoiceMode] ✅ Sound created and playing!', messageId);

            // Get initial playback status
            const status = await sound.getStatusAsync();
            console.log('[VoiceMode] Initial playback status:', JSON.stringify(status));
        } catch (error) {
            console.error('[VoiceMode] TTS error:', error);
            this.isCurrentlySpeaking = false;
            this.currentMessageId = null;
        }
    }

    private onPlaybackStatusUpdate(status: any) {
        if (status.didJustFinish) {
            console.log('[VoiceMode] ✅ Finished playing:', this.currentMessageId);
            const finishedMessageId = this.currentMessageId;

            // Remove from queued IDs set
            if (finishedMessageId) {
                this.queuedMessageIds.delete(finishedMessageId);
            }

            // Unload sound
            if (this.sound) {
                this.sound.unloadAsync();
                this.sound = null;
            }

            // Reset state
            this.isCurrentlySpeaking = false;
            this.currentMessageId = null;

            // Process next item in queue
            if (this.messageQueue.length > 0) {
                console.log('[VoiceMode] 📋 Processing next item from queue (', this.messageQueue.length, 'remaining)');
                const next = this.messageQueue.shift()!;
                this.queuedMessageIds.delete(next.messageId); // Remove from queued set before playing
                this.speakNow(next.text, next.messageId, next.options);
            }

            // Call callback
            if (finishedMessageId && this.onPlaybackFinished) {
                this.onPlaybackFinished(finishedMessageId);
            }
        }
    }

    /**
     * Prepare text for TTS by removing formatting and code
     */
    private prepareTextForTTS(text: string, options: TTSOptions): string {
        let cleaned = text;

        // Remove code blocks if enabled
        if (options.skipCodeBlocks) {
            cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
        }

        // Remove inline code backticks
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

        // Remove markdown formatting that sounds awkward
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
        cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1'); // Strikethrough

        // Convert file references to natural speech
        cleaned = cleaned.replace(/(\w+\.tsx?):\d+/g, 'in file $1');

        // Remove excessive newlines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        // Trim whitespace
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * Check if a message should be read aloud
     */
    shouldReadMessage(text: string, options: TTSOptions): boolean {
        // Skip if empty
        if (!text || text.trim().length === 0) {
            return false;
        }

        // Skip if too long
        if (text.length > options.maxLength) {
            return false;
        }

        // Skip tool calls
        if (text.startsWith('[Used tool:') || text.startsWith('A: [Used tool:')) {
            return false;
        }

        // Skip if mostly code (if skipCodeBlocks enabled)
        if (options.skipCodeBlocks) {
            const codeBlockMatches = text.match(/```[\s\S]*?```/g) || [];
            const codeBlockLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0);
            const codeRatio = codeBlockLength / text.length;

            if (codeRatio > 0.3) {
                return false;
            }
        }

        // Skip if only file paths/code references
        const filePathRegex = /^[\w\/\-\.]+:\d+(\n[\w\/\-\.]+:\d+)*$/;
        if (filePathRegex.test(text.trim())) {
            return false;
        }

        return true;
    }

    /**
     * Stop current speech and clear queue
     */
    async stop(): Promise<void> {
        console.log('[VoiceMode] 🛑 Stop called');

        if (this.sound) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
            this.sound = null;
        }

        // Clear queue and state
        this.messageQueue = [];
        this.queuedMessageIds.clear();
        this.isCurrentlySpeaking = false;
        this.currentMessageId = null;

        console.log('[VoiceMode] Stopped and cleared queue');
    }

    /**
     * Pause current speech
     */
    async pause(): Promise<void> {
        if (this.sound) {
            await this.sound.pauseAsync();
        }
    }

    /**
     * Resume paused speech
     */
    async resume(): Promise<void> {
        if (this.sound) {
            await this.sound.playAsync();
        }
    }

    /**
     * Check if currently speaking
     */
    async isSpeaking(): Promise<boolean> {
        return this.isCurrentlySpeaking;
    }

    /**
     * Get available ElevenLabs voices
     */
    async getAvailableVoices() {
        if (!this.apiKey) {
            return [];
        }

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.apiKey,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch voices: ${response.status}`);
            }

            const data = await response.json();
            return data.voices || [];
        } catch (error) {
            console.error('[VoiceMode] Failed to fetch voices:', error);
            return [];
        }
    }

    /**
     * Callback when playback finishes
     */
    onPlaybackFinished?: (messageId: string) => void;
}

export const voiceModeManager = new VoiceModeManager();
