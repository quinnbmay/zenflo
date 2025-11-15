import * as vscode from 'vscode';
import { ZenFloChatParticipant } from './chat/participant';
import { ChatViewProvider } from './views/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('ZenFlo extension is now active');

    // Register chat participant
    new ZenFloChatParticipant(context);

    // Register sidebar view
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatViewProvider
        )
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

export function deactivate() {
    console.log('ZenFlo extension is now deactivated');
}
