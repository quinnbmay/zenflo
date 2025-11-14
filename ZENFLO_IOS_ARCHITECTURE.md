# ZenFlo iOS App - Comprehensive Architectural Analysis

## 1. App Initialization & Bootstrap

### Entry Point and Startup Flow

The app initializes through a carefully orchestrated sequence in `/home/user/zenflo/mobile/sources/app/_layout.tsx`:

```
App Start
  ↓
Load Fonts (Expo.font)
  ↓
Initialize libsodium (TweetNaCl crypto library)
  ↓
Load Auth Credentials from SecureStore
  ↓
Sync Restore (if credentials exist)
  ↓
Setup Push Notifications & ElevenLabs TTS
  ↓
Hide Splash Screen & Render Providers
```

### Provider Hierarchy

The app wraps everything in a carefully-ordered provider hierarchy:

```typescript
PostHogProvider (optional analytics)
  ↓
SafeAreaProvider (safe area insets for notch/home bar)
  ↓
KeyboardProvider (keyboard event handling)
  ↓
GestureHandlerRootView (gesture recognition)
  ↓
AuthProvider (authentication state: isAuthenticated, credentials)
  ↓
ThemeProvider (React Navigation theme colors)
  ↓
StatusBarProvider (status bar styling)
  ↓
ModalProvider (modal/alert dialogs)
  ↓
CommandPaletteProvider (command palette search)
  ↓
RealtimeProvider (ElevenLabs voice agent setup)
  ↓
HorizontalSafeAreaWrapper (horizontal notch padding)
  ↓
SidebarNavigator (main app UI)
```

**Key Initialization Steps:**

1. **Font Loading**: IBMPlexSans, IBMPlexMono, BricolageGrotesque, and FontAwesome loaded via expo-font
2. **Crypto Setup**: Waits for `sodium.ready` before proceeding
3. **Auth Restoration**: `TokenStorage.getCredentials()` retrieves saved auth state
4. **Sync Restoration**: If authenticated, `syncRestore(credentials)` rehydrates app state from disk
5. **ElevenLabs TTS**: API key initialized from Expo config or fallback hardcoded key
6. **Failsafe**: 10-second timeout forces splash hide if init hangs

### Root Navigation

The app navigation is file-based using Expo Router:

- **Root Layout** (`_layout.tsx`): Bootstraps everything, wraps all providers
- **App Layout** (`(app)/_layout.tsx`): Defines navigation stack with screens:
  - `index` - Home/sessions list
  - `session/[id]` - Session view
  - `session/[id]/message/[messageId]` - Message details
  - `settings/*` - Settings screens (account, appearance, features)
  - `agents/*` - Agent configuration screens
  - `zen/*` - Task management screens
  - `artifacts/*` - Artifact management
  - `friends/*` - Friend management
  - `terminal/*` - Terminal connection
  - `restore/*` - Device restoration

---

## 2. Authentication System

### QR-Based Challenge-Response Authentication

ZenFlo uses **zero-password authentication** based on public key cryptography and QR codes.

#### Key Pair Generation Flow

```typescript
// 1. Generate ephemeral key pair for QR scanning
const ephemeralSecret = getRandomBytes(32)  // 256-bit random
const keypair = sodium.crypto_box_seed_keypair(ephemeralSecret)
  ↓
Returns: { publicKey, secretKey }
```

**Files Involved:**
- `/mobile/sources/auth/authQRStart.ts` - Start QR auth request
- `/mobile/sources/auth/authQRWait.ts` - Poll for QR approval
- `/mobile/sources/auth/authChallenge.ts` - Sign challenges
- `/mobile/sources/auth/tokenStorage.ts` - Persist credentials securely

#### Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ QR-Based Authentication Flow                                │
└─────────────────────────────────────────────────────────────┘

Phase 1: Key Pair Generation
├─ generateAuthKeyPair()
│  └─ crypto_box_seed_keypair(32-byte random)
│     └─ Returns: { publicKey, secretKey }

Phase 2: QR Request
├─ authQRStart(keypair)
│  └─ POST /v1/auth/account/request
│     └─ Send: { publicKey: base64(publicKey) }

Phase 3: QR Scanning (on web/CLI)
├─ Web/CLI reads QR code containing publicKey
│  └─ User authorizes device
│  └─ Server encrypts response with publicKey
│     └─ response = box(secret, publicKey)

