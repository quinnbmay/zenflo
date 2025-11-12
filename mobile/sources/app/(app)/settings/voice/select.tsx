import React, { useState, useMemo, useEffect } from 'react';
import { View, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { useLocalSettingMutable } from '@/sync/storage';
import { useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { voiceModeManager } from '@/voice/VoiceModeManager';
import { Text } from '@/components/StyledText';

interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category?: string;
    description?: string;
    labels?: Record<string, string>;
}

export default function VoiceSelectionScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const [ttsVoiceId, setTtsVoiceId] = useLocalSettingMutable('ttsVoiceId');
    const [searchQuery, setSearchQuery] = useState('');
    const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load voices from ElevenLabs on mount
    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            setLoading(true);
            setError(null);
            const availableVoices = await voiceModeManager.getAvailableVoices();
            console.log('[VoiceSelection] Loaded', availableVoices.length, 'voices');
            setVoices(availableVoices);
        } catch (err) {
            console.error('[VoiceSelection] Failed to load voices:', err);
            // Show specific error message from VoiceModeManager
            const errorMessage = err instanceof Error ? err.message : t('settingsVoice.voiceSelection.loadError');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Filter voices based on search query
    const filteredVoices = useMemo(() => {
        if (!searchQuery) return voices;

        const query = searchQuery.toLowerCase();
        return voices.filter(voice =>
            voice.name.toLowerCase().includes(query) ||
            (voice.category && voice.category.toLowerCase().includes(query)) ||
            (voice.description && voice.description.toLowerCase().includes(query))
        );
    }, [voices, searchQuery]);

    const handleVoiceSelect = (voiceId: string) => {
        setTtsVoiceId(voiceId);
        router.back();
    };

    // Group voices by category
    const groupedVoices = useMemo(() => {
        const groups: Record<string, ElevenLabsVoice[]> = {
            'premade': [],
            'cloned': [],
            'professional': [],
            'generated': [],
            'other': [],
        };

        filteredVoices.forEach(voice => {
            const category = voice.category?.toLowerCase() || 'other';
            if (groups[category]) {
                groups[category].push(voice);
            } else {
                groups['other'].push(voice);
            }
        });

        // Remove empty groups
        return Object.entries(groups).filter(([_, voices]) => voices.length > 0);
    }, [filteredVoices]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface }}>
                <ActivityIndicator size="large" color={theme.colors.textLink} />
                <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>
                    {t('settingsVoice.voiceSelection.loading')}
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.surface }}>
                <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textDestructive} />
                <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
                    {t('common.error')}
                </Text>
                <Text style={{ marginTop: 8, textAlign: 'center', color: theme.colors.textSecondary }}>
                    {error}
                </Text>
                <Ionicons
                    name="refresh-outline"
                    size={24}
                    color={theme.colors.textLink}
                    onPress={loadVoices}
                    style={{ marginTop: 24 }}
                />
            </View>
        );
    }

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Search Header */}
            <View style={{
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.input.background,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}>
                    <Ionicons
                        name="search-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            fontSize: 16,
                            color: theme.colors.input.text,
                        }}
                        placeholder={t('settingsVoice.voiceSelection.searchPlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Ionicons
                            name="close-circle"
                            size={20}
                            color={theme.colors.textSecondary}
                            onPress={() => setSearchQuery('')}
                            style={{ marginLeft: 8 }}
                        />
                    )}
                </View>
            </View>

            {/* Grouped Voice List */}
            {groupedVoices.map(([category, categoryVoices]) => {
                // Map category to translation key
                const categoryKey = category as 'premade' | 'cloned' | 'professional' | 'generated' | 'other';
                const categoryTitle =
                    categoryKey === 'premade' ? t('settingsVoice.voiceSelection.category.premade') :
                    categoryKey === 'cloned' ? t('settingsVoice.voiceSelection.category.cloned') :
                    categoryKey === 'professional' ? t('settingsVoice.voiceSelection.category.professional') :
                    categoryKey === 'generated' ? t('settingsVoice.voiceSelection.category.generated') :
                    t('settingsVoice.voiceSelection.category.other');

                return (
                <ItemGroup
                    key={category}
                    title={categoryTitle}
                    footer={category === 'premade' ? t('settingsVoice.voiceSelection.categoryDescription') : undefined}
                >
                    {categoryVoices.map((voice) => (
                        <Item
                            key={voice.voice_id}
                            title={voice.name}
                            subtitle={voice.description || voice.voice_id}
                            icon={<Ionicons name="person-outline" size={29} color="#007AFF" />}
                            rightElement={
                                ttsVoiceId === voice.voice_id ? (
                                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                                ) : null
                            }
                            onPress={() => handleVoiceSelect(voice.voice_id)}
                            showChevron={false}
                        />
                    ))}
                </ItemGroup>
            );
            })}

            {filteredVoices.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                        {t('settingsVoice.voiceSelection.noResults')}
                    </Text>
                </View>
            )}
        </ItemList>
    );
}
