/**
 * VoiceModeManager - TTS using ElevenLabs (Web version)
 *
 * Handles text-to-speech playback for Claude responses using ElevenLabs API.
 * Provides high-quality voice synthesis with professional voices.
 * Uses Web Audio API for browser playback.
 */

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
    private currentSessionId: string | null = null; // Track which session is currently playing
    private queuedMessageIds: Set<string> = new Set();
    private audioElement: HTMLAudioElement | null = null;
    private apiKey: string | null = null;

    constructor() {
        console.log('[VoiceMode] Web VoiceModeManager initialized');
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
     * @param isManual - If true, speaks even when Max is active (manual mic button click)
     */
    async speak(text: string, messageId: string, sessionId: string, options: TTSOptions, isManual: boolean = false): Promise<void> {
        console.log('[VoiceMode] ====== SPEAK CALLED ======');
        console.log('[VoiceMode] SessionId:', sessionId);
        console.log('[VoiceMode] MessageId:', messageId);
        console.log('[VoiceMode] isManual:', isManual);
        console.log('[VoiceMode] Currently speaking:', this.isCurrentlySpeaking);
        console.log('[VoiceMode] Current sessionId:', this.currentSessionId);
        console.log('[VoiceMode] Current messageId:', this.currentMessageId);
        console.log('[VoiceMode] Queue length:', this.messageQueue.length);

        // Check if Max (conversational AI) is active - if so, only block auto-play (not manual)
        if (!isManual) {
            const { storage } = await import('../sync/storage');
            const realtimeStatus = storage.getState().realtimeStatus;
            if (realtimeStatus === 'connected' || realtimeStatus === 'connecting') {
                console.log('[VoiceMode] ⏸️  Max is active (', realtimeStatus, ') - skipping auto-play TTS to avoid conflict');
                return;
            }
        } else {
            console.log('[VoiceMode] 🎤 Manual playback - bypassing Max active check');
        }

        // If switching to a different session, stop current playback
        if (this.currentSessionId && this.currentSessionId !== sessionId) {
            console.log('[VoiceMode] 🔄 Session changed, stopping current playback');
            await this.stop();
        }

        // Update current session
        this.currentSessionId = sessionId;

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
                        'xi-api-key': this.apiKey,
                    },
                    body: JSON.stringify({
                        text: preparedText,
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.35,
                            similarity_boost: 0.75,
                            style: 0.3,
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

            // Get audio data as blob
            const audioBlob = await response.blob();
            console.log('[VoiceMode] Audio blob size:', audioBlob.size, 'bytes');

            // Create object URL for the audio
            const audioUrl = URL.createObjectURL(audioBlob);

            // Create and play audio element
            this.audioElement = new Audio(audioUrl);
            this.audioElement.playbackRate = options.speed;

            // Set up event listeners
            this.audioElement.addEventListener('ended', () => this.onPlaybackEnded());
            this.audioElement.addEventListener('error', (e) => {
                console.error('[VoiceMode] Audio playback error:', e);
                this.onPlaybackEnded();
            });

            // Start playback
            await this.audioElement.play();
            console.log('[VoiceMode] ✅ Audio playing!', messageId);

        } catch (error) {
            console.error('[VoiceMode] TTS error:', error);
            this.isCurrentlySpeaking = false;
            this.currentMessageId = null;
        }
    }

    private onPlaybackEnded() {
        console.log('[VoiceMode] ✅ Finished playing:', this.currentMessageId);
        const finishedMessageId = this.currentMessageId;

        // Remove from queued IDs set
        if (finishedMessageId) {
            this.queuedMessageIds.delete(finishedMessageId);
        }

        // Clean up audio element
        if (this.audioElement) {
            const audioUrl = this.audioElement.src;
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
            URL.revokeObjectURL(audioUrl);
        }

        // Reset state
        this.isCurrentlySpeaking = false;
        this.currentMessageId = null;

        // Process next item in queue
        if (this.messageQueue.length > 0) {
            console.log('[VoiceMode] 📋 Processing next item from queue (', this.messageQueue.length, 'remaining)');
            const next = this.messageQueue.shift()!;
            this.queuedMessageIds.delete(next.messageId);
            this.speakNow(next.text, next.messageId, next.options);
        }

        // Call callback
        if (finishedMessageId && this.onPlaybackFinished) {
            this.onPlaybackFinished(finishedMessageId);
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

        if (this.audioElement) {
            const audioUrl = this.audioElement.src;
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
            URL.revokeObjectURL(audioUrl);
        }

        // Clear queue and state
        this.messageQueue = [];
        this.queuedMessageIds.clear();
        this.isCurrentlySpeaking = false;
        this.currentMessageId = null;
        this.currentSessionId = null;

        console.log('[VoiceMode] Stopped and cleared queue');
    }

    /**
     * Pause current speech
     */
    async pause(): Promise<void> {
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }

    /**
     * Resume paused speech
     */
    async resume(): Promise<void> {
        if (this.audioElement) {
            await this.audioElement.play();
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
        console.log('[VoiceMode] getAvailableVoices called');
        console.log('[VoiceMode] API key available:', !!this.apiKey);

        if (!this.apiKey) {
            console.error('[VoiceMode] ❌ Cannot fetch voices - API key not set');
            throw new Error('ElevenLabs API key not configured. Please restart the app.');
        }

        try {
            console.log('[VoiceMode] Fetching voices from ElevenLabs API...');
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.apiKey,
                },
            });

            console.log('[VoiceMode] Voices API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[VoiceMode] ❌ API error:', response.status, errorText);
                throw new Error(`Failed to fetch voices: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[VoiceMode] ✅ Fetched', data.voices?.length || 0, 'voices');
            return data.voices || [];
        } catch (error) {
            console.error('[VoiceMode] Failed to fetch voices:', error);
            throw error;
        }
    }

    /**
     * Callback when playback finishes
     */
    onPlaybackFinished?: (messageId: string) => void;
}

export const voiceModeManager = new VoiceModeManager();