Phase 4: Polling for Approval
├─ authQRWait(keypair, onProgress)
│  ├─ Loop: Poll /v1/auth/account/request with same publicKey
│  ├─ When state === 'authorized':
│  │  ├─ Receive: { token, response: base64(encryptedSecret) }
│  │  ├─ Decrypt: secret = decryptBox(response, secretKey)
│  │  └─ Return: { token, secret }
│  └─ Wait 1 second between polls

Phase 5: Credential Storage
├─ TokenStorage.setCredentials({ token, secret })
│  ├─ Native (iOS): Expo SecureStore (system keychain)
│  ├─ Web: localStorage
│  └─ Cached in memory for quick access

Phase 6: State Initialization
├─ AuthContext.login(token, secret)
│  ├─ Create Encryption instance from secret
│  ├─ Sync.create() - initialize sync with encryption
│  └─ setIsAuthenticated(true)
```

#### Challenge-Response Mechanism

```typescript
function authChallenge(secret: Uint8Array) {
    // Derive signing keypair from secret
    const keypair = sodium.crypto_sign_seed_keypair(secret)
    
    // Create random challenge
    const challenge = getRandomBytes(32)
    
    // Sign challenge with private key
    const signature = sodium.crypto_sign_detached(challenge, keypair.privateKey)
    
    return { challenge, signature, publicKey: keypair.publicKey }
}
```

**Security Properties:**
- **No passwords**: Uses public key cryptography
- **Device-bound**: Each device has unique ephemeral key pair
- **Server-zero-knowledge**: Server never sees decrypted secrets
- **Transfer-secure**: Secrets encrypted during network transmission

### Credential Storage

**iOS/Android:**
```typescript
await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify({
    token: string,
    secret: base64url-encoded-bytes
}))
```

**Web:**
```typescript
localStorage.setItem(AUTH_KEY, JSON.stringify({ token, secret }))
```

### Auth State Management

```typescript
// AuthContext provides global auth state
interface AuthContextType {
    isAuthenticated: boolean
    credentials: AuthCredentials | null
    login: (token: string, secret: string) => Promise<void>
    logout: () => Promise<void>
}

// Used in root _layout.tsx to conditionally render:
// - NotAuthenticated UI (login screen) if !isAuthenticated
// - Authenticated UI (main app) if isAuthenticated
```

---

## 3. Real-Time Sync Architecture

### WebSocket Connection Management

Real-time sync is handled through **Socket.io with end-to-end encryption**.

#### WebSocket Lifecycle

```
App Start
  ↓
ApiSocket.initialize(config, encryption)
  ↓
io.connect(endpoint, {
    path: '/v1/updates'
    auth: { token, clientType: 'user-scoped' }
    transports: ['websocket']
    reconnection: true
    reconnectionDelay: 1000-5000ms
    reconnectionAttempts: ∞
})
  ↓
setupEventHandlers()
  ├─ on('connect') → updateStatus('connected')
  ├─ on('disconnect') → updateStatus('disconnected')
  ├─ on('error') → updateStatus('error')
  ├─ on('update') → decrypt → apply to store
  ├─ on('activity') → accumulate → flush
  └─ on('push') → handle push notifications

  ↓
Subscribe to message and session updates
```

#### Data Flow: Message Sync

```
Backend (Happy API)
  ↓
Socket.io Event: 'update'
{
  type: 'message'
  sessionId: string
  data: NormalizedMessage[]
}
  ↓
apiSocket.onMessage('update', handler)
  ↓
Decrypt with sessionEncryption
  ↓
applyMessages() in storage
  ├─ Normalize messages
  ├─ Run through reducer
  │  ├─ Deduplicate (by localId, messageId)
  │  ├─ Process tool calls
  │  ├─ Match to permissions
  │  ├─ Handle sidechains
  │  └─ Extract events
  ├─ Update Zustand store
  └─ Trigger UI re-render via React hooks

  ↓
UI Components
(SessionView, ChatList, MessageList)
  ↓
Display to user
```

### Encrypted RPC Calls

```typescript
// Session-specific RPC with encryption
async sessionRPC<R, A>(sessionId: string, method: string, params: A): Promise<R> {
    const sessionEncryption = this.encryption.getSessionEncryption(sessionId)
    
    // Encrypt parameters
    const encryptedParams = await sessionEncryption.encryptRaw(params)
    
    // Send RPC call
    const result = await socket.emitWithAck('rpc-call', {
        method: `${sessionId}:${method}`,
        params: encryptedParams
    })
    
    // Decrypt result
    return await sessionEncryption.decryptRaw(result.result)
}
```

### Message Reducer (State Management)

The **reducer** is the core of message processing. Located in `/mobile/sources/sync/reducer/reducer.ts`:

```
Normalized Messages from API
  ↓
