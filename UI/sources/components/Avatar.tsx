import * as React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { AvatarSkia } from "./AvatarSkia";
import { AvatarIcon } from "./AvatarIcon";
import { useSetting } from '@/sync/storage';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface AvatarProps {
    id: string;
    title?: boolean;
    square?: boolean;
    size?: number;
    monochrome?: boolean;
    flavor?: string | null;
    imageUrl?: string | null;
    thumbhash?: string | null;
}

const flavorIcons = {
    claude: require('@/assets/images/icon-claude.png'),
    codex: require('@/assets/images/icon-gpt.png'),
    ccr: require('@/assets/images/icon-zai.png'),
    gemini: require('@/assets/images/icon-gemini.png'),
    qwen: require('@/assets/images/Q-Logo.png'),
};

const styles = StyleSheet.create((theme) => ({
    container: {
        position: 'relative',
    },
    flavorIcon: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: theme.colors.surface,
        borderRadius: 100,
        padding: 2,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
}));

export const Avatar = React.memo((props: AvatarProps) => {
    const { flavor, size = 48, imageUrl, thumbhash, ...avatarProps } = props;
    const { theme } = useUnistyles();

    // If flavor is provided, always use provider logo
    if (flavor) {
        const effectiveFlavor = flavor || 'claude';
        const providerIcon = flavorIcons[effectiveFlavor as keyof typeof flavorIcons] || flavorIcons.claude;

        return (
            <View style={{
                width: size,
                height: size,
                borderRadius: avatarProps.square ? 0 : size / 2,
                backgroundColor: theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Image
                    source={providerIcon}
                    style={{ width: size * 0.7, height: size * 0.7 }}
                    contentFit="contain"
                    tintColor={effectiveFlavor === 'codex' ? theme.colors.text : undefined}
                />
            </View>
        );
    }

    // For user/profile avatars, show custom image if provided
    if (imageUrl) {
        return (
            <Image
                source={{ uri: imageUrl, thumbhash: thumbhash || undefined }}
                placeholder={thumbhash ? { thumbhash: thumbhash } : undefined}
                contentFit="cover"
                style={{
                    width: size,
                    height: size,
                    borderRadius: avatarProps.square ? 0 : size / 2
                }}
            />
        );
    }

    // Fallback to icon avatar for users without image
    return <AvatarIcon {...avatarProps} size={size} />;
});