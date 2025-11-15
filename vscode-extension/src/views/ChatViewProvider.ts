import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'zenflo.chatView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

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
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'openChat':
                    vscode.commands.executeCommand('workbench.action.chat.open');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'zenflo');
                    break;
                case 'viewDocs':
                    vscode.env.openExternal(vscode.Uri.parse('https://zenflo.dev/docs'));
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZenFlo Chat</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
        }
        .container {
            padding: 20px;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        h1 {
            font-size: 18px;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo {
            width: 32px;
            height: 32px;
            border-radius: 6px;
        }
        .info {
            padding: 15px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            margin-bottom: 15px;
        }
        .info p {
            margin: 0 0 10px 0;
            font-size: 13px;
            line-height: 1.6;
        }
        .info p:last-child {
            margin-bottom: 0;
        }
        .actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            text-align: left;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .sessions {
            margin-top: 20px;
            flex: 1;
            overflow-y: auto;
        }
        .session {
            padding: 12px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            margin-bottom: 10px;
            cursor: pointer;
        }
        .session:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .session-title {
            font-weight: 500;
            margin-bottom: 4px;
        }
        .session-time {
            font-size: 11px;
            opacity: 0.7;
        }
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <span>🤖</span>
            <span>ZenFlo AI</span>
        </h1>

        <div class="info">
            <p><strong>Multi-provider AI coding assistant</strong></p>
            <p>Switch between Claude, GPT, and custom endpoints.</p>
            <p>Use <code>@zenflo</code> in the chat to get started!</p>
        </div>

        <div class="actions">
            <button onclick="openChat()">💬 Open Chat</button>
            <button onclick="openSettings()">⚙️ Configure Providers</button>
            <button onclick="viewDocs()">📖 Documentation</button>
        </div>

        <div class="sessions">
            <h2 style="font-size: 14px; margin-bottom: 12px;">Quick Actions</h2>
            <div class="session" onclick="openChat()">
                <div class="session-title">Start New Chat</div>
                <div class="session-time">Use @zenflo to begin</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openChat() {
            vscode.postMessage({ type: 'openChat' });
        }

        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }

        function viewDocs() {
            vscode.postMessage({ type: 'viewDocs' });
        }
    </script>
</body>
</html>`;
    }
}