├─ Phase 0: Process Permissions
│  ├─ Extract permission requests from AgentState
│  ├─ Create placeholder messages for pending permissions
│  └─ Skip completed permissions if matching tool call exists
│
├─ Phase 0.5: Convert to Events
│  ├─ Check if message should become an event (user commands, etc.)
│  └─ Convert and skip further processing if matched
│
├─ Phase 1: User & Text Messages
│  ├─ Deduplicate by localId (user messages)
│  └─ Process agent text responses
│
├─ Phase 2: Tool Calls
│  ├─ Match incoming tool calls to approved permission messages
│  │  (must match tool name AND arguments)
│  ├─ Prioritize most recent matching permission
│  └─ Create new tool message if no match
│
├─ Phase 3: Tool Results
│  ├─ Update tool messages with results
│  └─ Set completion state and timestamp
│
├─ Phase 4: Sidechains
│  ├─ Identify nested conversation branches
│  ├─ Store separately in sidechain map
│  └─ Link to parent tool
│
└─ Phase 5: Agent Events
   ├─ Process mode switches
   └─ Handle other agent events

  ↓
Deduplicated, Ordered Message Array
  ↓
Update Zustand Store
  ↓
Components re-render
```

### Zustand Global Store Structure

```typescript
interface StorageState {
    // Settings & Profile
    settings: Settings
    localSettings: LocalSettings
    profile: Profile
    purchases: Purchases
    
    // Core Data
    sessions: Record<string, Session>
    sessionMessages: Record<string, SessionMessages>
    machines: Record<string, Machine>
    
    // Additional Data
    artifacts: Record<string, DecryptedArtifact>
    friends: Record<string, UserProfile>
    feedItems: FeedItem[]
    todoState: TodoState
    
    // Connection Status
    socketStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
    realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
    
    // Action Methods
    applySessions: (sessions) => void
    applyMessages: (sessionId, messages) => void
    applySettings: (settings) => void
    ...
}
```

### InvalidateSync Pattern

Data is kept fresh using a **debounced invalidation pattern**:

```typescript
// Instead of polling, components request data to be refreshed
sessionsSync.invalidate()   // Mark sessions as needing refresh
messagesSync.invalidate()   // Mark messages as needing refresh

// Internally, InvalidateSync:
// 1. Debounces multiple calls within 100ms
// 2. Calls the fetch function once
// 3. Updates store on completion
// 4. Handles errors with automatic retry
```

---

## 4. Voice AI Integration (ElevenLabs)

### Architecture Overview

ZenFlo integrates **ElevenLabs Conversational AI** (Max) for real-time voice interactions with Claude Code.

#### Platform-Specific Implementation

```
RealtimeProvider (root wrapper)
  └─ ElevenLabsProvider (from @elevenlabs/react-native)
     └─ RealtimeVoiceSession() component
        ├─ Native (iOS): Uses @elevenlabs/react-native
        │  └─ Direct Objective-C bridge for audio
        │
        └─ Web: Uses @elevenlabs/react
           └─ WebRTC connection for low-latency audio
```

**Agent Configuration:**
- **Agent ID**: `agent_1001k8zw6qdvfz7v2yabcqs8zwde` (hardcoded, same across all environments)
- **Name**: Max
- **Role**: Real-time voice assistant for Claude Code

### Voice Session Lifecycle

```
User presses "Start Voice" button
  ↓
startRealtimeSession(sessionId, initialContext)
  ├─ Stop TTS if speaking
  ├─ Get session metadata and recent messages
  ├─ Format thread context (last 15 messages, 10k chars max)
  └─ Call conversationInstance.startSession()
     ├─ agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde'
     ├─ dynamicVariables: {
     │    sessionId,
     │    sessionName,
     │    threadContext: formatted context,
     │    initialConversationContext,
     │    hasContext: boolean
     │  }
     └─ overrides: { agent: { language: userLanguage } }
  ↓
Voice session active
  ├─ User speaks
  ├─ Max processes audio
  ├─ Max sends response via WebSocket
  └─ Response appears in chat
  ↓
