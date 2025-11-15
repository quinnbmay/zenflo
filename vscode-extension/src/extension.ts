import * as vscode from 'vscode';
import { ZenFloChatParticipant } from './chat/participant';

export function activate(context: vscode.ExtensionContext) {
    console.log('ZenFlo extension is now active');

    // Register chat participant
    new ZenFloChatParticipant(context);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to ZenFlo! Configure your AI provider in Settings → ZenFlo.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'zenflo');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    console.log('ZenFlo extension is now deactivated');
}
