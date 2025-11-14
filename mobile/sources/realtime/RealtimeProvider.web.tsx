import React from 'react';
import { RealtimeVoiceSession } from './RealtimeVoiceSession';
import { DeepgramVoiceSession } from './DeepgramVoiceSession';

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            <RealtimeVoiceSession />
            <DeepgramVoiceSession />
            {children}
        </>
    );
};