User presses "End Voice" or timeout
  ↓
stopRealtimeSession()
  └─ conversationInstance.endSession()
```

### Real-Time Context Updates

Voice context is managed through **hooks** that notify Max of app changes:

```typescript
// Exported from voiceHooks.ts - used throughout the app
export const voiceHooks = {
    onSessionOnline(sessionId, metadata)     // Session came online
    onSessionOffline(sessionId, metadata)    // Session went offline
    onSessionFocus(sessionId, metadata)      // User opened session
    onPermissionRequested(...)               // Claude asked for permission
    onMessages(sessionId, messages)          // New messages arrived
    onVoiceStarted(sessionId) → string       // Voice session started (return init context)
    onReady(sessionId)                       // Claude finished processing
}
```

#### Context Formatting Pipeline

```
App Event (new message, session online, etc.)
  ↓
voiceHooks.onMessages() called
  ↓
formatNewMessages() in contextFormatters.ts
  ├─ formatMessage() for each message
  │  ├─ User messages: "Quinn: <text>"
  │  ├─ Agent text: "Claude Code: <text>"
  │  └─ Tool calls: "Claude Code is using toolName (with args)"
  └─ Join with newlines
  ↓
reportContextualUpdate(formatted) sends to Max
  ├─ Check if voice session started
  ├─ Get VoiceSession instance
  └─ voice.sendContextualUpdate(update)
  ↓
Max receives context via ElevenLabs WebSocket
  └─ Updates internal context
  └─ Uses when generating next response
```

#### Message History for Context

```typescript
// formatHistory() - CRITICAL for correct voice context
export function formatHistory(sessionId: string, messages: Message[]): string {
    // ✅ CORRECT: Takes LAST 50 messages (most recent)
    let messagesToFormat = VOICE_CONFIG.MAX_HISTORY_MESSAGES > 0
        ? messages.slice(-VOICE_CONFIG.MAX_HISTORY_MESSAGES)  // Negative index!
        : messages
    
    // ❌ WRONG: messages.slice(0, 50) takes FIRST 50 (oldest)
    
    // Format each message and join
    return messagesToFormat
        .map(msg => `${speaker}: ${text}`)
        .join('\n\n')
}
```

**Important Configuration** (`voiceConfig.ts`):
```typescript
VOICE_CONFIG = {
    DISABLE_TOOL_CALLS: false              // Include tool usage info
    LIMITED_TOOL_CALLS: true               // Only name & description, not args
    DISABLE_PERMISSION_REQUESTS: false     // Include permission requests
    DISABLE_SESSION_STATUS: true           // Don't notify online/offline
    DISABLE_MESSAGES: false                // Include message updates
    DISABLE_SESSION_FOCUS: false           // Include focus notifications
    DISABLE_READY_EVENTS: false            // Include ready signals
    MAX_HISTORY_MESSAGES: 50               // Last 50 messages
    ENABLE_DEBUG_LOGGING: true             // Log all context updates
}
```

### Session Tracking

```typescript
let shownSessions = new Set<string>()
let lastFocusSession: string | null = null

// reportSession() ensures each session's full context is sent once
function reportSession(sessionId: string) {
    if (shownSessions.has(sessionId)) return  // Already shown
    shownSessions.add(sessionId)
    
    // Send full session context including all messages
    const contextUpdate = formatSessionFull(session, messages)
    reportContextualUpdate(contextUpdate)
}

