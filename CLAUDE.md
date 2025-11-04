# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `yarn start` - Start the Expo development server
- `yarn ios` - Run the app on iOS simulator
- `yarn android` - Run the app on Android emulator  
- `yarn web` - Run the app in web browser
- `yarn prebuild` - Generate native iOS and Android directories
- `yarn typecheck` - Run TypeScript type checking after all changes

### Testing
- `yarn test` - Run tests in watch mode (Jest with jest-expo preset)
- No existing tests in the codebase yet

### Production
- `yarn ota` - Deploy over-the-air updates via EAS Update to preview branch
- For production OTA: `APP_ENV=production NODE_ENV=production eas update --branch production --platform ios --message "Your message"`

## GitHub x Expo Deployment Workflow

### Overview

This project uses a two-tier deployment system:
1. **Native Builds** - Full app builds via EAS Build (triggered by GitHub workflows)
2. **OTA Updates** - JavaScript-only updates via EAS Update (for quick fixes)

### Native Builds via GitHub Workflows

#### Workflow Files Location
`.eas/workflows/` contains GitHub Action workflows that trigger EAS builds:
- `build-ios-production.yml` - Production iOS builds

#### Running a Workflow
```bash
# Via EAS CLI (locally)
eas workflow:run build-ios-production.yml

# Via GitHub UI
# Go to Actions tab → Select workflow → Run workflow
```

#### Workflow Configuration
Each workflow file must have:
```yaml
name: Build iOS Production
on:
  push:
    branches:
      - main
  workflow_dispatch: {}  # IMPORTANT: Empty object, not null

jobs:
  build:
    name: Build iOS App
    type: build
    params:
      platform: ios
      profile: production
```

**CRITICAL**: `workflow_dispatch: {}` must be an empty object, NOT null or empty. This enables manual triggering.

### OTA Updates

OTA updates allow deploying JavaScript/asset changes without rebuilding the native app.

#### When to Use OTA vs Native Build
- **Use OTA for**: Code changes, UI updates, bug fixes (anything in `sources/`)
- **Use Native Build for**: Native dependency changes, config changes, permission changes

#### OTA Update Commands

**Preview/Staging:**
```bash
yarn ota  # Deploys to preview branch
```

**Production:**
```bash
# iOS only
APP_ENV=production NODE_ENV=production eas update --branch production --platform ios --message "Fix description"

# Both platforms
APP_ENV=production NODE_ENV=production eas update --branch production --message "Fix description"
```

#### OTA Update Process
1. **Make code changes** in `sources/`
2. **Run typecheck**: `yarn typecheck`
3. **Commit changes**: `git add . && git commit -m "description"`
4. **Push to GitHub**: `git push origin main`
5. **Deploy OTA update**: Run appropriate OTA command above
6. **Users receive update**: Automatically on next app open

### Deployment Best Practices

1. **Always run typecheck** before deploying: `yarn typecheck`
2. **Test locally first** with `yarn ios` or `yarn web`
3. **Commit before OTA**: Always commit changes before running OTA update
4. **Use descriptive messages**: Include what was fixed/changed in update message
5. **iOS-only updates**: Use `--platform ios` when only iOS needs the update
6. **Monitor builds**: Check https://expo.dev for build/update status

### EAS Configuration

The project is configured for EAS in:
- `app.config.js` - Updates URL and project ID
- `eas.json` - Build profiles and update channels

**Current setup:**
- **Project ID**: `c92795a3-d883-41c0-b761-3effaa823810`
- **Updates URL**: `https://u.expo.dev/c92795a3-d883-41c0-b761-3effaa823810`
- **Account**: `combinedmemory`

### Troubleshooting

**Workflow fails with "Invalid workflow definition"**
→ Check that `workflow_dispatch: {}` is an empty object, not null

**OTA update requires message**
→ Always include `--message "description"` flag

**Changes not appearing in app**
→ Force close and reopen the app to fetch latest OTA update

