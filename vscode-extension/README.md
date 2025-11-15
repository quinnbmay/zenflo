# ZenFlo VSCode Extension

AI-powered coding assistant with multi-provider support for Visual Studio Code.

## Features

- 🤖 **Multi-Provider AI Support**: Switch between Anthropic Claude, OpenAI GPT, or custom endpoints
- 💬 **Native Chat Integration**: Works seamlessly with VSCode's native chat interface
- 📁 **Smart File Context**: Automatically includes relevant file context in conversations
- ⚡ **Streaming Responses**: Real-time AI responses as they're generated
- 🎯 **Specialized Commands**: `/explain`, `/fix`, `/refactor`, `/test` for common tasks

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AI Provider

Open VSCode Settings (Cmd+, on Mac, Ctrl+, on Windows/Linux) and search for "ZenFlo":

#### For Anthropic Claude (Default)

```json
{
  "zenflo.provider": "anthropic",
  "zenflo.anthropic.apiKey": "your-api-key-here",
  "zenflo.anthropic.model": "claude-sonnet-4-20250514"
}
```

#### For OpenAI

```json
{
  "zenflo.provider": "openai",
  "zenflo.openai.apiKey": "your-api-key-here",
  "zenflo.openai.model": "gpt-4-turbo-preview"
}
```

#### For Custom Provider (Anthropic-compatible endpoint)

```json
{
  "zenflo.provider": "custom",
  "zenflo.custom.baseUrl": "https://your-endpoint.com",
  "zenflo.custom.apiKey": "your-api-key-here",
  "zenflo.custom.model": "your-model-name"
}
```

### 3. Build Extension

```bash
npm run compile
```

### 4. Run Extension

Press `F5` to open a new VSCode window with the extension loaded.

## Usage

1. Open the Chat panel in VSCode (View → Chat or Cmd+Shift+I)
2. Type `@zenflo` to invoke the ZenFlo assistant
3. Ask questions or use specialized commands:
   - `@zenflo /explain` - Explain selected code
   - `@zenflo /fix` - Fix issues in code
   - `@zenflo /refactor` - Refactor code for better quality
   - `@zenflo /test` - Generate tests

## File Context

ZenFlo automatically includes context from:
- Currently selected code
- Referenced files (#file)
- Referenced symbols (#symbol)

## Development

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── chat/
│   │   └── participant.ts     # Chat participant implementation
│   └── providers/
│       ├── types.ts           # Provider interfaces
│       ├── factory.ts         # Provider factory
│       ├── anthropic.ts       # Anthropic provider
│       └── openai.ts          # OpenAI provider
├── package.json               # Extension manifest
└── tsconfig.json              # TypeScript config
```

### Building

```bash
npm run compile        # Build once
npm run watch          # Build and watch for changes
```

### Testing

```bash
npm run test
```

## Architecture

### Provider System

The extension uses a provider-agnostic architecture:

1. **Provider Interface** (`AIProvider`): Common interface for all AI providers
2. **Provider Implementations**: Anthropic, OpenAI, and custom endpoint support
3. **Provider Factory**: Creates appropriate provider based on configuration

This allows easy addition of new AI providers by implementing the `AIProvider` interface.

### Chat Participant

The chat participant:
- Validates provider configuration
- Builds context from chat history and file references
- Streams responses in real-time
- Handles specialized commands

## Configuration Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `zenflo.provider` | AI provider to use | `anthropic` |
| `zenflo.anthropic.apiKey` | Anthropic API key | `""` |
| `zenflo.anthropic.model` | Anthropic model name | `claude-sonnet-4-20250514` |
| `zenflo.openai.apiKey` | OpenAI API key | `""` |
| `zenflo.openai.model` | OpenAI model name | `gpt-4-turbo-preview` |
| `zenflo.custom.baseUrl` | Custom endpoint URL | `""` |
| `zenflo.custom.apiKey` | Custom endpoint API key | `""` |
| `zenflo.custom.model` | Custom endpoint model name | `""` |
| `zenflo.fileContext.maxFiles` | Max files in context | `10` |
| `zenflo.fileContext.maxTokens` | Max tokens for file context | `50000` |

## License

MIT