// Cleared when voice session starts/stops
voiceHooks.onVoiceStarted() {
    shownSessions.clear()  // Reset for this voice session
}
```

---

## 5. Navigation & Routing

### Expo Router File-Based Structure

ZenFlo uses **Expo Router v5** with file-based routing. The file structure directly maps to routes:

```
sources/app/
├── _layout.tsx                          # Root layout (auth check, providers)
├── (app)/
│   ├── _layout.tsx                      # App stack navigator
│   ├── index.tsx                        # Home / sessions list
│   ├── session/
│   │   ├── [id]/
│   │   │   ├── _layout.tsx              # Session header/layout
│   │   │   ├── index.tsx                # Session view (chat)
│   │   │   ├── info.tsx                 # Session info screen
│   │   │   ├── files.tsx                # Files list
│   │   │   ├── file.tsx                 # File viewer
│   │   │   └── message/[messageId].tsx  # Message detail
│   │   └── recent.tsx                   # Recent sessions history
│   ├── settings/
│   │   ├── index.tsx                    # Settings home
│   │   ├── account.tsx                  # Account settings
│   │   ├── appearance.tsx               # Theme/appearance
│   │   ├── features.tsx                 # Feature flags
│   │   └── connect/
│   │       ├── claude.tsx               # Connect to Claude
│   │       └── qwen.tsx                 # Connect to Qwen
│   ├── agents/
│   │   ├── index.tsx                    # Agents list
│   │   ├── configs/
│   │   │   ├── new.tsx                  # New agent modal
│   │   │   └── [id].tsx                 # Edit agent
│   ├── artifacts/
│   │   ├── index.tsx                    # Artifacts list
│   │   ├── new.tsx                      # New artifact
│   │   ├── [id].tsx                     # View artifact
│   │   └── edit/[id].tsx                # Edit artifact
│   ├── zen/
│   │   ├── index.tsx                    # Tasks list
│   │   ├── new.tsx                      # New task modal
│   │   └── view.tsx                     # Task detail modal
│   ├── friends/
│   │   ├── index.tsx                    # Friends list
│   │   └── search.tsx                   # Add friend
│   ├── terminal/
│   │   ├── connect.tsx                  # Connect terminal
│   │   └── index.tsx                    # Terminal view
│   ├── restore/
│   │   ├── index.tsx                    # Device restoration
│   │   └── manual.tsx                   # Manual secret key entry
│   ├── changelog.tsx                    # What's new screen
│   └── new/
│       ├── index.tsx                    # New session modal
│       ├── pick/
│       │   ├── machine.tsx              # Select machine
│       │   └── path.tsx                 # Select project path
```

### Navigation Stack Definition

From `(app)/_layout.tsx`:

```typescript
<Stack
    initialRouteName='index'
    screenOptions={{
        header: shouldUseCustomHeader ? createHeader : undefined,
        headerBackTitle: t('common.back'),
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.surface }
    }}
>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
    <Stack.Screen name="session/[id]/message/[messageId]" options={{ headerShown: true }} />
    <Stack.Screen name="settings/index" options={{ headerShown: true, headerTitle: t('settings.title') }} />
    <Stack.Screen name="agents/configs/new" options={{ presentation: 'modal' }} />
    ...
</Stack>
```

### Dynamic Navigation Patterns

```typescript
// Programmatic navigation
import { useRouter } from 'expo-router'

const router = useRouter()

// Navigate to session
router.push(`/session/${sessionId}`)

// Navigate with parameters
router.push({
    pathname: '/session/[id]/message/[messageId]',
    params: { id: sessionId, messageId }
})

// Go back
router.back()

// Replace (don't add to stack)
router.replace('/home')
```

---

## 6. State Management

### Zustand Store Architecture

The app uses **Zustand** (lightweight state management) with a custom persistence layer.

#### Store Initialization

```typescript
// sources/sync/storage.ts
const storage = create<StorageState>((set, get) => ({
    // Initial state
    settings: settingsDefaults,
    sessions: {},
    sessionMessages: {},
    machines: {},
    artifacts: {},
    friends: {},
    profile: null,
    purchases: { ...defaultPurchases },
    socketStatus: 'disconnected',
    
    // Computed getters
    getActiveSessions: () => {
        return Object.values(get().sessions)
            .filter(s => s.active)
            .sort((a, b) => (b.activeAt || 0) - (a.activeAt || 0))
    },
    
    // Action methods
    applySessions: (sessions) => {
        set(state => {
            const updated = { ...state.sessions }
            sessions.forEach(s => {
                updated[s.id] = s
            })
            return { sessions: updated }
        })
    },
    
    applyMessages: (sessionId, messages) => {
        // Process through reducer
        const { messages: reduced, todos, usage } = reducer(
            get().sessionMessages[sessionId]?.reducerState || createReducer(),
            messages
        )
        
        // Update store
        set(state => ({
            sessionMessages: {
                ...state.sessionMessages,
                [sessionId]: {
                    messages: reduced,
                    messagesMap: indexMessages(reduced),
                    reducerState,
                    isLoaded: true
                }
            }
        }))
    },
    
    // ... more methods
}))
```

#### React Hook Integration

```typescript
// Components use hooks to access store
import { useSession, useSessionMessages, useSettings } from '@/sync/storage'