**Build takes too long**
→ Builds can take 5-15 minutes, check status at https://expo.dev

## Changelog Management

The app includes an in-app changelog feature that displays version history to users. When making changes:

### Adding Changelog Entries

1. **Always update the latest version** in `/CHANGELOG.md` when adding new features or fixes
2. **Format**: Each version follows this structure:
   ```markdown
   ## Version [NUMBER] - YYYY-MM-DD
   - Brief description of change/feature/fix
   - Another change description
   - Keep descriptions user-friendly and concise
   ```

3. **Version numbering**: Increment the version number for each release (1, 2, 3, etc.)
4. **Date format**: Use ISO date format (YYYY-MM-DD)

### Regenerating Changelog Data

After updating CHANGELOG.md, run:
```bash
npx tsx sources/scripts/parseChangelog.ts
```

This generates `sources/changelog/changelog.json` which is used by the app.

### Best Practices

- Write changelog entries from the user's perspective
- Start each entry with a verb (Added, Fixed, Improved, Updated, Removed)
- Group related changes together
- Keep descriptions concise but informative
- Focus on what changed, not technical implementation details
- The changelog is automatically parsed during `yarn ota` and `yarn ota:production`
- Always improve and expand basic changelog descriptions to be more user-friendly and informative
- Include a brief summary paragraph before bullet points for each version explaining the theme of the update

### Example Entry

```markdown
## Version 4 - 2025-01-26
- Added dark mode support across all screens
- Fixed navigation issues on tablet devices  
- Improved app startup performance by 30%
- Updated authentication flow for better security
- Removed deprecated API endpoints
```

## Architecture Overview

### Core Technology Stack
- **React Native** with **Expo** SDK 53
- **TypeScript** with strict mode enabled
- **Unistyles** for cross-platform styling with themes and breakpoints
- **Expo Router v5** for file-based routing
- **Socket.io** for real-time WebSocket communication
- **tweetnacl** for end-to-end encryption
- **ElevenLabs Conversational AI** for voice agent functionality

### Project Structure
```
sources/
├── app/              # Expo Router screens
├── auth/             # Authentication logic (QR code based)
├── components/       # Reusable UI components
├── sync/             # Real-time sync engine with encryption
└── utils/            # Utility functions
```

### Key Architectural Patterns

1. **Authentication Flow**: QR code-based authentication using expo-camera with challenge-response mechanism
2. **Data Synchronization**: WebSocket-based real-time sync with automatic reconnection and state management
3. **Encryption**: End-to-end encryption using tweetnacl for all sensitive data
4. **State Management**: React Context for auth state, custom reducer for sync state
5. **Platform-Specific Code**: Separate implementations for web vs native when needed (see Voice Agent section)

### Voice Agent (ElevenLabs)

The app uses ElevenLabs Conversational AI for real-time voice interactions.

#### Platform-Specific Implementations

Voice features use **platform-specific files** with the `.web.tsx` naming convention:
- **Native (iOS/Android)**: `sources/realtime/RealtimeVoiceSession.tsx`
  - Uses `@elevenlabs/react-native` package
  - Agent ID: `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (line 30)

- **Web**: `sources/realtime/RealtimeVoiceSession.web.tsx`
  - Uses `@elevenlabs/react` package
  - Includes WebRTC connection type for better performance
  - Agent ID: `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (line 40)

#### Configuration

Both implementations use the same agent configuration pattern:
```typescript
await conversationInstance.startSession({
    agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde',
    dynamicVariables: {
        sessionId: config.sessionId,
        initialConversationContext: config.initialContext || ''
    },
    overrides: {
        agent: {
            language: elevenLabsLanguage
        }
    }
});
```

**Key differences:**
- Web version includes `connectionType: 'webrtc'` option (not available in React Native SDK)
- Web version requires manual microphone permission via `navigator.mediaDevices.getUserMedia()`
- Native version handles permissions automatically through `@elevenlabs/react-native`

