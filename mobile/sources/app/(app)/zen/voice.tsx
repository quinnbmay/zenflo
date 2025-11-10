import * as React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { useZenVoice } from '@/-zen/hooks/useZenVoice';
import { t } from '@/text';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withTiming,
    useSharedValue,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { layout } from '@/components/layout';

export default function ZenVoiceScreen() {
    const { theme } = useUnistyles();
    const { isConnected, isListening, isSpeaking, transcript, connect, disconnect, error } = useZenVoice();

    // Animation for the pulsing circle
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.8);

    React.useEffect(() => {
        if (isListening || isSpeaking) {
            // Pulse animation when active
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
        } else {
            // Reset to default
            scale.value = withTiming(1, { duration: 300 });
            opacity.value = withTiming(0.8, { duration: 300 });
        }
    }, [isListening, isSpeaking]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handleMainButton = React.useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (isConnected) {
            disconnect();
        } else {
            await connect();
        }
    }, [isConnected, connect, disconnect]);

    const handleRetry = React.useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await connect();
    }, [connect]);

    // Connection status text
    const getStatusText = () => {
        if (error) return t('zenVoice.error');
        if (!isConnected) return t('status.disconnected');
        if (isListening) return t('zenVoice.listening');
        if (isSpeaking) return t('zenVoice.speaking');
        return t('status.connected');
    };

    // Main button text
    const getButtonText = () => {
        if (isConnected) {
            return t('zenVoice.tapToStop');
        }
        return t('zenVoice.tapToStart');
    };

    // Status color
    const getStatusColor = () => {
        if (error) return theme.colors.status.error;
        if (!isConnected) return theme.colors.textSecondary;
        if (isListening) return theme.colors.status.connecting;
        if (isSpeaking) return theme.colors.success;
        return theme.colors.success;
    };

    // Get primary action color (blue for start, red for stop)
    const getPrimaryColor = () => {
        return isConnected ? '#FF453A' : '#007AFF';
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider,
            }}>
                <Pressable
                    onPress={() => router.back()}
                    style={{
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Image
                        source={require('@/assets/icons/chevron-left.svg')}
                        style={{ width: 24, height: 24 }}
                        tintColor={theme.colors.text}
                    />
                </Pressable>
                <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.colors.text,
                }}>{t('zenVoice.title')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={{
                flex: 1,
                alignItems: 'center',
                paddingHorizontal: 20,
                maxWidth: layout.maxWidth,
                width: '100%',
                alignSelf: 'center',
            }}>
                {/* Status indicator */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 24,
                    gap: 8,
                }}>
                    <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: getStatusColor(),
                    }} />
                    <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: getStatusColor(),
                    }}>
                        {getStatusText()}
                    </Text>
                </View>

                {/* Visual feedback - pulsing circle */}
                <View style={{
                    marginTop: 48,
                    marginBottom: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 200,
                    height: 200,
                }}>
                    <Animated.View
                        style={[
                            {
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                                position: 'absolute',
                                backgroundColor: isListening
                                    ? theme.colors.status.connecting
                                    : isSpeaking
                                    ? theme.colors.success
                                    : theme.colors.divider
                            },
                            animatedStyle,
                        ]}
                    />
                    {(isListening || isSpeaking) && (
                        <Animated.View
                            style={[
                                {
                                    width: 160,
                                    height: 160,
                                    borderRadius: 80,
                                    borderWidth: 2,
                                    position: 'absolute',
                                    borderColor: isListening ? theme.colors.status.connecting : theme.colors.success
                                },
                                animatedStyle,
                            ]}
                        />
                    )}
                </View>

                {/* Transcript display */}
                <View style={{
                    flex: 1,
                    width: '100%',
                    backgroundColor: theme.colors.surfaceHigh,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                }}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {transcript ? (
                            <Text style={{
                                fontSize: 16,
                                lineHeight: 24,
                                color: theme.colors.text,
                            }}>{transcript}</Text>
                        ) : (
                            <Text style={{
                                fontSize: 16,
                                lineHeight: 24,
                                color: theme.colors.textSecondary,
                                fontStyle: 'italic',
                            }}>
                                {t('zenVoice.transcriptPlaceholder')}
                            </Text>
                        )}
                    </ScrollView>
                </View>

                {/* Main action button */}
                <View style={{
                    width: '100%',
                    gap: 12,
                    paddingBottom: 20,
                }}>
                    <Pressable
                        onPress={handleMainButton}
                        style={({ pressed }) => ({
                            height: 60,
                            borderRadius: 30,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: getPrimaryColor(),
                            opacity: pressed ? 0.8 : 1,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                        })}
                    >
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: '#FFFFFF',
                        }}>{getButtonText()}</Text>
                    </Pressable>

                    {/* Retry button when error */}
                    {error && !isConnected && (
                        <Pressable
                            onPress={handleRetry}
                            style={({ pressed }) => ({
                                height: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.6 : 1,
                            })}
                        >
                            <Text style={{
                                fontSize: 16,
                                fontWeight: '500',
                                color: theme.colors.textLink,
                            }}>
                                {t('zenVoice.retryConnection')}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
