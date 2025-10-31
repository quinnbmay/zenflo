import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, RemoteTrack, Track } from 'livekit-client';
import { registerVoiceSession } from './RealtimeSession';
import { storage } from '@/sync/storage';
import type { VoiceSession, VoiceSessionConfig } from './types';

const LIVEKIT_URL = 'wss://combined-memory-xqro4l3t.livekit.cloud';
const QUINN_SERVER_URL = 'https://quinn-server-production.up.railway.app';

// Static reference to the room instance
let roomInstance: Room | null = null;

// Global voice session implementation
class RealtimeVoiceSessionImpl implements VoiceSession {

    async startSession(config: VoiceSessionConfig): Promise<void> {
        if (!roomInstance) {
            console.warn('LiveKit room not initialized');
            return;
        }

        try {
            storage.getState().setRealtimeStatus('connecting');

            // Generate LiveKit token from Quinn Server
            const token = await this.generateToken(config.sessionId);

            // Connect to LiveKit room
            await roomInstance.connect(LIVEKIT_URL, token);

            console.log('✅ Connected to LiveKit room:', config.sessionId);
            storage.getState().setRealtimeStatus('connected');

        } catch (error) {
            console.error('Failed to start LiveKit session:', error);
            storage.getState().setRealtimeStatus('error');
        }
    }

    private async generateToken(identity: string): Promise<string> {
        try {
            const response = await fetch(`${QUINN_SERVER_URL}/api/livekit/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identity,
                    room: identity,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate token: ${response.status}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Token generation error:', error);
            throw error;
        }
    }

    async endSession(): Promise<void> {
        if (!roomInstance) {
            return;
        }

        try {
            await roomInstance.disconnect();
            storage.getState().setRealtimeStatus('disconnected');
            console.log('✅ Disconnected from LiveKit room');
        } catch (error) {
            console.error('Failed to end LiveKit session:', error);
        }
    }

    sendTextMessage(message: string): void {
        if (!roomInstance || roomInstance.state !== 'connected') {
            console.warn('LiveKit room not connected');
            return;
        }

        try {
            // Send text message as data message
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            roomInstance.localParticipant.publishData(data, { reliable: true });
            console.log('📤 Sent text message via LiveKit');
        } catch (error) {
            console.error('Failed to send text message:', error);
        }
    }

    sendContextualUpdate(update: string): void {
        if (!roomInstance || roomInstance.state !== 'connected') {
            console.warn('LiveKit room not connected');
            return;
        }

        try {
            // Send contextual update as data message with topic
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ type: 'context_update', data: update }));
            roomInstance.localParticipant.publishData(data, { reliable: true, topic: 'context' });
            console.log('📤 Sent contextual update via LiveKit');
        } catch (error) {
            console.error('Failed to send contextual update:', error);
        }
    }
}

export const RealtimeVoiceSession: React.FC = () => {
    const [room] = useState(() => new Room());
    const hasRegistered = useRef(false);

    useEffect(() => {
        // Store the room instance globally
        roomInstance = room;

        // Register the voice session once
        if (!hasRegistered.current) {
            try {
                registerVoiceSession(new RealtimeVoiceSessionImpl());
                hasRegistered.current = true;
            } catch (error) {
                console.error('Failed to register voice session:', error);
            }
        }

        // Set up room event listeners
        room.on(RoomEvent.Connected, () => {
            console.log('🎉 LiveKit room connected');
            storage.getState().setRealtimeStatus('connected');
        });

        room.on(RoomEvent.Disconnected, () => {
            console.log('👋 LiveKit room disconnected');
            storage.getState().setRealtimeStatus('disconnected');
        });

        room.on(RoomEvent.Reconnecting, () => {
            console.log('🔄 LiveKit room reconnecting');
            storage.getState().setRealtimeStatus('connecting');
        });

        room.on(RoomEvent.Reconnected, () => {
            console.log('✅ LiveKit room reconnected');
            storage.getState().setRealtimeStatus('connected');
        });

        room.on(RoomEvent.TrackSubscribed, (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log('🎵 Track subscribed:', track.kind, 'from', participant.identity);

            if (track.kind === Track.Kind.Audio) {
                // Audio track from agent
                const audioTrack = track as any;
                audioTrack.attach();
            }
        });

        room.on(RoomEvent.DataReceived, (
            payload: Uint8Array,
            participant?: RemoteParticipant,
            kind?: any,
            topic?: string
        ) => {
            const decoder = new TextDecoder();
            const message = decoder.decode(payload);
            console.log('📥 Data received from', participant?.identity, ':', message);
        });

        room.on(RoomEvent.ConnectionQualityChanged, (quality: string, participant: any) => {
            console.log('📶 Connection quality:', quality, 'for', participant.identity);
        });

        return () => {
            // Clean up on unmount
            if (room.state === 'connected') {
                room.disconnect();
            }
            roomInstance = null;
        };
    }, [room]);

    // This component doesn't render anything visible
    return null;
};
