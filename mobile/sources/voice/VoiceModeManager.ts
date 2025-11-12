/**
 * VoiceModeManager - Simple TTS using expo-speech
 *
 * Handles text-to-speech playback for Claude responses using native device voices.
 * Uses expo-speech for zero-cost, offline voice synthesis.
 */

import * as Speech from 'expo-speech';

interface TTSOptions {
    speed: number;
    skipCodeBlocks: boolean;
    maxLength: number;
}

class VoiceModeManager {
    private isCurrentlySpeaking = false;
    private messageQueue: Array<{ text: string; messageId: string }> = [];
    private currentMessageId: string | null = null;

    /**
     * Speak a message using native TTS
     */
    async speak(text: string, messageId: string, options: TTSOptions): Promise<void> {
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

        return new Promise<void>((resolve, reject) => {
            Speech.speak(preparedText, {
                language: 'en-US',
                pitch: 1.0,
                rate: options.speed,
                onStart: () => {
                    console.log('[VoiceMode] Started speaking:', messageId);
                },
                onDone: () => {
                    console.log('[VoiceMode] Finished speaking:', messageId);
                    this.isCurrentlySpeaking = false;
                    this.currentMessageId = null;
                    this.onPlaybackFinished?.(messageId);
                    resolve();
                },
                onStopped: () => {
                    console.log('[VoiceMode] Stopped:', messageId);
                    this.isCurrentlySpeaking = false;
                    this.currentMessageId = null;
                    resolve();
                },
                onError: (error) => {
                    console.error('[VoiceMode] Error:', error);
                    this.isCurrentlySpeaking = false;
                    this.currentMessageId = null;
                    reject(error);
                },
            });
        });
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
        await Speech.stop();
        this.isCurrentlySpeaking = false;
        this.currentMessageId = null;
    }

    /**
     * Pause current speech (iOS only)
     */
    async pause(): Promise<void> {
        await Speech.pause();
    }

    /**
     * Resume paused speech (iOS only)
     */
    async resume(): Promise<void> {
        await Speech.resume();
    }

    /**
     * Check if currently speaking
     */
    async isSpeaking(): Promise<boolean> {
        return await Speech.isSpeakingAsync();
    }

    /**
     * Get available voices
     */
    async getAvailableVoices() {
        return await Speech.getAvailableVoicesAsync();
    }

    /**
     * Callback when playback finishes
     */
    onPlaybackFinished?: (messageId: string) => void;
}

export const voiceModeManager = new VoiceModeManager();
