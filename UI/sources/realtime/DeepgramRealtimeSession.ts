import type { VoiceSession } from './types';

let deepgramVoiceSession: VoiceSession | null = null;
let deepgramSessionStarted: boolean = false;
let currentDeepgramSessionId: string | null = null;

export async function startDeepgramSession(sessionId: string, initialContext?: string) {
    if (!deepgramVoiceSession) {
        console.warn('No Deepgram voice session registered');
        return;
    }

    try {
        currentDeepgramSessionId = sessionId;
        deepgramSessionStarted = true;
        await deepgramVoiceSession.startSession({
            sessionId,
            initialContext
        });
    } catch (error) {
        console.error('Failed to start Deepgram session:', error);
        currentDeepgramSessionId = null;
    }
}

export async function stopDeepgramSession() {
    if (!deepgramVoiceSession) {
        return;
    }

    try {
        await deepgramVoiceSession.endSession();
        currentDeepgramSessionId = null;
        deepgramSessionStarted = false;
    } catch (error) {
        console.error('Failed to stop Deepgram session:', error);
    }
}

export function registerDeepgramVoiceSession(session: VoiceSession) {
    if (deepgramVoiceSession) {
        console.warn('Deepgram voice session already registered, replacing with new one');
    }
    deepgramVoiceSession = session;
}

export function isDeepgramSessionStarted(): boolean {
    return deepgramSessionStarted;
}

export function getDeepgramVoiceSession(): VoiceSession | null {
    return deepgramVoiceSession;
}

export function getCurrentDeepgramSessionId(): string | null {
    return currentDeepgramSessionId;
}

export function updateCurrentDeepgramSessionId(sessionId: string | null) {
    console.log(`🔄 Deepgram session ID updated: ${sessionId}`);
    currentDeepgramSessionId = sessionId;
}
