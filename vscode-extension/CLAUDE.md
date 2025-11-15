# ZenFlo VSCode Extension - Developer Guide

## Overview

Custom VSCode extension providing AI-powered coding assistance with multi-provider support. Built on VSCode's native chat participant API with provider-agnostic architecture.

## Architecture

### Provider System (`src/providers/`)

**Philosophy**: Provider-agnostic design allows switching between AI providers without changing core logic.

#### Key Components:

1. **`types.ts`** - Common interfaces
   - `AIProvider`: Provider contract with `sendMessage()` method
   - `AIMessage`: Standardized message format
   - `AIStreamChunk`: Streaming response format
   - `ProviderConfig`: Provider configuration

2. **`anthropic.ts`** - Anthropic Claude provider
   - Uses `@anthropic-ai/sdk`
   - Converts messages to Anthropic format (system + chat messages)
   - Streams responses via SDK streaming API

3. **`openai.ts`** - OpenAI GPT provider
   - Uses `openai` SDK
   - Direct message passthrough (OpenAI format matches our internal format)
   - Streams via OpenAI streaming API

4. **`factory.ts`** - Provider factory
   - Reads VSCode configuration
   - Creates appropriate provider instance
   - Validates API keys and configuration

### Custom Provider Support

The "custom" provider type allows users to specify:
- Custom base URL (Anthropic-compatible endpoint)
- Custom API key
- Custom model name

This enables integration with:
- Self-hosted models (vLLM, TGI, etc.)
- Alternative API providers
- Company-internal endpoints

### Chat Participant (`src/chat/participant.ts`)

**Main handler flow**:
1. Validate provider configuration
2. Build message context from:
   - Chat history
   - Current request
   - File references
3. Stream response from provider
4. Return result metadata

**File Context Handling**:
- Extracts file content from `vscode.ChatRequest.references`
- Supports both full files and text ranges
- Wraps content in XML-like tags with metadata
- Limits context based on configuration

**Command System**:
- `/explain` - Detailed code explanations
- `/fix` - Bug identification and fixes
- `/refactor` - Code quality improvements
- `/test` - Test generation

Each command gets a specialized system prompt.

## Development Workflow

### Building

```bash
npm run compile        # One-time build
npm run watch          # Continuous build
```

### Debugging

1. Open `vscode-extension` folder in VSCode
2. Press `F5` to launch Extension Development Host
3. In the new window, open Chat panel
4. Type `@zenflo` to test

### Adding New Providers

1. Create provider class implementing `AIProvider`:
   ```typescript
   export class MyProvider implements AIProvider {
       name = 'MyProvider';
       async sendMessage(messages: AIMessage[], onChunk: (chunk: AIStreamChunk) => void): Promise<void> {
           // Implementation
       }
   }
   ```

2. Add to `factory.ts`:
   ```typescript
   case 'myprovider':
       return new MyProvider(providerConfig);
   ```

3. Add configuration in `package.json`:
   ```json
   "zenflo.myprovider.apiKey": { ... },
   "zenflo.myprovider.model": { ... }
   ```

## Configuration

Settings are stored in VSCode's workspace/user settings:
- Accessed via `vscode.workspace.getConfiguration('zenflo')`
- Supports workspace overrides
- API keys stored securely in VSCode settings

## File Structure

```
src/
├── extension.ts              # Extension activation
├── chat/
│   └── participant.ts        # Chat participant implementation
└── providers/
    ├── types.ts             # Shared interfaces
    ├── factory.ts           # Provider creation
    ├── anthropic.ts         # Anthropic implementation
    └── openai.ts            # OpenAI implementation
```

## Testing

Run extension tests:
```bash
npm run test
```

Debug tests:
- Use "Extension Tests" launch configuration in VSCode

## Publishing

1. Update version in `package.json`
2. Build extension: `npm run vscode:prepublish`
3. Package: `vsce package`
4. Publish: `vsce publish`

## Best Practices

- **Provider abstraction**: Keep provider-specific logic contained in provider classes
- **Error handling**: Always catch and display user-friendly error messages
- **Configuration validation**: Validate settings before making API calls
- **Streaming**: Use streaming APIs for responsive UX
- **File context**: Be mindful of token limits when including file context

## Future Enhancements

- [ ] Token counting for file context
- [ ] Smarter file selection (relevance scoring)
- [ ] Tool calling support
- [ ] Code actions integration
- [ ] Inline completions
- [ ] Multi-file edits
