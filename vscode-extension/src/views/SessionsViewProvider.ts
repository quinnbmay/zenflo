import * as vscode from 'vscode';

interface Session {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export class SessionsViewProvider implements vscode.TreeDataProvider<SessionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SessionItem | undefined | null | void> = new vscode.EventEmitter<SessionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SessionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SessionItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SessionItem): Promise<SessionItem[]> {
        if (element) {
            return [];
        }

        try {
            const sessions = await this.fetchSessions();
            return sessions.map(session => new SessionItem(
                session.title || `Session ${session.id}`,
                session.id,
                session.messageCount,
                new Date(session.updatedAt)
            ));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    private async fetchSessions(): Promise<Session[]> {
        // Try to get credentials from ProviderFactory first
        const { ProviderFactory } = await import('../providers/factory');
        const credentials = ProviderFactory.getCredentials();

        let baseUrl: string;
        let apiKey: string;

        if (credentials) {
            baseUrl = credentials.baseUrl;
            apiKey = credentials.apiKey;
        } else {
            // Fall back to workspace configuration
            const config = vscode.workspace.getConfiguration('zenflo');
            baseUrl = config.get<string>('custom.baseUrl', '');
            apiKey = config.get<string>('custom.apiKey', '');
        }

        if (!baseUrl || !apiKey) {
            return [];
        }

        // Use the correct REST endpoint: /v1/sessions (matches mobile app at sync.ts:553)
        const response = await fetch(`${baseUrl}/v1/sessions`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.sessions || [];
    }
}

class SessionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly sessionId: string,
        public readonly messageCount: number,
        public readonly lastActive: Date
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${label}\nMessages: ${messageCount}\nLast active: ${lastActive.toLocaleString()}`;
        this.description = `${messageCount} msgs`;
        this.contextValue = 'session';

        // Add command to open session
        this.command = {
            command: 'zenflo.openSession',
            title: 'Open Session',
            arguments: [this.sessionId]
        };
    }

    iconPath = new vscode.ThemeIcon('comment-discussion');
}