#### Important Notes

- **Never mix LiveKit and ElevenLabs** - The project uses ElevenLabs exclusively
- **Agent IDs are hardcoded** - No environment-based switching, same ID across all environments
- **Platform-specific SDKs** - Web and native use different packages with slightly different APIs
- **Language support** - Both platforms use `getElevenLabsCodeFromPreference()` to map user language preferences to ElevenLabs language codes

#### Voice Assistant Context Management

The voice assistant (Max) receives real-time context updates about Claude Code sessions via WebSocket.

**Context Update Architecture:**
```
App Event (new message)
    ↓ WebSocket
Happy Backend → Mobile App (apiSocket)
    ↓ applyMessages()
Storage updated
    ↓ voiceHooks triggered
Context formatted → Max (ElevenLabs WebSocket)
```

**Key Files:**
- `sources/realtime/hooks/voiceHooks.ts` - Event handlers that trigger context updates
- `sources/realtime/hooks/contextFormatters.ts` - Formats messages and session info for Max
- `sources/realtime/voiceConfig.ts` - Configuration constants (MAX_HISTORY_MESSAGES = 50)

**Critical Implementation Details:**

1. **Message History Window** (`contextFormatters.ts:76-82`):
   ```typescript
   // Takes the LAST 50 messages (most recent), not the first 50
   let messagesToFormat = VOICE_CONFIG.MAX_HISTORY_MESSAGES > 0
       ? messages.slice(-VOICE_CONFIG.MAX_HISTORY_MESSAGES)  // ✅ Correct
       : messages;
   ```
   **Important:** Must use negative slice (`-50`) to get recent messages, not `slice(0, 50)` which takes oldest messages.

2. **Real-Time Event Triggers** (`voiceHooks.ts`):
   - `onSessionFocus()` - When user opens/switches threads
   - `onMessages()` - When new messages arrive
   - `onPermissionRequested()` - When Claude requests tool permission
   - `onReady()` - When Claude finishes processing
   - `onVoiceStarted()` - Initial context when voice session begins

3. **Session Tracking** (`voiceHooks.ts:28-65`):
   - `shownSessions` Set prevents duplicate full context sends
   - Cleared on voice session start/stop
   - First time a session is shown, full history is sent

4. **Agent Prompt Configuration** (`scripts/update-agent-final.json`):
   - Max's system prompt includes instructions for reading thread context
   - "So what does this tell me?" → Look at END of message history for latest message
   - Context variable: `{{threadContext}}` contains formatted session info

**Common Issues & Solutions:**

- **Issue:** Max can't see recent messages after app restart
  - **Cause:** Using `slice(0, 50)` instead of `slice(-50)` in formatHistory()
  - **Fix:** Always use negative slice to get most recent messages

- **Issue:** Max confused about "last message"
  - **Cause:** Ambiguous prompt instructions
  - **Fix:** Explicitly instruct to look at "END of message history"

**Testing Context Updates:**
1. Start voice session in a thread
2. Check console logs with `VOICE_CONFIG.ENABLE_DEBUG_LOGGING: true`
3. Verify `🎤 Voice: Reporting contextual update:` logs show recent messages
4. Test "what did Claude just say?" queries to Max

### Development Guidelines

- Use **4 spaces** for indentation
- Use **yarn** instead of npm for package management
- Path alias `@/*` maps to `./sources/*`
- TypeScript strict mode is enabled - ensure all code is properly typed
- Follow existing component patterns when creating new UI components
- Real-time sync operations are handled through SyncSocket and SyncSession classes
- Store all temporary scripts and any test outside of unit tests in sources/trash folder
- When setting screen parameters ALWAYS set them in _layout.tsx if possible this avoids layout shifts
- **Never use Alert module from React Native, always use @sources/modal/index.ts instead**
- **Always apply layout width constraints** from `@/components/layout` to full-screen ScrollViews and content containers for responsive design across device sizes
- Always run `yarn typecheck` after all changes to ensure type safety

