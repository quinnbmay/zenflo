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
    private messageQueue: Array<{ text: string; messageId: string }> = [];
    private currentMessageId: string | null = null;
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
        this.apiKey = key;
    }

    /**
     * Speak a message using ElevenLabs TTS
     */
    async speak(text: string, messageId: string, options: TTSOptions): Promise<void> {
        // Check API key
        if (!this.apiKey) {
            console.error('[VoiceMode] ElevenLabs API key not set');
            return;
        }

        // Prepare text for TTS
        const preparedText = this.prepareTextForTTS(text, options);

        // Skip if text is too long or empty
        if (!preparedText || preparedText.length > options.maxLength) {
            console.log('[VoiceMode] Skipping message (empty or too long):', preparedText.length);
            return;
        }

        // Stop current speech if any
        if (this.isCurrentlySpeaking) {
            await this.stop();
        }

        this.isCurrentlySpeaking = true;
        this.currentMessageId = messageId;

        try {
            console.log('[VoiceMode] Requesting TTS from ElevenLabs...');

            // Use voice_id from options or default to Adam
            const voiceId = options.voiceId || 'pNInz6obpgDQGcFmaJgB';

            // Call ElevenLabs TTS API
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey,
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

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            // Get audio data as base64
            const audioBlob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
                try {
                    const base64Audio = reader.result as string;

                    // Create and play sound
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: base64Audio },
                        { shouldPlay: true, rate: options.speed },
                        this.onPlaybackStatusUpdate.bind(this)
                    );

                    this.sound = sound;
                    console.log('[VoiceMode] Started playing:', messageId);
                } catch (error) {
                    console.error('[VoiceMode] Failed to play audio:', error);
                    this.isCurrentlySpeaking = false;
                    this.currentMessageId = null;
                }
            };

            reader.readAsDataURL(audioBlob);
        } catch (error) {
            console.error('[VoiceMode] TTS error:', error);
            this.isCurrentlySpeaking = false;
            this.currentMessageId = null;
        }
    }

    private onPlaybackStatusUpdate(status: any) {
        if (status.didJustFinish) {
            console.log('[VoiceMode] Finished playing:', this.currentMessageId);
            this.isCurrentlySpeaking = false;
            const messageId = this.currentMessageId;
            this.currentMessageId = null;

            // Unload sound
            if (this.sound) {
                this.sound.unloadAsync();
                this.sound = null;
            }

            if (messageId && this.onPlaybackFinished) {
                this.onPlaybackFinished(messageId);
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
     * Stop current speech
     */
    async stop(): Promise<void> {
        if (this.sound) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
            this.sound = null;
        }
        this.isCurrentlySpeaking = false;
        this.currentMessageId = null;
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
