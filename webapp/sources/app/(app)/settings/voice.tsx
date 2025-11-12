import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Switch } from '@/components/Switch';
import { useSettingMutable, useLocalSettingMutable } from '@/sync/storage';
import { useUnistyles } from 'react-native-unistyles';
import { findLanguageByCode, getLanguageDisplayName, LANGUAGES } from '@/constants/Languages';
import { t } from '@/text';

export default function VoiceSettingsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');
    const [ttsAutoPlay, setTtsAutoPlay] = useLocalSettingMutable('ttsAutoPlay');
    const [ttsSkipCodeBlocks, setTtsSkipCodeBlocks] = useLocalSettingMutable('ttsSkipCodeBlocks');
    const [ttsSpeed, setTtsSpeed] = useLocalSettingMutable('ttsSpeed');
    const [ttsVoiceId] = useLocalSettingMutable('ttsVoiceId');

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Max Voice Assistant Language Settings */}
            <ItemGroup
                title={t('settingsVoice.languageTitle')}
                footer={t('settingsVoice.languageDescription')}
            >
                <Item
                    title={t('settingsVoice.preferredLanguage')}
                    subtitle={t('settingsVoice.preferredLanguageSubtitle')}
                    icon={<Ionicons name="language-outline" size={29} color="#007AFF" />}
                    detail={getLanguageDisplayName(currentLanguage)}
                    onPress={() => router.push('/settings/voice/language')}
                />
            </ItemGroup>

            {/* Text-to-Speech Settings */}
            <ItemGroup
                title={t('settingsVoice.ttsTitle')}
                footer={t('settingsVoice.ttsDescription')}
            >
                <Item
                    title={t('settingsVoice.autoPlay')}
                    subtitle={t('settingsVoice.autoPlaySubtitle')}
                    icon={<Ionicons name="volume-high-outline" size={29} color="#007AFF" />}
                    rightElement={
                        <Switch
                            value={ttsAutoPlay}
                            onValueChange={setTtsAutoPlay}
                        />
                    }
                    showChevron={false}
                />

                <Item
                    title={t('settingsVoice.skipCodeBlocks')}
                    subtitle={t('settingsVoice.skipCodeBlocksSubtitle')}
                    icon={<Ionicons name="code-slash-outline" size={29} color="#007AFF" />}
                    rightElement={
                        <Switch
                            value={ttsSkipCodeBlocks}
                            onValueChange={setTtsSkipCodeBlocks}
                        />
                    }
                    showChevron={false}
                />

                <Item
                    title={t('settingsVoice.playbackSpeed')}
                    subtitle={`${ttsSpeed.toFixed(1)}x`}
                    icon={<Ionicons name="speedometer-outline" size={29} color="#007AFF" />}
                    detail={`${ttsSpeed.toFixed(1)}x`}
                    onPress={() => {
                        // Cycle through speeds: 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
                        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                        const currentIndex = speeds.findIndex(s => Math.abs(s - ttsSpeed) < 0.01);
                        const nextIndex = (currentIndex + 1) % speeds.length;
                        setTtsSpeed(speeds[nextIndex]);
                    }}
                />

                <Item
                    title={t('settingsVoice.voice')}
                    subtitle={t('settingsVoice.voiceSubtitle')}
                    icon={<Ionicons name="person-outline" size={29} color="#007AFF" />}
                    detail={t('settingsVoice.changeVoice')}
                    onPress={() => router.push('/settings/voice/select' as any)}
                />
            </ItemGroup>

        </ItemList>
    );
}