#### Platform-Specific Code Pattern

When a feature requires different implementations for web vs native platforms:

1. **File naming convention**:
   - Native (iOS/Android): `ComponentName.tsx`
   - Web: `ComponentName.web.tsx`

2. **Metro bundler automatically selects** the correct file:
   - On web builds: `.web.tsx` takes precedence
   - On native builds: `.tsx` is used

3. **Common use cases**:
   - Different API packages (e.g., `@elevenlabs/react` vs `@elevenlabs/react-native`)
   - Platform-specific APIs (e.g., `navigator.mediaDevices` on web)
   - Performance optimizations specific to one platform

4. **Example from codebase**:
   ```
   sources/realtime/
   ├── RealtimeVoiceSession.tsx      # Native implementation
   └── RealtimeVoiceSession.web.tsx  # Web implementation
   ```

5. **Best practices**:
   - Keep platform-specific code isolated to these files
   - Share types and interfaces between implementations
   - Document key differences in comments
   - Test both platforms when making changes

### Internationalization (i18n) Guidelines

**CRITICAL: Always use the `t(...)` function for ALL user-visible strings**

#### Basic Usage
```typescript
import { t } from '@/text';

// ✅ Simple constants
t('common.cancel')              // "Cancel"
t('settings.title')             // "Settings"

// ✅ Functions with parameters
t('common.welcome', { name: 'Steve' })           // "Welcome, Steve!"
t('time.minutesAgo', { count: 5 })               // "5 minutes ago"
t('errors.fieldError', { field: 'Email', reason: 'Invalid format' })
```

#### Adding New Translations

1. **Check existing keys first** - Always check if the string already exists in the `common` object or other sections before adding new keys
2. **Think about context** - Consider the screen/component context when choosing the appropriate section (e.g., `settings.*`, `session.*`, `errors.*`)
3. **Add to ALL languages** - When adding new strings, you MUST add them to all language files in `sources/text/translations/` (currently: `en`, `ru`, `pl`, `es`)
4. **Use descriptive key names** - Use clear, hierarchical keys like `newSession.machineOffline` rather than generic names
5. **Language metadata** - All supported languages and their metadata are centralized in `sources/text/_all.ts`

#### Translation Structure
```typescript
// String constants for static text
cancel: 'Cancel',

// Functions for dynamic text with typed parameters  
welcome: ({ name }: { name: string }) => `Welcome, ${name}!`,
itemCount: ({ count }: { count: number }) => 
    count === 1 ? '1 item' : `${count} items`,
```

#### Key Sections
- `common.*` - Universal strings used across the app (buttons, actions, status)
- `settings.*` - Settings screen specific strings
- `session.*` - Session management and display
- `errors.*` - Error messages and validation
- `modals.*` - Modal dialogs and popups
- `components.*` - Component-specific strings organized by component name

#### Language Configuration

The app uses a centralized language configuration system:

- **`sources/text/_all.ts`** - Centralized language metadata including:
  - `SupportedLanguage` type definition
  - `SUPPORTED_LANGUAGES` with native names and metadata
  - Helper functions: `getLanguageNativeName()`, `getLanguageEnglishName()`
  - Language constants: `SUPPORTED_LANGUAGE_CODES`, `DEFAULT_LANGUAGE`

- **Adding new languages:**
  1. Add the language code to the `SupportedLanguage` type in `_all.ts`
  2. Add language metadata to `SUPPORTED_LANGUAGES` object
  3. Create new translation file in `sources/text/translations/[code].ts`
  4. Add import and export in `sources/text/index.ts`