function MyComponent({ sessionId }: { sessionId: string }) {
    // These are live subscriptions - component re-renders when data changes
    const session = useSession(sessionId)
    const messages = useSessionMessages(sessionId)
    const settings = useSettings()
    
    return (
        <View>
            <Text>{session?.name}</Text>
            {messages.map(msg => <MessageView key={msg.id} message={msg} />)}
        </View>
    )
}
```

### Persistence Layer

Data is persisted to disk using **AsyncStorage**:

```typescript
// Persisted data
loadSettings()          // → Settings
loadLocalSettings()     // → LocalSettings
loadProfile()           // → Profile
loadPurchases()         // → Purchases
loadSessionDrafts()     // → Draft messages per session
loadSessionPermissionModes()  // → Permission mode per session

// On app close
saveSettings(settings)
saveProfile(profile)
savePurchases(purchases)
saveSessionDrafts(sessionId, draft)
```

### Local State Patterns

```typescript
// Per-session drafts (working message being composed)
const draft = storage.getState().sessionDrafts[sessionId]

// Per-session permission mode (auto-approve, ask, deny)
const mode = storage.getState().sessionPermissionModes[sessionId]

// Local settings (don't sync to backend)
const localSetting = storage.getState().localSettings.someFlag
```

---

## 7. Platform-Specific Code Patterns

### .web.tsx File Strategy

Files with `.web.tsx` suffix are used for web-specific implementations:

```
sources/realtime/
├── RealtimeVoiceSession.tsx       # Native (iOS/Android)
├── RealtimeVoiceSession.web.tsx   # Web-only
```

**How it works:**
- Metro bundler (React Native) automatically selects `.tsx` on native
- Webpack (web) automatically selects `.web.tsx`
- Fallback: If only `.tsx` exists, web uses it too

### Common Platform Differences

```typescript
// Safe area insets (notch, home bar)
import { useSafeAreaInsets } from 'react-native-safe-area-context'
const insets = useSafeAreaInsets()

// Platform-specific code
import { Platform } from 'react-native'
if (Platform.OS === 'ios') {
    // iOS-specific
} else if (Platform.OS === 'android') {
    // Android-specific
} else if (Platform.OS === 'web') {
    // Web-specific
}

// Conditional component imports
import Component from './Component.web'  // Web
// or
import Component from './Component'     // Native
```

---

## 8. Key Data Flows

### Flow 1: User Creates a New Session

```
User clicks "+" button
  ↓
Open new session flow
├─ Select machine (from list of connected machines)
├─ Select project path on that machine
└─ Set initial context/instructions (optional)
  ↓
Call sync.createSession() or CLI API
  ↓
Backend creates session record
  ├─ Generate sessionId
  ├─ Derive session-specific encryption key
  └─ Return session metadata
  ↓
Socket.io 'update' event: newSession
  ↓
applySessions([newSession])
  ├─ Update storage.sessions[sessionId]
  ├─ Create storage.sessionMessages[sessionId]
  └─ Initialize sessionEncryption[sessionId]
  ↓
Store triggers re-render
  ↓
SessionsList updated - new session appears
  ↓
Navigation: router.push(`/session/${sessionId}`)
  ↓
SessionView renders
  ├─ useSession(sessionId) subscribes to session
  ├─ useSessionMessages(sessionId) subscribes to messages
  └─ Empty state shown (no messages yet)
```

### Flow 2: Message Sent from User

```
User types message and presses send
  ↓
AgentInput.tsx
├─ Validate message (not empty)
├─ Get session permission mode
└─ Create optimistic local message
  ↓
storage.applyLocalMessage(sessionId, message)
├─ Add to sessionMessages with temporary ID
├─ Update UI immediately (optimistic update)
└─ Mark as 'pending'
  ↓
sync.sendMessage(sessionId, message, mode)
  ├─ Encrypt message with sessionEncryption
  └─ Call sessionRPC('send-message', { message, mode })
  ↓
Backend processes
  ├─ Add to session history
  ├─ Send to Claude Agent
  ├─ Stream back responses
  └─ Emit messages via socket.io
  ↓
Socket.io 'update' event: messages
  ↓
applyMessages(sessionId, newMessages)
  ├─ Run through reducer
  │  ├─ Replace optimistic message with real one
  │  ├─ Add Claude response messages
  │  └─ Process any tool calls
  ├─ Update storage
  └─ Trigger re-render
  ↓
