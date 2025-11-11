# ZenFlo Feature Flags System

**Last Updated:** 2025-01-11
**Purpose:** Safely add experimental features that can be toggled on/off without breaking the app

---

## 📋 Current Feature Flags System

ZenFlo has a **built-in feature flag system** that allows you to:
- ✅ Add experimental features safely
- ✅ Toggle features on/off per user
- ✅ Test features without affecting production users
- ✅ Roll out features gradually
- ✅ Rollback instantly if issues arise

---

## 🎯 Existing Feature Flags

### Global Settings (Synced Across Devices)

Located in: `mobile/sources/sync/settings.ts`

Currently enabled feature flags:

1. **`experiments`** (boolean)
   - Master switch for experimental features
   - When OFF: Hides all experimental features
   - When ON: Shows experimental UI elements
   - Default: `false`

2. **`hideInactiveSessions`** (boolean)
   - Hides inactive sessions from main list
   - Default: `false`
   - UI: Settings → Features → Hide Inactive Sessions

3. **`expandTodos`** (boolean)
   - Auto-expand todo lists in messages
   - Default: `true`

4. **`viewInline`** (boolean)
   - View inline tool calls
   - Default: `false`

5. **`alwaysShowContextSize`** (boolean)
   - Always show context size in agent input
   - Default: `false`

6. **`compactSessionView`** (boolean)
   - Use compact view for active sessions
   - Default: `false`

### Local Settings (Per Device)

Located in: `mobile/sources/sync/localSettings.ts`

1. **`commandPaletteEnabled`** (boolean)
   - Web-only: Enable command palette (Cmd+K)
   - Default: `true`

2. **`markdownCopyV2`** (boolean)
   - Experimental markdown copy feature
   - Default: `false`
   - UI: Settings → Features → Markdown Copy V2

---

## 🚀 How to Add a New Feature Flag

### Step 1: Decide Feature Scope

**Global Setting** (synced across devices):
- Use for features that should be consistent everywhere
- Examples: UI preferences, behavior changes
- File: `mobile/sources/sync/settings.ts`

**Local Setting** (per device):
- Use for device-specific features
- Examples: Web-only features, platform-specific UI
- File: `mobile/sources/sync/localSettings.ts`

### Step 2: Add to Settings Schema

**For Global Setting:**

Edit `mobile/sources/sync/settings.ts`:

```typescript
export const SettingsSchema = z.object({
    // ... existing fields ...

    // Add your new feature flag
    myNewFeature: z.boolean().describe('Description of what this feature does'),
});

// Add default value
export const settingsDefaults: Settings = {
    // ... existing defaults ...
    myNewFeature: false, // Start with OFF for safety
};
```

**For Local Setting:**

Edit `mobile/sources/sync/localSettings.ts`:

```typescript
export const LocalSettingsSchema = z.object({
    // ... existing fields ...

    // Add your new local feature flag
    myLocalFeature: z.boolean().describe('Description of local feature'),
});

export const localSettingsDefaults: LocalSettings = {
    // ... existing defaults ...
    myLocalFeature: false,
};
```

### Step 3: Add Translation Strings

Edit `mobile/sources/text/translations/en.ts`:

```typescript
settingsFeatures: {
    // ... existing strings ...

    myNewFeature: 'My New Feature',
    myNewFeatureSubtitle: 'Description shown in settings UI',
    myNewFeatureEnabled: 'Feature is enabled',
    myNewFeatureDisabled: 'Feature is disabled',
}
```

**Don't forget to add translations for other languages** (es.ts, pl.ts, ru.ts, etc.)

### Step 4: Add UI Toggle in Settings

Edit `mobile/sources/app/(app)/settings/features.tsx`:

```typescript
export default function FeaturesSettingsScreen() {
    // Add hook for your feature
    const [myNewFeature, setMyNewFeature] = useSettingMutable('myNewFeature');
    // OR for local setting:
    // const [myNewFeature, setMyNewFeature] = useLocalSettingMutable('myNewFeature');

    return (
        <ItemList style={{ paddingTop: 0 }}>
            <ItemGroup
                title={t('settingsFeatures.experiments')}
                footer={t('settingsFeatures.experimentsDescription')}
            >
                {/* Add your feature toggle */}
                <Item
                    title={t('settingsFeatures.myNewFeature')}
                    subtitle={t('settingsFeatures.myNewFeatureSubtitle')}
                    icon={<Ionicons name="rocket-outline" size={29} color="#FF2D55" />}
                    rightElement={
                        <Switch
                            value={myNewFeature}
                            onValueChange={setMyNewFeature}
                        />
                    }
                    showChevron={false}
                />
            </ItemGroup>
        </ItemList>
    );
}
```

### Step 5: Use Feature Flag in Code

**Access setting anywhere in the app:**

```typescript
import { storage } from '@/sync/storage';

// Read feature flag value
const isFeatureEnabled = storage.getState().settings.myNewFeature;

if (isFeatureEnabled) {
    // Show experimental feature
} else {
    // Show standard behavior
}
```

**In React components:**

```typescript
import { useSetting } from '@/sync/storage';

function MyComponent() {
    const myNewFeature = useSetting('myNewFeature');

    return (
        <View>
            {myNewFeature && (
                <ExperimentalFeatureComponent />
            )}
            {!myNewFeature && (
                <StandardFeatureComponent />
            )}
        </View>
    );
}
```

### Step 6: Test Thoroughly

1. **Test with feature OFF** (default state)
   - Ensure app works normally
   - Feature should be completely hidden