#### Important Rules
- **Never hardcode strings** in JSX - always use `t('key')`
- **Dev pages exception** - Development/debug pages can skip i18n
- **Check common first** - Before adding new keys, check if a suitable translation exists in `common`
- **Context matters** - Consider where the string appears to choose the right section
- **Update all languages** - New strings must be added to every language file
- **Use centralized language names** - Import language names from `_all.ts` instead of translation keys
- **Always re-read translations** - When new strings are added, always re-read the translation files to understand the existing structure and patterns before adding new keys
- **Use translations for common strings** - Always use the translation function `t()` for any user-visible string that is translatable, especially common UI elements like buttons, labels, and messages
- **Use the i18n-translator agent** - When adding new translatable strings or verifying existing translations, use the i18n-translator agent to ensure consistency across all language files
- **Beware of technical terms** - When translating technical terms, consider:
  - Keep universally understood terms like "CLI", "API", "URL", "JSON" in their original form
  - Translate terms that have well-established equivalents in the target language
  - Use descriptive translations for complex technical concepts when direct translations don't exist
  - Maintain consistency across all technical terminology within the same language

#### i18n-Translator Agent

When working with translations, use the **i18n-translator** agent for:
- Adding new translatable strings to the application
- Verifying existing translations across all language files
- Ensuring translations are consistent and contextually appropriate
- Checking that all required languages have new strings
- Validating that translations fit the UI context (headers, buttons, multiline text)

The agent should be called whenever new user-facing text is introduced to the codebase or when translation verification is needed.

### Important Files

- `sources/sync/types.ts` - Core type definitions for the sync protocol
- `sources/sync/reducer.ts` - State management logic for sync operations
- `sources/auth/AuthContext.tsx` - Authentication state management
- `sources/app/_layout.tsx` - Root navigation structure
- `sources/realtime/RealtimeVoiceSession.tsx` - Native voice agent implementation (ElevenLabs)
- `sources/realtime/RealtimeVoiceSession.web.tsx` - Web voice agent implementation (ElevenLabs)
- `sources/realtime/types.ts` - Voice session type definitions and interfaces

### Custom Header Component

The app includes a custom header component (`sources/components/Header.tsx`) that provides consistent header rendering across platforms and integrates with React Navigation.

#### Usage with React Navigation:
```tsx
import { NavigationHeader } from '@/components/Header';

// As default for all screens in Stack navigator:
<Stack
    screenOptions={{
        header: NavigationHeader,
        // Other default options...
    }}
>

// Or for individual screens:
<Stack.Screen
    name="settings"
    options={{
        header: NavigationHeader,
        headerTitle: 'Settings',
        headerSubtitle: 'Manage your preferences', // Custom extension
        headerTintColor: '#000',
        // All standard React Navigation header options are supported
    }}
/>
```

The custom header supports all standard React Navigation header options plus:
- `headerSubtitle`: Display a subtitle below the main title
- `headerSubtitleStyle`: Style object for the subtitle text

This ensures consistent header appearance and behavior across iOS, Android, and web platforms.

## Unistyles Styling Guide

### Creating Styles

Always use `StyleSheet.create` from 'react-native-unistyles':

```typescript
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: runtime.insets.top,
        paddingHorizontal: theme.margins.md,
    },
    text: {
        color: theme.colors.typography,
        fontSize: 16,
    }
}))
```

### Using Styles in Components

For React Native components, provide styles directly:

```typescript
import React from 'react'
import { View, Text } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: runtime.insets.top,
    },
    text: {
        color: theme.colors.typography,
        fontSize: 16,
    }
}))

const MyComponent = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Hello World</Text>
        </View>
    )
}
```

For other components, use `useStyles` hook:

```typescript
import React from 'react'
import { CustomComponent } from '@/components/CustomComponent'
import { useStyles } from 'react-native-unistyles'

const MyComponent = () => {
    const { styles, theme } = useStyles(styles)
    
    return (
        <CustomComponent style={styles.container} />
    )
}
```

### Variants

Create dynamic styles with variants:

