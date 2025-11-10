import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';

export const ZenVoiceButton = React.memo(() => {
    const router = useRouter();
    const { theme } = useUnistyles();

    const handlePress = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/zen/voice');
    }, [router]);

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={15}
            style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Ionicons
                name="mic-outline"
                size={24}
                color={theme.colors.header.tint}
            />
        </Pressable>
    );
});