ChatList.tsx re-renders
  ├─ Removes optimistic version
  ├─ Shows real message with messageId
  ├─ Shows Claude responses below it
  └─ Smooth scroll to bottom
  ↓
If voice session active:
  ├─ voiceHooks.onMessages(sessionId, messages)
  ├─ formatNewMessages() creates context update
  └─ voice.sendContextualUpdate(formatted)
```

### Flow 3: Message Sync from Backend

```
Backend broadcasts: session/sessionId/messages
  ↓
Socket.io EventHandler
├─ Decrypt event with sessionEncryption
└─ Normalize raw message to NormalizedMessage
  ↓
applyMessages(sessionId, [NormalizedMessage])
  ↓
Reducer processes
├─ Phase 0: Check permissions
├─ Phase 0.5: Convert to events
├─ Phase 1: User & text messages
├─ Phase 2: Tool calls
├─ Phase 3: Tool results
├─ Phase 4: Sidechains
└─ Phase 5: Events
  ↓
Output: Message[] (typed, structured)
  ↓
Update store
  └─ storage.sessionMessages[sessionId].messages = Message[]
  └─ Zustand notifies subscribers
  ↓
All components using useSessionMessages(sessionId) re-render
  ├─ ChatList
  ├─ MessageView
  └─ VoiceHooks listeners
```

### Flow 4: Voice Session Interaction

```
User taps microphone icon
  ↓
VoiceAssistantStatusBar.tsx
  ├─ Check permissions
  └─ startRealtimeSession(sessionId)
  ↓
RealtimeVoiceSession.tsx
  ├─ Stop TTS if speaking
  ├─ Load recent messages (last 15, 10k chars)
  ├─ Format context with session name & messages
  └─ conversationInstance.startSession({
       agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde',
       dynamicVariables: {
           sessionId,
           sessionName,
           threadContext: formatted,
           ...
       }
     })
  ↓
ElevenLabs WebRTC connection established
  ├─ Microphone activated
  └─ Audio stream to Max agent
  ↓
User speaks
  ↓
Max processes audio
  ├─ Generates response using dynamic context
  └─ Sends response text back via WebSocket
  ↓
ElevenLabs SDK receives response
  └─ Play TTS audio
  ↓
During conversation, app events trigger updates
  ├─ User sends message in chat
  │  └─ voiceHooks.onMessages()
  │     └─ formatNewMessages()
  │     └─ voice.sendContextualUpdate() - Max updates context
  │
  ├─ Claude requests tool permission
  │  └─ voiceHooks.onPermissionRequested()
  │     └─ formatPermissionRequest()
  │     └─ voice.sendTextMessage() - Max hears permission request
  │
  └─ New messages arrive from Claude
     └─ voiceHooks.onMessages()
     └─ Max receives context update
  ↓
User taps microphone again to end
  ↓
stopRealtimeSession()
  ├─ conversationInstance.endSession()
  ├─ Close WebRTC connection
  └─ Update realtimeStatus = 'disconnected'
```

---

## 9. Key Files Reference

### Core App Files
- **`/mobile/sources/app/_layout.tsx`** - Root entry point, provider setup, font loading, auth restoration
- **`/mobile/sources/app/(app)/_layout.tsx`** - Stack navigator definition, screen routing
- **`/mobile/sources/app/(app)/index.tsx`** - Home/sessions list screen

### Authentication
- **`/mobile/sources/auth/AuthContext.tsx`** - Auth state context, login/logout logic
- **`/mobile/sources/auth/authQRStart.ts`** - Initiate QR authentication
- **`/mobile/sources/auth/authQRWait.ts`** - Poll for QR approval
- **`/mobile/sources/auth/authChallenge.ts`** - Sign challenge with secret
- **`/mobile/sources/auth/tokenStorage.ts`** - Secure credential storage (SecureStore/localStorage)

### Sync & Real-Time
- **`/mobile/sources/sync/sync.ts`** - Main Sync class, orchestrates all data operations
- **`/mobile/sources/sync/apiSocket.ts`** - Socket.io wrapper, handles WebSocket connection
- **`/mobile/sources/sync/storage.ts`** - Zustand store, global app state
- **`/mobile/sources/sync/reducer/reducer.ts`** - Message processing engine
- **`/mobile/sources/sync/encryption/encryption.ts`** - Encryption key management

### Voice AI
- **`/mobile/sources/realtime/RealtimeVoiceSession.tsx`** - Voice session manager (native)
- **`/mobile/sources/realtime/RealtimeVoiceSession.web.tsx`** - Voice session manager (web)
- **`/mobile/sources/realtime/RealtimeProvider.tsx`** - ElevenLabs provider wrapper
- **`/mobile/sources/realtime/RealtimeSession.ts`** - Voice session registry and lifecycle
- **`/mobile/sources/realtime/hooks/voiceHooks.ts`** - Voice context event hooks
- **`/mobile/sources/realtime/hooks/contextFormatters.ts`** - Format session context for Max
- **`/mobile/sources/realtime/voiceConfig.ts`** - Voice configuration constants

### UI Components
- **`/mobile/sources/-session/SessionView.tsx`** - Main chat view component
- **`/mobile/sources/components/ChatList.tsx`** - Message list component
- **`/mobile/sources/components/AgentInput.tsx`** - Message composition input
- **`/mobile/sources/components/ChatHeaderView.tsx`** - Session header with name/status

---

## 10. Architectural Patterns & Best Practices

### Error Handling

**Pattern: useHappyAction hook**
```typescript
// Automatically handles errors and retries
const [loading, sendMessage] = useHappyAction(async () => {
    await sync.sendMessage(sessionId, message)
})

