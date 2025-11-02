# Combined Memory Coder

**iOS App for Combined Memory AI Platform**

Custom internal iOS application for accessing the Combined Memory AI platform with end-to-end encryption and voice capabilities.

## Overview

Combined Memory Coder is a production iOS app built for internal use, providing mobile access to the Combined Memory AI ecosystem including LibreChat, Claude Code integration, and voice-enabled AI interactions.

## Features

- 📱 **iOS Only** - Optimized production app for iPhone and iPad
- 🔐 **End-to-End Encrypted** - Secure communications with Combined Memory backend
- 🎤 **Voice Conversations** - AI voice interactions via LiveKit integration
- 🔄 **Real-time Sync** - Connected to Combined Memory services on Railway
- 🎨 **Q Branding** - Custom Quinn Code branding throughout

## Configuration

- **App Name**: Combined Memory Coder
- **Bundle ID**: com.combinedmemory.coder
- **Platform**: iOS only (iPhone and iPad)
- **Environment**: Production only (internal use)

## Tech Stack

- React Native with Expo
- TypeScript
- Unistyles for theming
- LiveKit for voice
- End-to-end encryption
- MongoDB backend on Railway

## Connected Services

- **LibreChat Backend**: chat.combinedmemory.com
- **MongoDB**: Railway hosted database
- **Railway Deployment**: Automatic deployment via git push
- **LiveKit Voice**: Real-time voice AI interactions

## Building

This is a production iOS app for internal use only. Build via Expo EAS:

```bash
# Build for iOS
npx eas-cli build --platform ios --profile production
```

## Web Export

The app also supports web export for testing:

```bash
npx expo export --platform web
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Note**: This is a customized fork for internal use by Quinn May at Combined Memory. Original project: [Happy Coder](https://github.com/slopus/happy)
