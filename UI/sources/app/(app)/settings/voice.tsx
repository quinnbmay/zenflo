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

// Deepgram Aura voices
const DEEPGRAM_VOICES = [
    { id: 'aura-asteria-en', name: 'Asteria (Warm, Natural)' },
    { id: 'aura-luna-en', name: 'Luna (Calm, Professional)' },
    { id: 'aura-stella-en', name: 'Stella (Energetic, Bright)' },
    { id: 'aura-athena-en', name: 'Athena (Clear, Confident)' },
    { id: 'aura-hera-en', name: 'Hera (Rich, Mature)' },
    { id: 'aura-orion-en', name: 'Orion (Deep, Masculine)' },
    { id: 'aura-arcas-en', name: 'Arcas (Smooth, Masculine)' },
    { id: 'aura-perseus-en', name: 'Perseus (Strong, Masculine)' },
    { id: 'aura-angus-en', name: 'Angus (Warm, Masculine)' },
    { id: 'aura-orpheus-en', name: 'Orpheus (Gentle, Masculine)' },
];

// Deepgram supported languages
const DEEPGRAM_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
];

export default function VoiceSettingsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');
    const [ttsAutoPlay, setTtsAutoPlay] = useLocalSettingMutable('ttsAutoPlay');
    const [ttsSkipCodeBlocks, setTtsSkipCodeBlocks] = useLocalSettingMutable('ttsSkipCodeBlocks');
    const [ttsSpeed, setTtsSpeed] = useLocalSettingMutable('ttsSpeed');
    const [ttsVoiceId] = useLocalSettingMutable('ttsVoiceId');
    const [deepgramVoice, setDeepgramVoice] = useSettingMutable('deepgramVoice');
    const [deepgramLanguage, setDeepgramLanguage] = useSettingMutable('deepgramLanguage');

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    // Find current Deepgram voice
    const currentDeepgramVoice = DEEPGRAM_VOICES.find(v => v.id === deepgramVoice) || DEEPGRAM_VOICES[0];
    const currentDeepgramLang = DEEPGRAM_LANGUAGES.find(l => l.code === deepgramLanguage) || DEEPGRAM_LANGUAGES[0];

    // Helper to cycle through voices
    const cycleDeepgramVoice = () => {
        const currentIndex = DEEPGRAM_VOICES.findIndex(v => v.id === deepgramVoice);
        const nextIndex = (currentIndex + 1) % DEEPGRAM_VOICES.length;
        setDeepgramVoice(DEEPGRAM_VOICES[nextIndex].id);
    };

    // Helper to cycle through languages
    const cycleDeepgramLanguage = () => {
        const currentIndex = DEEPGRAM_LANGUAGES.findIndex(l => l.code === deepgramLanguage);
        const nextIndex = (currentIndex + 1) % DEEPGRAM_LANGUAGES.length;
        setDeepgramLanguage(DEEPGRAM_LANGUAGES[nextIndex].code);
    };

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

            {/* Deepgram Voice Agent Settings */}
            <ItemGroup
                title="Deepgram Voice Agent"
                footer="Alternative voice assistant with hands-free conversation. Microphone automatically restarts after agent finishes speaking."
            >
                <Item
                    title="Voice"
                    subtitle="Voice personality for Deepgram agent"
                    icon={<Ionicons name="mic-outline" size={29} color="#34C759" />}
                    detail={currentDeepgramVoice.name}
                    onPress={cycleDeepgramVoice}
                />

                <Item
                    title="Language"
                    subtitle="Language for speech recognition and responses"
                    icon={<Ionicons name="language-outline" size={29} color="#34C759" />}
                    detail={currentDeepgramLang.name}
                    onPress={cycleDeepgramLanguage}
                />
            </ItemGroup>

        </ItemList>
    );
}