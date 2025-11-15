<div align="center">

<img src=".github/zenflo-icon.png" alt="ZenFlo" width="128" height="128" />

# ZenFlo

**AI-Powered Coding Platform with Voice Intelligence**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020)](https://expo.dev/)

[Website](https://zenflo.dev) • [Documentation](./docs) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 What is ZenFlo?

ZenFlo is a next-generation AI-powered coding platform that combines the power of Claude Code with intelligent voice assistance, real-time collaboration, and seamless multi-device synchronization. Work smarter, not harder, with an AI assistant that understands your workflow.

### ✨ Key Features

- 🎤 **Voice-Powered AI** - Natural conversations with Max, your AI coding assistant via ElevenLabs
- 💬 **Claude Code Integration** - Direct access to Anthropic's Claude for code generation and analysis
- 🔐 **End-to-End Encryption** - Your code and conversations stay private with zero-knowledge architecture
- 🔄 **Real-Time Sync** - Seamlessly work across mobile, web, and desktop
- 📱 **Multi-Platform** - Native iOS app, web interface, and desktop support
- 🎨 **Beautiful UI** - Modern, responsive design with dark/light themes
- 🌍 **Internationalized** - Full i18n support (English, Spanish, Polish, Russian)
- 🔌 **GitHub Integration** - Connect your GitHub account for enhanced workflows
- 📊 **Task Management** - Built-in Zen Mode task tracking synced across devices

---

## 📦 Project Structure

```
zenflo/
├── 📱 mobile/         # React Native mobile app (iOS/Android)
├── 🌐 webapp/         # Next.js web application
├── ⚙️  backend/        # Fastify API server
├── 🔧 zen-mcp/        # Zen Mode MCP servers for task management
├── 🧪 experimental/   # Experimental features and prototypes
└── 📚 docs/           # Documentation
```

### Monorepo Structure

ZenFlo uses **Yarn Workspaces** for unified dependency management:

- **`@zenflo/mobile`** - Cross-platform mobile app (React Native + Expo)
- **`@zenflo/webapp`** - Web interface (Next.js + React)
- **`@zenflo/backend`** - API server (Fastify + PostgreSQL)
- **Zen MCP** - Task management servers with WebSocket sync

---

## 🚀 Quick Start

### Using the CLI (Recommended)

The easiest way to use ZenFlo is via the npm package:

```bash
# Install globally
npm install -g zenflo

# Or run with npx (no installation)
npx zenflo
```

**CLI Repository:** https://github.com/combinedmemory/zenflo
**Current Version:** 0.11.6 (updated 2025-11-10)

For publishing updates to the npm package, see [NPM_PUBLISHING.md](./NPM_PUBLISHING.md).

---

### Development Setup

**Prerequisites:**
- **Node.js** 20+ (LTS)
- **Yarn** 1.22+
- **Docker** (for backend development)
- **Expo CLI** (for mobile development)
- **PostgreSQL** 15+ (or use Docker)

**Installation:**

```bash
# Clone this repository (mobile/web app)
git clone https://github.com/quinnbmay/zenflo.git
cd zenflo

# Install dependencies (all workspaces)
yarn install

# Build all projects
yarn build:all

# Run tests
yarn test:all
```

### Running Individual Projects

Each workspace can be run independently:

```bash
# Mobile app (iOS/Android)
cd mobile && yarn start

# Web app
cd webapp && yarn dev

# Backend server
cd backend && yarn dev
```

For detailed instructions, see each project's README:
- 📱 [Mobile README](./mobile/README.md)
- 🌐 [Webapp README](./webapp/README.md)
- ⚙️ [Backend README](./backend/README.md)

---

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **React Native** 0.81 with Expo SDK 54
- **TypeScript** 5.9 (strict mode)
- **Unistyles** for cross-platform styling
- **Expo Router** for file-based navigation
- **Socket.io** for real-time sync
- **TweetNaCl** for encryption

#### Backend
- **Fastify** 5 - High-performance web framework
- **PostgreSQL** 15 with Prisma ORM
- **Redis** for pub/sub and caching
- **Socket.io** for WebSocket connections
- **Zod** for validation

#### Voice AI
- **ElevenLabs Conversational AI** - Real-time voice assistant
- **OpenAI Realtime API** - Voice processing
- **WebRTC** for low-latency audio (web)

### Deployment

- **Mobile**: EAS Build (native) + OTA Updates (JS/assets)
- **Webapp**: Railway auto-deploy (push to `main`)
- **Backend**: Docker on NAS (self-hosted)
- **Database**: PostgreSQL on Railway

---

## 🔐 Security & Privacy

ZenFlo implements **zero-knowledge architecture**:

- 🔒 **End-to-End Encryption** - All messages encrypted before leaving your device
- 🔑 **No Password Storage** - Cryptographic auth using public key signatures
- 🕵️ **Zero Server Knowledge** - Server cannot decrypt your data
- 📵 **No Analytics** - No tracking, no telemetry, no data mining
- ✅ **Open Source** - Fully auditable codebase

---

## 🛠️ Development

### Commands

```bash
# Install dependencies
yarn install

# Type checking
yarn typecheck

# Build all workspaces
yarn build:all

# Run tests
yarn test:all

# Format code
yarn format

# Lint code
yarn lint
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## 📖 Documentation

- [Mobile App Guide](./mobile/README.md)
- [Web App Guide](./webapp/README.md)
- [Backend API](./backend/README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [NPM Publishing Guide](./NPM_PUBLISHING.md) - How to update the `zenflo` npm package
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built on top of [Happy](https://github.com/slopus/happy) by slopus
- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Voice AI by [ElevenLabs](https://elevenlabs.io/)
- Infrastructure by [Railway](https://railway.app/)

---

## 📞 Contact & Support

- **Website**: [zenflo.dev](https://zenflo.dev)
- **Email**: yesreply@zenflo.dev
- **GitHub Issues**: [Report a bug](https://github.com/quinnbmay/zenflo/issues)

---

<div align="center">

**Made with ❤️ by Quinn May**

⭐ Star us on GitHub if you find ZenFlo helpful!

</div>
