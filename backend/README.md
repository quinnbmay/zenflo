<div align="center">

<img src="../.github/zenflo-icon.png" alt="ZenFlo Server" width="128" height="128" />

# ZenFlo Server

**Secure, High-Performance Backend for AI Coding Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

[API Docs](#) • [Architecture](../docs/ARCHITECTURE.md) • [Security](#-security--privacy)

</div>

---

## 🌟 Overview

ZenFlo Server is the backbone of the ZenFlo platform - a secure, end-to-end encrypted backend that powers real-time synchronization, voice AI, and multi-device collaboration. Built with Fastify and PostgreSQL, it's designed for performance, security, and scalability.

### ✨ Key Features

- 🔐 **Zero-Knowledge Architecture** - Server cannot decrypt your data
- ⚡ **High Performance** - Fastify framework with async/await
- 🔄 **Real-Time Sync** - WebSocket-based synchronization via Socket.io
- 🎤 **Voice AI Integration** - ElevenLabs Conversational AI support
- 🔑 **Cryptographic Auth** - No passwords, only public key signatures
- 📊 **Task Management** - Zen Mode with encrypted KV storage
- 🌐 **GitHub OAuth** - Seamless GitHub account integration
- 🔔 **Push Notifications** - Expo push notifications support
- 📱 **Multi-Device** - Session management across devices
- 🐳 **Docker Ready** - Production deployment via Docker

---

## 🏗️ Architecture

### Technology Stack

- **Fastify** 5 - High-performance web framework
- **TypeScript** 5.9 - Type-safe development (strict mode)
- **PostgreSQL** 15 - Relational database
- **Prisma ORM** - Type-safe database access
- **Redis** - Pub/sub and caching via ioredis
- **Socket.io** - Real-time WebSocket connections
- **Zod** - Runtime validation
- **TweetNaCl** - Encryption/decryption
- **Docker** - Containerized deployment

### Project Structure

```
backend/
├── sources/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   └── routes/       # Fastify route handlers
│   │   ├── auth/             # Authentication logic
│   │   ├── events/           # WebSocket event handlers
│   │   ├── github/           # GitHub OAuth integration
│   │   ├── kv/               # Key-value storage (encrypted)
│   │   └── session/          # Session management
│   ├── modules/              # Reusable modules
│   │   ├── encrypt.ts        # Encryption utilities
│   │   └── github.ts         # GitHub API wrapper
│   ├── storage/              # Database layer
│   │   ├── db.ts             # Prisma client
│   │   └── uploadImage.ts    # S3/MinIO integration
│   ├── utils/                # Utility functions
│   └── main.ts               # Server entry point
├── prisma/
│   └── schema.prisma         # Database schema
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose setup
└── package.json              # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS)
- **Yarn** 1.22+
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker** (optional, recommended)

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
yarn migrate

# Generate Prisma client
yarn generate
```

### Development

```bash
# Start PostgreSQL & Redis via Docker
yarn db

# Start development server
yarn dev

# Server runs on http://localhost:3005
```

---

## 🐳 Docker Deployment

### Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL, Redis, MinIO, Server)
docker compose up -d

# View logs
docker logs zenflo-server --tail 100

# Rebuild after code changes
docker compose up -d --build zenflo-server
```

### Docker Services

- **zenflo-server** - Main API server (port 3000 → 3005)
- **zenflo-postgres** - PostgreSQL database (port 5433)
- **zenflo-redis** - Redis cache/pubsub (port 6380)
- **zenflo-minio** - S3-compatible storage (ports 9000, 9001)

### Environment Variables

See `docker-compose.yml` for configuration:

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://...
  - REDIS_URL=redis://...
  - GITHUB_CLIENT_ID=...
  - GITHUB_CLIENT_SECRET=...
  - GITHUB_REDIRECT_URL=...
```

---

## 🔐 Security & Privacy

### Zero-Knowledge Architecture

```
Client encrypts → Server stores → Client decrypts
                  (server blind)
```

- 🔒 **End-to-End Encryption** - All sensitive data encrypted before reaching server
- 🔑 **No Password Storage** - Cryptographic signatures only
- 🕵️ **Server Blindness** - Server cannot decrypt user data
- 📵 **No Analytics** - No tracking, no telemetry
- ✅ **Open Source** - Fully auditable

### Authentication Flow

1. Client generates keypair locally
2. Client requests auth challenge
3. Client signs challenge with private key
4. Server verifies signature with public key
5. Server issues session token

---

## 📡 API Endpoints

### Authentication

```
POST   /v1/auth/request              # Request QR code auth
POST   /v1/auth/response             # Complete auth (mobile)
GET    /v1/auth/check                # Check auth status
DELETE /v1/auth/revoke               # Revoke session
```

### Sessions

```
GET    /v1/sessions                  # List sessions
POST   /v1/sessions                  # Create session
GET    /v1/sessions/:id              # Get session
GET    /v1/sessions/:id/messages     # Get messages
POST   /v1/sessions/:id/messages     # Add message
DELETE /v1/sessions/:id              # Delete session
```

### GitHub Integration

```
GET    /v1/connect/github/params     # Get OAuth URL
GET    /v1/connect/github/callback   # OAuth callback
DELETE /v1/connect/github            # Disconnect GitHub
```

### Key-Value Storage

```
GET    /v1/kv/:key                   # Get value
POST   /v1/kv                        # Set value
DELETE /v1/kv/:key                   # Delete value
POST   /v1/kv/batch                  # Batch operations
```

### Account

```
GET    /v1/account/profile           # Get profile
PATCH  /v1/account/profile           # Update profile
```

---

## 🔄 WebSocket Events

### Client → Server

```typescript
// Authenticate connection
{ type: 'auth', token: 'session_token' }

// Subscribe to updates
{ type: 'subscribe', channels: ['sessions', 'messages'] }
```

### Server → Client

```typescript
// New session created
{ type: 'new-session', sessionId: '...', ... }

// New message in session
{ type: 'new-message', sessionId: '...', message: {...} }

// Profile updated
{ type: 'account-update', profile: {...} }
```

---

## 🗄️ Database Schema

### Core Tables

- **Account** - User accounts with encrypted data
- **Session** - Claude Code sessions
- **SessionMessage** - Messages within sessions
- **Machine** - Connected devices
- **GithubUser** - GitHub profile data
- **UserKVStore** - Encrypted key-value storage
- **AccessKey** - Authentication tokens
- **AccountPushToken** - Push notification tokens

### Prisma Schema

See `prisma/schema.prisma` for complete schema definition.

### Migrations

```bash
# Create migration
yarn migrate:dev --name description

# Apply migrations
yarn migrate

# Reset database
yarn migrate:reset
```

---

## 🧪 Testing

```bash
# Run tests
yarn test

# Type checking
yarn build

# Full validation
yarn build && yarn test
```

---

## 🐛 Debugging

### Logging

Server uses structured logging via Pino:

```typescript
import { log } from '@/utils/log'

log({ module: 'auth' }, 'User authenticated', { userId })
```

### Common Issues

**Database connection errors:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL
```

**Redis connection errors:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli -p 6380 ping
```

**Port already in use:**
```bash
# Kill process on port 3005
lsof -ti:3005 | xargs kill -9
```

---

## 🚀 Performance

### Optimizations

- ✅ Connection pooling (Prisma)
- ✅ Redis caching layer
- ✅ WebSocket for real-time updates
- ✅ Async/await throughout
- ✅ Database indexes on hot paths
- ✅ Gzip compression

### Monitoring

```bash
# Prometheus metrics on port 9090
curl http://localhost:9090/metrics
```

---

## 📚 Documentation

- [API Documentation](#-api-endpoints)
- [Architecture](../docs/ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Security Model](#-security--privacy)
- [Development Guide](./CLAUDE.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow code style (4 spaces, TypeScript strict)
4. Add tests for new features
5. Run `yarn build` before committing
6. Submit a pull request

### Code Style

- Use **4 spaces** for indentation
- Follow **TypeScript** strict mode
- Use **async/await** (no callbacks)
- Prefer **functional programming**
- Use **Zod** for validation
- Always add **JSDoc** comments

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

## 🙏 Acknowledgments

- Based on [Happy Server](https://github.com/slopus/happy) by slopus
- Built with [Fastify](https://www.fastify.io/)
- Database by [PostgreSQL](https://www.postgresql.org/)
- ORM by [Prisma](https://www.prisma.io/)
- Caching by [Redis](https://redis.io/)

---

<div align="center">

**Part of the ZenFlo Platform**

[Website](https://zenflo.app) • [GitHub](https://github.com/quinnbmay/zenflo) • [Support](mailto:yesreply@zenflo.app)

</div>
Test timestamp: Mon Nov 10 19:39:26 EST 2025
