import * as vscode from 'vscode';
import { ProviderFactory } from '../providers/factory.js';
import { AIMessage } from '../providers/types.js';
import { SyncClient } from '../sync/syncClient.js';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zenflo.chatView';

    private _view?: vscode.WebviewView;
    private _conversationHistory: AIMessage[] = [];
    private _currentSessionId?: string;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _syncClient: SyncClient | null
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleSendMessage(data.message);
                    break;
                case 'openChat':
                    vscode.commands.executeCommand('workbench.action.chat.open');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'zenflo');
                    break;
                case 'viewDocs':
                    vscode.env.openExternal(vscode.Uri.parse('https://zenflo.dev/docs'));
                    break;
                case 'openInWeb':
                    if (data.sessionId) {
                        vscode.env.openExternal(vscode.Uri.parse(`https://app.zenflo.dev/session/${data.sessionId}`));
                    }
                    break;
            }
        });
    }

    public async loadSession(sessionId: string): Promise<void> {
        if (!this._view) {
            return;
        }

        try {
            this._currentSessionId = sessionId;

            // Check if we can decrypt messages
            if (!this._syncClient) {
                // No sync client - show info card with link to web
                const { ProviderFactory } = await import('../providers/factory.js');
                const credentials = ProviderFactory.getCredentials();

                let baseUrl: string;
                let apiKey: string;

                if (credentials) {
                    baseUrl = credentials.baseUrl;
                    apiKey = credentials.apiKey;
                } else {
                    const config = vscode.workspace.getConfiguration('zenflo');
                    baseUrl = config.get<string>('custom.baseUrl', '');
                    apiKey = config.get<string>('custom.apiKey', '');
                }

                if (!baseUrl || !apiKey) {
                    throw new Error('No credentials available');
                }

                // Fetch session info from /v1/sessions endpoint
                const response = await fetch(`${baseUrl}/v1/sessions`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sessions: ${response.status}`);
                }

                const data: any = await response.json();
                const session = data.sessions?.find((s: any) => s.id === sessionId);

                if (!session) {
                    throw new Error('Session not found');
                }

                // Clear current conversation
                this._conversationHistory = [];

                // Send session info to webview
                this._view.webview.postMessage({
                    type: 'loadSession',
                    session: {
                        id: session.id,
                        title: session.title || `Session ${session.id}`,
                        messageCount: session.messageCount || 0,
                        updatedAt: session.updatedAt
                    }
                });

                return;
            }

            // Load and decrypt messages using sync client
            console.log('Loading session messages:', sessionId);
            const messages = await this._syncClient.loadSessionMessages(sessionId);
            console.log('Loaded', messages.length, 'messages');

            // Clear current conversation
            this._conversationHistory = [];

            // Convert to AI message format
            for (const msg of messages) {
                this._conversationHistory.push({
                    role: msg.role,
                    content: msg.content
                });
            }

            // Send messages to webview
            this._view.webview.postMessage({
                type: 'loadSessionWithMessages',
                sessionId: sessionId,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    createdAt: msg.createdAt
                }))
            });

        } catch (error) {
            console.error('Error loading session:', error);
            this._view.webview.postMessage({
                type: 'error',
                content: `Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async _handleSendMessage(message: string) {
        if (!this._view) {
            return;
        }

        try {
            // Validate provider configuration
            const validation = await ProviderFactory.validateConfig();
            if (!validation.valid) {
                this._view.webview.postMessage({
                    type: 'error',
                    content: validation.error || 'Provider configuration is invalid'
                });
                return;
            }

            // Add user message to conversation history
            this._conversationHistory.push({
                role: 'user',
                content: message
            });

            // Create provider instance
            const provider = await ProviderFactory.createProvider();

            // Stream AI response
            let fullResponse = '';
            await provider.sendMessage(
                this._conversationHistory,
                (chunk) => {
                    if (!chunk.done) {
                        fullResponse += chunk.content;

                        // Stream chunks to webview for progressive display
                        this._view?.webview.postMessage({
                            type: 'streamChunk',
                            content: chunk.content
                        });
                    }
                }
            );

            // Add assistant response to conversation history
            this._conversationHistory.push({
                role: 'assistant',
                content: fullResponse
            });

            // Send complete message to webview
            this._view.webview.postMessage({
                type: 'assistantMessage',
                content: fullResponse
            });

        } catch (error) {
            console.error('Error sending message:', error);
            this._view.webview.postMessage({
                type: 'error',
                content: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // ASCII art logos for different contexts
        const smallLogo = 'ZENFLO';
        const mediumLogo = `╔═══════╗
║ZENFLO ║
╚═══════╝`;
        const largeLogo = `███████╗███████╗███╗   ██╗
╚══███╔╝██╔════╝████╗  ██║
  ███╔╝ █████╗  ██╔██╗ ██║
 ███╔╝  ██╔══╝  ██║╚██╗██║
███████╗███████╗██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝
███████╗██╗      ██████╗
██╔════╝██║     ██╔═══██╗
█████╗  ██║     ██║   ██║
██╔══╝  ██║     ██║   ██║
██║     ███████╗╚██████╔╝
╚═╝     ╚══════╝ ╚═════╝`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZenFlo Chat</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            overflow: hidden;
        }
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .chat-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 500;
        }
        .header-logo {
            font-family: monospace;
            font-size: 11px;
            line-height: 1;
            color: var(--vscode-foreground);
            font-weight: bold;
            margin: 0;
            padding: 0;
            white-space: pre;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .message {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 500;
        }
        .message-avatar {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        .message-avatar pre {
            font-family: monospace;
            font-size: 9px;
            line-height: 1;
            color: var(--vscode-foreground);
            font-weight: bold;
            margin: 0;
            padding: 0;
            white-space: pre;
        }
        .user-avatar {
            background: var(--vscode-button-background);
        }
        .assistant-avatar {
            background: var(--vscode-inputValidation-infoBorder);
        }
        .message-content {
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.6;
            background: var(--vscode-editor-background);
        }
        .user-message .message-content {
            background: var(--vscode-input-background);
        }
        .input-container {
            border-top: 1px solid var(--vscode-panel-border);
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        #messageInput {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
            min-height: 36px;
            max-height: 120px;
        }
        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        #sendButton {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
        }
        #sendButton:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .settings-link {
            font-size: 11px;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: none;
        }
        .settings-link:hover {
            text-decoration: underline;
        }
        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 32px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            margin-bottom: 16px;
        }
        .empty-state-icon pre {
            font-family: monospace;
            font-size: 8px;
            line-height: 1.2;
            color: var(--vscode-foreground);
            font-weight: bold;
            margin: 0;
            padding: 0;
            white-space: pre;
            opacity: 0.7;
        }
        .empty-state-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }
        .empty-state-text {
            font-size: 13px;
            line-height: 1.6;
        }
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            font-family: var(--vscode-editor-font-family);
        }
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }
        pre code {
            background: none;
            padding: 0;
        }
        .session-info {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin: 16px;
        }
        .session-info-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .session-info-icon pre {
            font-family: monospace;
            font-size: 6px;
            line-height: 1.2;
            color: var(--vscode-foreground);
            font-weight: bold;
            margin: 0;
            padding: 0;
            white-space: pre;
        }
        .session-info-details {
            flex: 1;
        }
        .session-info-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }
        .session-info-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .session-info-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .session-info-content p {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: var(--vscode-descriptionForeground);
        }
        .session-info-button {
            align-self: flex-start;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        .session-info-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <div class="header-title">
                <pre class="header-logo">${smallLogo}</pre>
                <span>Chat</span>
            </div>
        </div>

        <div id="messages" class="messages">
            <div class="empty-state">
                <div class="empty-state-icon">
                    <pre>${largeLogo}</pre>
                </div>
                <div class="empty-state-title">Start a conversation</div>
                <div class="empty-state-text">
                    Ask questions, explain code, or get help with debugging.<br>
                    Powered by ZenFlo AI.
                </div>
            </div>
        </div>

        <div class="input-container">
            <a class="settings-link" href="#" onclick="openSettings(); return false;">Configure Settings</a>
            <div class="input-wrapper">
                <textarea
                    id="messageInput"
                    placeholder="Ask ZenFlo anything..."
                    rows="1"
                ></textarea>
                <button id="sendButton" onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Send on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            // Clear empty state if exists
            const emptyState = messagesContainer.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }

            // Add user message
            addMessage('user', message);

            // Clear input
            messageInput.value = '';
            messageInput.style.height = 'auto';

            // Disable input while processing
            sendButton.disabled = true;
            messageInput.disabled = true;

            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });
        }

        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}-message\`;

            const avatarHtml = role === 'user'
                ? '<div class="message-avatar user-avatar">U</div>'
                : '<div class="message-avatar assistant-avatar"><pre>${mediumLogo}</pre></div>';
            const name = role === 'user' ? 'You' : 'ZenFlo';

            messageDiv.innerHTML = \`
                <div class="message-header">
                    \${avatarHtml}
                    <span>\${name}</span>
                </div>
                <div class="message-content">\${formatMessage(content)}</div>
            \`;

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function formatMessage(content) {
            // Simple markdown-like formatting
            return content
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
        }

        // Track current streaming message
        let streamingMessageDiv = null;
        let streamingContent = '';

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'streamChunk':
                    // Create new message container if this is the first chunk
                    if (!streamingMessageDiv) {
                        streamingContent = '';
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message assistant-message';

                        const avatarHtml = '<div class="message-avatar assistant-avatar"><pre>${mediumLogo}</pre></div>';
                        const name = 'ZenFlo';

                        messageDiv.innerHTML = \`
                            <div class="message-header">
                                \${avatarHtml}
                                <span>\${name}</span>
                            </div>
                            <div class="message-content"></div>
                        \`;

                        messagesContainer.appendChild(messageDiv);
                        streamingMessageDiv = messageDiv.querySelector('.message-content');
                    }

                    // Append chunk to streaming content
                    streamingContent += message.content;
                    if (streamingMessageDiv) {
                        streamingMessageDiv.innerHTML = formatMessage(streamingContent);
                    }

                    // Auto-scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    break;

                case 'assistantMessage':
                    // Finalize streaming message or add new message
                    if (streamingMessageDiv) {
                        // Message already displayed via streaming chunks
                        streamingMessageDiv = null;
                        streamingContent = '';
                    } else {
                        // No streaming - add complete message
                        addMessage('assistant', message.content);
                    }

                    // Re-enable input
                    sendButton.disabled = false;
                    messageInput.disabled = false;
                    messageInput.focus();
                    break;

                case 'error':
                    // Clear any streaming message
                    streamingMessageDiv = null;
                    streamingContent = '';

                    addMessage('assistant', 'Error: ' + message.content);
                    sendButton.disabled = false;
                    messageInput.disabled = false;
                    messageInput.focus();
                    break;

                case 'loadSession':
                    // Clear messages
                    messagesContainer.innerHTML = '';

                    // Show session info
                    const sessionInfo = document.createElement('div');
                    sessionInfo.className = 'session-info';
                    const updatedDate = new Date(message.session.updatedAt).toLocaleString();
                    sessionInfo.innerHTML = \`
                        <div class="session-info-header">
                            <div class="session-info-icon">
                                <pre>${largeLogo}</pre>
                            </div>
                            <div class="session-info-details">
                                <div class="session-info-title">\${message.session.title}</div>
                                <div class="session-info-meta">\${message.session.messageCount} messages • Last updated \${updatedDate}</div>
                            </div>
                        </div>
                        <div class="session-info-content">
                            <p>This session contains encrypted messages that can only be viewed in the ZenFlo web or mobile app.</p>
                            <button class="session-info-button" onclick="openSessionInWeb('\${message.session.id}')">
                                Open in ZenFlo Web
                            </button>
                        </div>
                    \`;
                    messagesContainer.appendChild(sessionInfo);
                    break;

                case 'loadSessionWithMessages':
                    // Clear messages
                    messagesContainer.innerHTML = '';

                    // Display all messages
                    if (message.messages && message.messages.length > 0) {
                        for (const msg of message.messages) {
                            addMessage(msg.role, msg.content);
                        }
                    } else {
                        // Show empty state
                        const emptyState = document.createElement('div');
                        emptyState.className = 'empty-state';
                        emptyState.innerHTML = \`
                            <div class="empty-state-icon">
                                <pre>${largeLogo}</pre>
                            </div>
                            <div class="empty-state-title">No messages yet</div>
                            <div class="empty-state-text">
                                Start a conversation by typing a message below.
                            </div>
                        \`;
                        messagesContainer.appendChild(emptyState);
                    }

                    // Enable input
                    sendButton.disabled = false;
                    messageInput.disabled = false;
                    messageInput.focus();
                    break;
            }
        });

        function openSessionInWeb(sessionId) {
            vscode.postMessage({
                type: 'openInWeb',
                sessionId: sessionId
            });
        }

        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }

        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
