import * as vscode from 'vscode';
import { ZenFloChatParticipant } from './chat/participant';
import { ChatViewProvider } from './views/ChatViewProvider';
import { SessionsViewProvider } from './views/SessionsViewProvider';
import { CredentialManager } from './auth/credentials';
import { ProviderFactory } from './providers/factory';
import { SyncClient } from './sync/syncClient';

export async function activate(context: vscode.ExtensionContext) {
    console.log('ZenFlo extension is now active');

    // Initialize credential manager
    const credentialManager = new CredentialManager(context);
    ProviderFactory.setCredentialManager(credentialManager);

    // Initialize sync client
    let syncClient: SyncClient | null = null;

    // Load credentials from ZenFlo CLI
    try {
        const credentials = await credentialManager.loadCredentials();
        if (credentials) {
            console.log('ZenFlo credentials loaded successfully');
            await ProviderFactory.loadCredentials();

            // Initialize sync client (REST API only for now - WebSocket has auth issues)
            if (credentials.encryption) {
                syncClient = new SyncClient(
                    credentials.baseUrl,
                    credentials.apiKey,
                    credentials.encryption
                );
                console.log('SyncClient initialized (REST mode - WebSocket disabled)');
            } else {
                console.warn('No encryption keys found - message decryption unavailable');
            }

            // Show success notification
            vscode.window.showInformationMessage(
                'ZenFlo credentials loaded from CLI',
                'View Sessions'
            ).then(selection => {
                if (selection === 'View Sessions') {
                    vscode.commands.executeCommand('workbench.view.extension.zenflo-sidebar');
                }
            });
        } else {
            console.log('No ZenFlo credentials found, using workspace settings');
        }
    } catch (error) {
        console.error('Failed to load ZenFlo credentials:', error);
    }

    // Register chat participant
    new ZenFloChatParticipant(context);

    // Register sidebar views
    const chatViewProvider = new ChatViewProvider(context.extensionUri, syncClient);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatViewProvider
        )
    );

    // Register sessions tree view
    const sessionsProvider = new SessionsViewProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('zenflo.sessionsView', sessionsProvider)
    );

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('zenflo.refreshSessions', () => {
            sessionsProvider.refresh();
        })
    );

    // Register open session command
    context.subscriptions.push(
        vscode.commands.registerCommand('zenflo.openSession', async (sessionId: string) => {
            // Load session in chat view
            await chatViewProvider.loadSession(sessionId);
            // Reveal the chat view
            vscode.commands.executeCommand('zenflo.chatView.focus');
        })
    );

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to ZenFlo! Open the ZenFlo sidebar to get started.',
            'Open ZenFlo'
        ).then(selection => {
            if (selection === 'Open ZenFlo') {
                vscode.commands.executeCommand('workbench.view.extension.zenflo-sidebar');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export async function deactivate() {
    console.log('ZenFlo extension is now deactivated');

    // Disconnect WebSocket
    const chatViewProvider = vscode.window.activeTextEditor;
    // SyncClient will be cleaned up automatically when extension unloads
}