```typescript
const styles = StyleSheet.create(theme => ({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        variants: {
            color: {
                primary: {
                    backgroundColor: theme.colors.primary,
                },
                secondary: {
                    backgroundColor: theme.colors.secondary,
                },
                default: {
                    backgroundColor: theme.colors.background,
                }
            },
            size: {
                small: {
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                },
                large: {
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                }
            }
        }
    }
}))

// Usage
const { styles } = useStyles(styles, {
    button: {
        color: 'primary',
        size: 'large'
    }
})
```

### Media Queries

Use media queries for responsive design:

```typescript
import { StyleSheet, mq } from 'react-native-unistyles'

const styles = StyleSheet.create(theme => ({
    container: {
        padding: theme.margins.sm,
        backgroundColor: {
            [mq.only.width(0, 768)]: theme.colors.background,
            [mq.only.width(768)]: theme.colors.secondary,
        }
    }
}))
```

### Breakpoints

Access current breakpoint in components:

```typescript
const MyComponent = () => {
    const { breakpoint } = useStyles()
    
    const isTablet = breakpoint === 'md' || breakpoint === 'lg'
    
    return (
        <View>
            {isTablet ? <TabletLayout /> : <MobileLayout />}
        </View>
    )
}
```

### Special Component Considerations

#### Expo Image
- **Size properties** (`width`, `height`) must be set outside of Unistyles stylesheet as inline styles
- **`tintColor` property** must be set directly on the component, not in style prop
- All other styling goes through Unistyles

```typescript
import { Image } from 'expo-image'
import { StyleSheet, useStyles } from 'react-native-unistyles'

const styles = StyleSheet.create((theme) => ({
    image: {
        borderRadius: 8,
        backgroundColor: theme.colors.background, // Other styles use theme
    }
}))

const MyComponent = () => {
    const { theme } = useStyles()
    
    return (
        <Image 
            style={[{ width: 100, height: 100 }, styles.image]}  // Size as inline styles
            tintColor={theme.colors.primary}                     // tintColor goes on component
            source={{ uri: 'https://example.com/image.jpg' }}
        />
    )
}
```

### Best Practices

1. **Always use `StyleSheet.create`** from 'react-native-unistyles'
2. **Provide styles directly** to components from 'react-native' and 'react-native-reanimated' packages
3. **Use `useStyles` hook only** for other components (but try to avoid it when possible)
4. **Always use function mode** when you need theme or runtime access
5. **Use variants** for component state-based styling instead of conditional styles
6. **Leverage breakpoints** for responsive design rather than manual dimension calculations
7. **Keep styles close to components** but extract common patterns to shared stylesheets
8. **Use TypeScript** for better developer experience and type safety

## Project Scope and Priorities

- This project targets Android, iOS, and web platforms
- Web is considered a secondary platform
- Avoid web-specific implementations unless explicitly requested
- Keep dev pages without i18n, always use t(...) function to translate all strings, when adding new string add it to all languages, think about context before translating.
- Core principles: never show loading error, always just retry. Always sync main data in "sync" class. Always use invalidate sync for it. Always use Item component first and only then you should use anything else or custom ones for content. Do not ever do backward compatibility if not explicitly stated.
- Never use custom headers in navigation, almost never use Stack.Page options in individual pages. Only when you need to show something dynamic. Always show header on all screens.
- store app pages in @sources/app/(app)/
- use ItemList for most containers for UI, if it is not custom like chat one.
- Always use expo-router api, not react-navigation one.
- Always try to use "useHappyAction" from @sources/hooks/useHappyAction.ts if you need to run some async operation, do not handle errors, etc - it is handled automatically.
- Never use unistyles for expo-image, use classical one
- Always use "Avatar" for avatars
- No backward compatibliity ever
- When non-trivial hook is needed - create a dedicated one in hooks folder, add a comment explaining it's logic
- Always put styles in the very end of the component or page file
- Always wrap pages in memo
- For hotkeys use "useGlobalKeyboard", do not change it, it works only on Web
- Use "AsyncLock" class for exclusive async locks