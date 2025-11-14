import React from 'react';
import { ElevenLabsProvider } from "@elevenlabs/react-native";
import { RealtimeVoiceSession } from './RealtimeVoiceSession';
import { DeepgramVoiceSession } from './DeepgramVoiceSession';

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <ElevenLabsProvider>
            <RealtimeVoiceSession />
            <DeepgramVoiceSession />
            {children}
        </ElevenLabsProvider>
    );
};