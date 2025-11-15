<div align="center">

<img src="../.github/zenflo-icon.png" alt="ZenFlo CLI" width="128" height="128" />

# ZenFlo CLI

**Control Claude Code from Your Mobile Device**

[![npm](https://img.shields.io/npm/v/zenflo?color=blue)](https://www.npmjs.com/package/zenflo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

[Website](https://zenflo.dev) • [Documentation](./CLAUDE.md) • [Report Bug](https://github.com/quinnbmay/zenflo/issues)

</div>

---

## 🌟 Overview

ZenFlo CLI is a powerful command-line wrapper for Claude Code that enables real-time session sharing between your desktop and mobile device. Code anywhere, control from anywhere.

### ✨ Key Features

- 📱 **Mobile Control** - Control Claude Code from your iOS/Android device
- 🔄 **Real-Time Sync** - Instant synchronization across all devices
- 🔐 **Zero-Knowledge Encryption** - End-to-end encrypted sessions
- 🎤 **Voice Integration** - Use voice assistant while coding
- 📊 **Task Management** - Built-in Zen Mode task tracking
- 🔔 **Push Notifications** - Get notified of Claude's actions
- 🤖 **AI Vendor Keys** - Store API keys securely in ZenFlo cloud
- 🛡️ **Permission Control** - Approve Claude's actions from mobile
- 🌐 **Open Source** - Free and fully auditable

---

## 🚀 Quick Start

### Installation

```bash
# Install globally via npm
npm install -g zenflo

# Or use npx (no installation required)
npx zenflo
```

### First Run

```bash
# Start ZenFlo
zenflo

# This will:
# 1. Start a Claude Code session
# 2. Display a QR code
# 3. Scan with your mobile app
# 4. Begin coding!
```

---

## 📋 Commands

### Core Commands

```bash
# Start interactive session (default)
zenflo

# Authentication management
zenflo auth login              # Authenticate with ZenFlo
zenflo auth logout             # Sign out
zenflo auth status             # Check authentication status

# AI Mode (Codex)
zenflo codex                   # Start Codex-enhanced coding session

# Notifications
zenflo notify "Your message"   # Send push notification to devices

# Background Daemon
zenflo daemon start            # Start background service
zenflo daemon stop             # Stop background service
zenflo daemon status           # Check daemon status

# Troubleshooting
zenflo doctor                  # Run system diagnostics
zenflo doctor --fix            # Attempt automatic fixes

# AI Vendor Integration
zenflo connect codex           # Store OpenAI API key
zenflo connect claude          # Store Anthropic API key
zenflo connect gemini          # Store Gemini API key
```

### Command Options

```bash
# General
-h, --help                     # Show help
-v, --version                  # Show version

# Session Options
-m, --model <model>            # Claude model (sonnet, opus, haiku)
-p, --permission-mode <mode>   # Permission mode (auto, default, plan)

# Advanced
--claude-env KEY=VALUE         # Set environment variable for Claude
--claude-arg ARG               # Pass argument to Claude CLI
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Server Configuration
ZENFLO_SERVER_URL=https://api.zenflo.dev           # REST API endpoint
ZENFLO_WEBSOCKET_URL=wss://api.zenflo.dev          # WebSocket endpoint (auto-derived if not set)
ZENFLO_WEBAPP_URL=https://app.zenflo.dev           # Web interface

# Local Development
ZENFLO_HOME_DIR=~/.zenflo
ZENFLO_DISABLE_CAFFEINATE=false

# Experimental Features
ZENFLO_EXPERIMENTAL=false
```

### Config File

Create `~/.zenflo/config.json` for persistent settings:

```json
{
  "defaultModel": "sonnet",
  "permissionMode": "default",
  "serverUrl": "https://api.zenflo.dev",
  "websocketUrl": "wss://api.zenflo.dev",
  "experimental": false
}
```

---

## 🔐 Authentication

### QR Code Auth

1. Run `zenflo` command
2. Scan QR code with ZenFlo mobile app
3. Approve connection on mobile
4. Start coding!

### Manual Auth

```bash
# Login manually
zenflo auth login

# Check authentication status
zenflo auth status

# Logout
zenflo auth logout
```

---

## 🎯 Permission Modes

### Auto Mode (`--permission-mode auto`)
Claude runs with minimal interruptions. Best for experienced users.

### Default Mode (`--permission-mode default`)
Balanced approach. Claude asks permission for significant actions.

### Plan Mode (`--permission-mode plan`)
Claude creates a plan and waits for approval before execution. Maximum control.

---

## 📱 Mobile Integration

### Scan & Connect

1. Start ZenFlo CLI: `zenflo`
2. Open ZenFlo mobile app
3. Tap "Connect Device"
4. Scan QR code
5. Connected! 🎉

### Mobile Features

- 📝 View Claude's messages in real-time
- ✅ Approve/deny tool permissions
- 🎤 Use voice assistant while Claude works
- 📊 Track tasks and progress
- 🔔 Receive push notifications
- 📱 Control from anywhere

---

## 🧪 Developer Mode

### Local Development

```bash
# Use local server (for development)
ZENFLO_SERVER_URL=http://localhost:3005 zenflo

# Enable debug logging
DEBUG=zenflo:* zenflo

# Run with experimental features
ZENFLO_EXPERIMENTAL=true zenflo
```

### Daemon Logs

View daemon logs for debugging:

```bash
# Logs location
~/.zenflo/logs/YYYY-MM-DD-HH-MM-SS-daemon.log

# Tail logs
tail -f ~/.zenflo/logs/*.log
```

---

## 🔧 AI Vendor Keys

Store your AI vendor API keys securely in ZenFlo cloud:

### Connect OpenAI (Codex)

```bash
zenflo connect codex
# Follow prompts to authenticate and store key
```

### Connect Anthropic (Claude)

```bash
zenflo connect claude
# Store your Anthropic API key securely
```

### Connect Google (Gemini)

```bash
zenflo connect gemini
# Store your Gemini API key securely
```

### Benefits

- 🔒 **Encrypted Storage** - Keys encrypted before storage
- 🌐 **Access Anywhere** - Use keys on any device
- 🔄 **Auto-Sync** - Keys sync across all your devices
- 🛡️ **Secure** - Zero-knowledge encryption

---

## 🐛 Troubleshooting

### Run Diagnostics

```bash
# Check for common issues
zenflo doctor

# Attempt automatic fixes
zenflo doctor --fix
```

### Common Issues

**"Claude CLI not found"**
```bash
# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# Verify installation
claude --version
```

**"Authentication failed"**
```bash
# Re-authenticate
zenflo auth logout
zenflo auth login
```

**"Connection timeout"**
```bash
# Check server status
curl https://api.zenflo.dev/health

# Use local server for development
ZENFLO_SERVER_URL=http://localhost:3005 zenflo
```

**"Port already in use"**
```bash
# Kill existing process
lsof -ti:3005 | xargs kill -9
```

---

## 📦 Requirements

### System Requirements

- **Node.js** 20+ (LTS required)
- **Claude CLI** installed and authenticated
- **Operating System:** macOS, Linux, Windows (WSL)

### Install Claude CLI

```bash
# Install official Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# Login to Claude
claude auth login
```

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────┐
│   Claude CLI    │
│  (Local Shell)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ZenFlo CLI     │
│   (Wrapper)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  ZenFlo Server  │◄────►│  Mobile/Web App  │
│ (Encrypted API) │      │ (iOS/Android/Web)│
│ api.zenflo.dev  │      │                  │
│ wss:// (sync)   │      │                  │
└─────────────────┘      └──────────────────┘
```

### Technology Stack

- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **Socket.io** - Real-time communication
- **TweetNaCl** - Encryption
- **Zod** - Runtime validation
- **Chalk** - Terminal styling

---

## 📚 Documentation

- [CLI Development Guide](./CLAUDE.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)
- [API Documentation](../server/README.md)
- [UI Guide (iOS/Android/Web)](../UI/README.md)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/quinnbmay/zenflo.git
cd zenflo/cli

# Install dependencies
yarn install

# Build TypeScript
yarn build

# Run in development
yarn dev

# Run tests
yarn test
```

### Code Style

- Use **4 spaces** for indentation
- Follow **TypeScript** strict mode
- Write **comprehensive JSDoc** comments
- Use **functional programming** patterns
- Add **unit tests** for new features

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

## 🙏 Acknowledgments

- Built on top of [Anthropic Claude](https://www.anthropic.com/)
- Inspired by [Happy](https://github.com/slopus/happy) by slopus
- Icons from [Claude Code](https://claude.ai/code)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.dev) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.dev)

⭐ Star us on GitHub if you find ZenFlo helpful!

</div>
