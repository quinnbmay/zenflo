import * as React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
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

    // Render custom image if provided
    if (imageUrl) {
        const imageElement = (
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

        // If a provider flavor is specified, show provider logo instead of custom avatar
        if (flavor) {
            const effectiveFlavor = flavor || 'claude';
            const flavorIcon = flavorIcons[effectiveFlavor as keyof typeof flavorIcons] || flavorIcons.claude;
            return (
                <Image
                    source={flavorIcon}
                    contentFit="contain"
                    style={{ width: size, height: size, borderRadius: avatarProps.square ? 0 : size / 2 }}
                    tintColor={effectiveFlavor === 'codex' ? theme.colors.text : undefined}
                />
            );
        }

        return imageElement;
    }

    // No image provided: if flavor exists, show provider logo; otherwise show app icon
    const effectiveFlavor = flavor || 'claude';
    const flavorIcon = flavorIcons[effectiveFlavor as keyof typeof flavorIcons] || flavorIcons.claude;
    return (
        <Image
            source={flavorIcon}
            contentFit="contain"
            style={{ width: size, height: size, borderRadius: avatarProps.square ? 0 : size / 2 }}
            tintColor={effectiveFlavor === 'codex' ? theme.colors.text : undefined}
        />
    );
});