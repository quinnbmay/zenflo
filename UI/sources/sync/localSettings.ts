import * as z from 'zod';

//
// Schema
//

export const LocalSettingsSchema = z.object({
    // Developer settings (device-specific)
    debugMode: z.boolean().describe('Enable debug logging'),
    devModeEnabled: z.boolean().describe('Enable developer menu in settings'),
    commandPaletteEnabled: z.boolean().describe('Enable CMD+K command palette (web only)'),
    themePreference: z.enum(['light', 'dark', 'adaptive']).describe('Theme preference: light, dark, or adaptive (follows system)'),
    markdownCopyV2: z.boolean().describe('Replace native paragraph selection with long-press modal for full markdown copy'),
    // CLI version acknowledgments - keyed by machineId
    acknowledgedCliVersions: z.record(z.string(), z.string()).describe('Acknowledged CLI versions per machine'),

    // Voice Mode settings (device-specific)
    ttsAutoPlay: z.boolean().describe('Automatically read Claude responses aloud'),
    ttsSpeed: z.number().min(0.5).max(2.0).describe('Text-to-speech playback speed (0.5x - 2.0x)'),
    ttsSkipCodeBlocks: z.boolean().describe('Skip reading code blocks and technical content'),
    ttsMaxLength: z.number().describe('Maximum message length to read aloud (characters)'),
    ttsVoiceId: z.string().describe('ElevenLabs voice ID for text-to-speech'),
});

//
// NOTE: Local settings are device-specific and should NOT be synced.
// These are preferences that make sense to be different on each device.
//

const LocalSettingsSchemaPartial = LocalSettingsSchema.loose().partial();

export type LocalSettings = z.infer<typeof LocalSettingsSchema>;

//
// Defaults
//

export const localSettingsDefaults: LocalSettings = {
    debugMode: false,
    devModeEnabled: false,
    commandPaletteEnabled: false,
    themePreference: 'adaptive',
    markdownCopyV2: false,
    acknowledgedCliVersions: {},

    // Voice Mode defaults
    ttsAutoPlay: false,
    ttsSpeed: 1.0,
    ttsSkipCodeBlocks: true,
    ttsMaxLength: 2000,
    ttsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Default to Adam voice
};
Object.freeze(localSettingsDefaults);

//
// Parsing
//

export function localSettingsParse(settings: unknown): LocalSettings {
    const parsed = LocalSettingsSchemaPartial.safeParse(settings);
    if (!parsed.success) {
        return { ...localSettingsDefaults };
    }
    return { ...localSettingsDefaults, ...parsed.data };
}

//
// Applying changes
//

export function applyLocalSettings(settings: LocalSettings, delta: Partial<LocalSettings>): LocalSettings {
    return { ...localSettingsDefaults, ...settings, ...delta };
}
