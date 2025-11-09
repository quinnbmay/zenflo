# ZenFlo

AI-powered coding assistant - unified monorepo

## Structure

```
zenflo/
├── mobile/        # iOS/Android app
├── webapp/        # Web interface
├── backend/       # API server
├── zen-mcp/       # Zen Mode MCP servers
└── experimental/  # New features (voice-agents, etc.)
```

## Getting Started

```bash
# Install dependencies
yarn install

# Build all projects
yarn build:all

# Run tests
yarn test:all
```

## Workspaces

- `@zenflo/mobile` - React Native mobile app (iOS/Android)
- `@zenflo/webapp` - Web application (Railway)
- `@zenflo/backend` - Fastify API server (NAS)
- Zen MCP servers in `zen-mcp/`

## Development

Each workspace has its own README with specific instructions.

## Deployment

- **Mobile**: EAS Build & OTA updates
- **Webapp**: Railway auto-deploy on push to main
- **Backend**: Docker on NAS