2. **Test with feature ON**
   - Navigate to Settings → Features
   - Enable your new feature
   - Test all functionality
   - Check for crashes or errors

3. **Test toggle behavior**
   - Turn feature ON/OFF multiple times
   - Verify state persists across app restarts
   - Check sync across devices (for global settings)

---

## 🛡️ Best Practices

### DO ✅

1. **Start with feature OFF by default**
   - Safer for existing users
   - Allows controlled rollout

2. **Use descriptive names**
   - Good: `enableAdvancedMarkdownEditor`
   - Bad: `feature1`, `test`, `new`

3. **Add clear descriptions**
   - Users should understand what the toggle does
   - Include any warnings or caveats

4. **Wrap experimental code safely**
   ```typescript
   if (myFeature) {
       try {
           // Experimental code here
       } catch (error) {
           console.error('Feature error:', error);
           // Fallback to standard behavior
       }
   }
   ```

5. **Clean up old feature flags**
   - Once a feature is stable and always-on
   - Remove the flag and make it default behavior
   - Keep settings schema clean

6. **Test on all platforms**
   - iOS mobile
   - Android mobile
   - Web (if applicable)

### DON'T ❌

1. **Don't break the app when feature is OFF**
   - Feature flags should be additive only
   - Never make existing features dependent on new flags

2. **Don't use feature flags for security**
   - Don't hide sensitive features behind flags
   - Use proper authentication/authorization

3. **Don't accumulate too many flags**
   - Clean up after feature stabilizes
   - Too many flags = complex codebase

4. **Don't make breaking changes**
   - Feature flags should be non-destructive
   - Users should be able to toggle safely

---

## 📊 Platform-Specific Features

Use `Platform.OS` to show features only on specific platforms:

```typescript
{Platform.OS === 'web' && (
    <ItemGroup title="Web Features">
        <Item
            title="Command Palette"
            rightElement={
                <Switch
                    value={commandPaletteEnabled}
                    onValueChange={setCommandPaletteEnabled}
                />
            }
        />
    </ItemGroup>
)}

{(Platform.OS === 'ios' || Platform.OS === 'android') && (
    <ItemGroup title="Mobile Features">
        {/* Mobile-only features */}
    </ItemGroup>
)}
```

---

## 🔄 Feature Lifecycle

### Phase 1: Experimental (Flag ON by explicit user choice)
- Feature is new and potentially unstable
- Hidden behind feature flag (default OFF)
- Limited to users who opt-in
- Heavy testing and iteration

### Phase 2: Beta (Flag ON by default for new users)
- Feature is stable but needs broader testing
- ON by default for new users
- Existing users can opt-in
- Monitor for issues

### Phase 3: Stable (Remove flag, always ON)
- Feature is proven stable
- Remove feature flag completely
- Make it default behavior
- Clean up settings schema

---

## 📝 Example: Adding a New Experimental Editor

Let's walk through adding an experimental code editor feature:

### 1. Add to settings schema

```typescript
// mobile/sources/sync/settings.ts
export const SettingsSchema = z.object({
    // ...
    experimentalCodeEditor: z.boolean().describe('Enable new code editor with syntax highlighting'),
});

export const settingsDefaults: Settings = {
    // ...
    experimentalCodeEditor: false,
};
```

### 2. Add translations

```typescript
// mobile/sources/text/translations/en.ts
settingsFeatures: {
    experimentalCodeEditor: 'Experimental Code Editor',
    experimentalCodeEditorSubtitle: 'New editor with syntax highlighting and better performance',
}
```

### 3. Add UI toggle

```typescript
// mobile/sources/app/(app)/settings/features.tsx
const [experimentalCodeEditor, setExperimentalCodeEditor] = useSettingMutable('experimentalCodeEditor');

<Item
    title={t('settingsFeatures.experimentalCodeEditor')}
    subtitle={t('settingsFeatures.experimentalCodeEditorSubtitle')}
    icon={<Ionicons name="code-slash-outline" size={29} color="#5856D6" />}
    rightElement={
        <Switch
            value={experimentalCodeEditor}
            onValueChange={setExperimentalCodeEditor}
        />
    }
    showChevron={false}
/>
```

### 4. Use in code

```typescript
// mobile/sources/components/CodeViewer.tsx
import { useSetting } from '@/sync/storage';

export function CodeViewer({ code }: { code: string }) {
    const experimentalCodeEditor = useSetting('experimentalCodeEditor');

    if (experimentalCodeEditor) {
        return <NewSyntaxHighlightedEditor code={code} />;
    }

    return <StandardCodeEditor code={code} />;
}
```

---

## 🚨 Emergency: Disabling a Feature

If a feature causes issues:

### Quick Fix (User Side)
1. Open app
2. Go to Settings → Features
3. Toggle feature OFF
4. Restart app if needed

### Server-Side Kill Switch (Not Implemented Yet)
Future enhancement: Add server-controlled feature flags that can disable features remotely without app update.

---

## 📚 Related Files

- **Settings Schema:** `mobile/sources/sync/settings.ts`
- **Local Settings:** `mobile/sources/sync/localSettings.ts`
- **Features UI:** `mobile/sources/app/(app)/settings/features.tsx`
- **Translations:** `mobile/sources/text/translations/`
- **Storage Hooks:** `mobile/sources/sync/storage.ts`

---

## 🔗 See Also

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [mobile/CLAUDE.md](./mobile/CLAUDE.md) - Mobile-specific docs
- [webapp/CLAUDE.md](./webapp/CLAUDE.md) - Web-specific docs
