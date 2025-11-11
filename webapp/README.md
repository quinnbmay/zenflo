<div align="center">

<img src="../.github/zenflo-icon.png" alt="ZenFlo Web" width="128" height="128" />

# ZenFlo Web

**AI Coding Assistant - Anywhere, Anytime**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB)](https://reactjs.org/)
[![Expo](https://img.shields.io/badge/Expo-54-000020)](https://expo.dev/)
[![Deploy](https://img.shields.io/badge/Deploy-NAS-success)](https://app.combinedmemory.com)

[Launch App](https://app.combinedmemory.com) • [Documentation](./CLAUDE.md) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 Overview

ZenFlo Web brings the full power of AI-assisted coding to your browser. Built with React and Expo for Web, it offers a responsive, progressive web app experience that works seamlessly across all devices.

### ✨ Key Features

- 🎤 **Voice Assistant** - Browser-based voice conversations with Max (WebRTC)
- 💬 **Claude Code Chat** - Full AI coding assistance in your browser
- 🔐 **End-to-End Encrypted** - Zero-knowledge architecture for privacy
- 🔄 **Real-Time Sync** - Syncs with mobile and desktop apps
- 📊 **Zen Mode Tasks** - Web-based task management
- 🎨 **Responsive Design** - Works on desktop, tablet, and mobile browsers
- 🌍 **Multi-Language** - i18n support (EN, ES, PL, RU)
- 🔌 **GitHub Integration** - OAuth flow for GitHub connections
- 📱 **PWA Support** - Install as an app on desktop/mobile
- ⚡ **Fast Performance** - Optimized bundle with code splitting

---

## 🏗️ Architecture

### Technology Stack

- **React** 19.1 - Modern UI library
- **Expo for Web** - Cross-platform development
- **TypeScript** 5.9 - Type-safe development
- **Expo Router** - File-based routing
- **Unistyles** - Responsive styling with themes
- **Socket.io** - Real-time WebSocket communication
- **TweetNaCl** - End-to-end encryption
- **ElevenLabs React** - Voice AI (WebRTC)
- **Vite** - Fast build tooling

### Project Structure

```
webapp/
├── sources/
│   ├── app/              # Expo Router pages (web)
│   ├── auth/             # Authentication logic
│   ├── components/       # Reusable UI components
│   ├── sync/             # Real-time sync engine
│   ├── realtime/         # Voice AI (web-specific)
│   ├── text/             # i18n translations
│   └── utils/            # Utility functions
├── dist-web/             # Production build (committed)
├── app.config.js         # Expo configuration
└── package.json          # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS)
- **Yarn** 1.22+

### Installation

```bash
# Navigate to webapp directory
cd webapp

# Install dependencies
yarn install

# Start development server
yarn dev
```

### Development URLs

- **Local**: http://localhost:8081
- **Production**: https://app.combinedmemory.com

---

## 📦 Building & Deployment

### Production Build

```bash
# Build for production
yarn build

# The output goes to dist-web/ (committed to git)
```

### Deployment to NAS

**Automated Deployment Script:**

```bash
# Navigate to webapp directory
cd /Users/quinnmay/developer/zenflo/webapp

# Deploy to production (NAS with Cloudflare Tunnel)
./deploy.sh
```

**What the script does:**
1. Builds webapp locally with Expo
2. Packages build as tar.gz
3. Transfers to NAS via SCP
4. Extracts to Docker container (`zenflo-webapp`)
5. Fixes permissions
6. Purges Cloudflare cache

**Script Options:**
```bash
./deploy.sh                 # Full deployment
./deploy.sh --skip-build    # Use existing build
./deploy.sh --skip-cache    # Skip Cloudflare cache purge
./deploy.sh --help          # Show help
```

**Infrastructure:**
- Platform: NAS (nas-1) via Docker
- Container: `zenflo-webapp` (nginx:alpine)
- Access: Cloudflare Tunnel
- URL: https://app.combinedmemory.com

**Documentation:**
- Complete guide: `DEPLOY.md`
- Quick reference: `DEPLOY-QUICKREF.md`

---

## 🎨 Web-Specific Features

### Progressive Web App (PWA)

ZenFlo Web can be installed as a standalone app:

- **Desktop**: Install via browser's "Install" button
- **Mobile**: "Add to Home Screen" prompt
- **Offline**: Core features work without connection

### WebRTC Voice

Web version uses WebRTC for low-latency voice:

```typescript
// sources/realtime/RealtimeVoiceSession.web.tsx
await conversationInstance.startSession({
    agentId: 'agent_1001k8zw6qdvfz7v2yabcqs8zwde',
    connectionType: 'webrtc'  // Web-specific
})
```

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Safari 15+
- ✅ Firefox 88+
- ✅ Edge 90+
- ❌ IE11 (not supported)

---

## 🎨 Styling & Theming

### Unistyles Configuration

Web-specific responsive breakpoints:

```typescript
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        maxWidth: {
            xs: '100%',
            md: 768,
            lg: 1024,
        },
        margin: '0 auto',
    }
}))
```

### CSS Media Queries

For web-specific styles, use media queries:

```typescript
import { mq } from 'react-native-unistyles'

backgroundColor: {
    [mq.only.width(0, 768)]: theme.colors.mobile,
    [mq.only.width(768)]: theme.colors.desktop,
}
```

---

## 🌍 Internationalization

Same i18n system as mobile app:

```typescript
import { t } from '@/text'

// Usage in components
t('common.cancel')
t('settings.title')
t('common.welcome', { name: 'Quinn' })
```

**Supported Languages:**
- 🇺🇸 English
- 🇪🇸 Spanish
- 🇵🇱 Polish
- 🇷🇺 Russian

---

## 🔐 Authentication

### Web-Specific Flow

1. User visits app.combinedmemory.com
2. Shows QR code for mobile scanning
3. Mobile app scans and approves
4. Web receives auth token via WebSocket
5. Session established

### OAuth Integration

GitHub OAuth is web-friendly:

```typescript
// OAuth callback URL
https://app.combinedmemory.com?github=connected&user=quinnbmay
```

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

---

## 🐛 Debugging

### Browser DevTools

- **React DevTools**: Install extension for debugging
- **Redux DevTools**: For state inspection (if needed)
- **Network Tab**: Monitor WebSocket connections

### Common Issues

**Build errors:**
```bash
rm -rf dist-web && yarn build
```

**Cache issues:**
```bash
rm -rf .expo && yarn dev
```

**WebSocket not connecting:**
- Check server URL in config
- Verify CORS settings on backend
- Check browser console for errors

---

## 🚀 Performance Optimization

### Code Splitting

Routes are lazy-loaded automatically via Expo Router.

### Bundle Size

Check bundle size:
```bash
yarn build && ls -lh dist-web/_expo/static/js/web/
```

### Best Practices

- ✅ Use `React.lazy()` for heavy components
- ✅ Memoize expensive calculations
- ✅ Minimize re-renders with `React.memo()`
- ✅ Use proper dependency arrays
- ✅ Lazy load images and assets

---

## 📚 Documentation

- [Web-Specific Guide](./CLAUDE.md) - Web development documentation
- [Deployment Guide](./DEPLOY.md) - NAS deployment with automated script
- [Quick Deploy Reference](./DEPLOY-QUICKREF.md) - Quick commands
- [Architecture](../docs/ARCHITECTURE.md) - Technical architecture
- [Shared CLAUDE.md](../mobile/CLAUDE.md) - Shared mobile/web docs

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn typecheck`
5. Build: `yarn build`
6. Commit both source and dist-web
7. Submit a pull request

### Code Style

- Use **4 spaces** for indentation
- Follow **TypeScript** strict mode
- Use **functional components** with hooks
- Always use `t()` for user-visible strings
- Use Unistyles for styling (not raw CSS)

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Expo for Web](https://docs.expo.dev/guides/web/)
- Voice by [ElevenLabs](https://elevenlabs.io/)
- AI by [Anthropic Claude](https://www.anthropic.com/)
- Deployed on NAS with [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.app) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.app)

</div>
