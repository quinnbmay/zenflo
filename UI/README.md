<div align="center">

<img src="../.github/zenflo-icon.png" alt="ZenFlo Mobile" width="128" height="128" />

# ZenFlo Mobile

**AI-Powered Coding Assistant in Your Pocket**

[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo-54-000020)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

[Download on App Store](#) • [Get on Google Play](#) • [Documentation](./CLAUDE.md)

</div>

---

## 🌟 Overview

ZenFlo Mobile brings the power of AI-assisted coding to your iOS and Android devices. Chat with Claude Code, manage your tasks, and access your development environment anywhere with our beautiful native mobile experience.

### ✨ Key Features

- 🎤 **Voice Assistant** - Talk to Max, your AI coding companion (powered by ElevenLabs)
- 💬 **Claude Code Chat** - Direct conversations with Anthropic's Claude AI
- 🔐 **End-to-End Encrypted** - Your conversations are private, server has zero knowledge
- 🔄 **Real-Time Sync** - Seamlessly work across mobile, web, and desktop
- 📊 **Zen Mode Tasks** - Manage your TODO list with AI-powered task breakdown
- 🎨 **Beautiful UI** - Native iOS/Android design with dark/light themes
- 🌍 **Multi-Language** - Full i18n support (EN, ES, PL, RU)
- 🔌 **GitHub Integration** - Connect your GitHub account
- 📷 **QR Code Auth** - Secure authentication via camera
- 🎯 **Offline Support** - Core features work without connection

---

## 🏗️ Architecture

### Technology Stack

- **React Native** 0.81 - Cross-platform mobile framework
- **Expo SDK** 54 - Development platform and tooling
- **TypeScript** 5.9 - Type-safe development
- **Expo Router** - File-based navigation
- **Unistyles** - Cross-platform styling with themes
- **Socket.io** - Real-time WebSocket communication
- **TweetNaCl** - End-to-end encryption
- **ElevenLabs React Native** - Voice AI integration
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling
- **Zod** - Runtime validation

### Project Structure

```
UI/
├── sources/
│   ├── app/              # Expo Router pages
│   │   ├── (app)/        # Main app screens (auth-protected)
│   │   ├── zen/          # Zen voice assistant
│   │   └── _layout.tsx   # Root navigation
│   ├── auth/             # Authentication logic
│   ├── components/       # Reusable UI components
│   ├── sync/             # Real-time sync engine
│   ├── realtime/         # Voice AI implementation
│   ├── text/             # i18n translations
│   ├── theme/            # Unistyles theme configuration
│   └── utils/            # Utility functions
├── app.config.js         # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS)
- **Yarn** 1.22+
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS**: Xcode 15+ (macOS only)
- **Android**: Android Studio with SDK 34+

### Installation

```bash
# Navigate to UI directory
cd UI

# Install dependencies
yarn install

# Start development server
yarn start
```

### Running on Devices

```bash
# iOS Simulator (macOS only)
yarn ios

# iOS Physical Device
yarn ios:connected-device

# Android Emulator/Device
yarn android

# Web (for testing)
yarn web
```

### Local Development with Custom Server

```bash
# Run with local backend server
yarn start:local-server
```

This sets the server URL to `http://localhost:3005` for development.

---

## 📦 Building & Deployment

### Over-The-Air (OTA) Updates ⚡ NEW

**Automated deployment script for fast, safe OTA updates!**

For JavaScript/asset changes only (no native code):

```bash
# Deploy to preview (automated)
./deploy-ota.sh preview

# Deploy to production (automated)
./deploy-ota.sh production "Fix description"
```

**Script Features:**
- ✅ TypeScript validation
- ✅ Git status checks
- ✅ Native code detection
- ✅ Changelog parsing
- ✅ Confirmation prompts
- ✅ Color-coded output

See [OTA-QUICKSTART.md](./OTA-QUICKSTART.md) for quick reference or [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

**Manual deployment** (if needed):
```bash
yarn ota                    # Preview
yarn ota:production        # Production
```

OTA updates propagate to users within 5-10 minutes on next app open.

### Native Builds

For native dependency changes or app store submissions:

```bash
# Build for iOS (production)
eas build --platform ios --profile production

# Build for Android (production)
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
```

### App Store Submission

```bash
# Submit iOS build to App Store
yarn submit
```

---

## 🎨 Styling & Theming

ZenFlo uses **Unistyles** for cross-platform styling with theme support.

### Theme Configuration

See `sources/theme/index.ts` for theme definitions:

```typescript
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.background,
        padding: theme.margins.md,
    }
}))
```

### Responsive Design

Unistyles provides built-in breakpoints:
- `xs`: 0-480px
- `sm`: 481-768px
- `md`: 769-1024px
- `lg`: 1025px+

---

## 🌍 Internationalization

ZenFlo supports multiple languages out of the box:

### Supported Languages

- 🇺🇸 English (EN)
- 🇪🇸 Spanish (ES)
- 🇵🇱 Polish (PL)
- 🇷🇺 Russian (RU)

### Adding Translations

1. Add strings to `sources/text/translations/[lang].ts`
2. Update all language files
3. Use `t()` function in components:

```typescript
import { t } from '@/text'

// Simple translation
t('common.cancel')

// With parameters
t('common.welcome', { name: 'Quinn' })
```

---

## 🎤 Voice AI (Max Assistant)

ZenFlo includes a voice AI assistant named **Max** powered by ElevenLabs.

### Implementation

- **Native**: `sources/realtime/RealtimeVoiceSession.tsx` (uses `@elevenlabs/react-native`)
- **Web**: `sources/realtime/RealtimeVoiceSession.web.tsx` (uses `@elevenlabs/react`)

### Agent Configuration

- **Agent ID**: `agent_1001k8zw6qdvfz7v2yabcqs8zwde`
- **Model**: ElevenLabs Conversational AI
- **Language**: Dynamic (based on user preference)

### Voice Features

- 🎙️ Real-time voice conversations
- 📝 Context-aware responses
- 🔄 Session management integration
- 🎯 Task execution assistance

---

## 🔐 Authentication

ZenFlo uses **QR code-based authentication** with challenge-response:

1. User scans QR code from CLI/Desktop app
2. Mobile app sends encrypted challenge response
3. Server verifies signature and creates session
4. Devices sync via WebSocket

### Security

- No passwords stored
- Public key cryptography
- End-to-end encryption
- Zero-knowledge server

---

## 🧪 Testing

```bash
# Run tests
yarn test

# Type checking
yarn typecheck

# Full validation
yarn typecheck && yarn test
```

### Test Structure

- Unit tests: `*.spec.ts`
- Integration tests: `*.test.ts`
- E2E tests: Coming soon

---

## 📚 Documentation

- [Development Guide](./CLAUDE.md) - Complete development documentation
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment workflows (NEW!)
- [OTA Quick Start](./OTA-QUICKSTART.md) - Fast OTA deployment reference (NEW!)
- [Architecture](../docs/ARCHITECTURE.md) - Technical architecture
- [Changelog](./CHANGELOG.md) - Version history

---

## 🐛 Debugging

### Remote Logging

Enable remote logging for AI-assisted debugging:

```bash
PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=1 yarn start
```

Logs are sent to backend server for analysis.

### Common Issues

**Metro bundler cache issues:**
```bash
yarn start -c  # Clear cache
```

**iOS build issues:**
```bash
rm -rf ios && yarn prebuild  # Regenerate iOS folder
```

**Android build issues:**
```bash
cd android && ./gradlew clean
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`feature/amazing-feature`)
3. Follow code style guidelines (see [CLAUDE.md](./CLAUDE.md))
4. Add tests for new features
5. Run `yarn typecheck` before committing
6. Submit a pull request

### Code Style

- Use **4 spaces** for indentation
- Follow **TypeScript** strict mode
- Use **functional components** with hooks
- Prefer **composition** over inheritance
- Always use `t()` for user-visible strings
- Use Unistyles for all styling

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Voice by [ElevenLabs](https://elevenlabs.io/)
- AI by [Anthropic Claude](https://www.anthropic.com/)
- Icons from [Expo Vector Icons](https://icons.expo.fyi/)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.dev) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.dev)

</div>