// No need to handle errors manually - Modal.alert shown automatically
return <Button onPress={sendMessage} disabled={loading} />
```

### State Mutations

**Pattern: Immutable updates**
```typescript
// ❌ Don't mutate directly
state.sessions[id].name = 'new name'

// ✅ Use spread operator
set(state => ({
    sessions: {
        ...state.sessions,
        [id]: { ...state.sessions[id], name: 'new name' }
    }
}))
```

### Deduplication

**Pattern: Multiple mechanisms**
```typescript
// 1. By localId (user messages)
const deduped = new Map()
messages.forEach(m => {
    if (m.localId) {
        deduped.set(m.localId, m)
    } else {
        deduped.set(m.id, m)
    }
})

// 2. By messageId (all messages)
const idToMsg = new Map()
messages.forEach(m => idToMsg.set(m.id, m))

// 3. By permissionId (tool permissions)
const perms = new Map()
permissions.forEach(p => perms.set(p.id, p))
```

### Encryption Pattern

**Pattern: Layered encryption keys**
```
Master Secret (32 bytes)
  ↓
Derive using HKDF:
  ├─ contentDataKey → for session/machine metadata
  ├─ sessionDataKey → for per-session messages
  ├─ machineDataKey → for per-machine data
  └─ anonID → for analytics

Each key used to initialize:
  ├─ SessionEncryption (AES256)
  ├─ MachineEncryption (AES256)
  └─ Legacy encryption fallback
```

---

## 11. Integration Points & Dependencies

### External Services
1. **Backend (Happy API)** - `https://happy.combinedmemory.com`
   - RESTful API for create/restore
   - WebSocket for real-time updates
   - Encryption: Client encrypts, server can't read

2. **ElevenLabs** - Voice AI agent (Max)
   - Agent ID: `agent_1001k8zw6qdvfz7v2yabcqs8zwde`
   - Real-time WebRTC connection
   - Dynamic context via variables

3. **PostHog** - Analytics (optional)
   - Tracks user events
   - Feature usage metrics

### Key Libraries
- **expo-router** v5 - File-based navigation
- **zustand** - State management
- **socket.io-client** - WebSocket communication
- **tweetnacl** (libsodium) - Public key cryptography
- **expo-crypto** - Random bytes, AES encryption
- **react-native-unistyles** - Cross-platform styling
- **@elevenlabs/react-native** - Voice agent (native)
- **@elevenlabs/react** - Voice agent (web)

---

## Summary

ZenFlo's iOS architecture is built on:

1. **Zero-Trust Encryption**: Client-side encryption with server zero-knowledge
2. **Real-Time Sync**: WebSocket-based live updates with message deduplication
3. **Voice-First Design**: Native voice agent integration for hands-free interaction
4. **Modular State**: Zustand store with reducer pattern for complex state
5. **File-Based Routing**: Expo Router for predictable navigation
6. **Platform Flexibility**: Shared core with platform-specific implementations

The app successfully balances:
- **Security** (end-to-end encryption)
- **Performance** (optimistic updates, lazy loading)
- **User Experience** (real-time sync, voice interaction)
- **Developer Experience** (TypeScript, clear patterns)
