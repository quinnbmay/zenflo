import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ZenFloCredentials {
    baseUrl: string;
    apiKey: string;
    model: string;
    encryption?: {
        publicKey: string;
        machineKey: string;
    };
}

export class CredentialManager {
    private static readonly STORAGE_KEY = 'zenflo.credentials';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async loadCredentials(): Promise<ZenFloCredentials | null> {
        // Always load fresh from CLI to ensure correct format
        const cliCredentials = await this.loadFromCLI();
        if (cliCredentials) {
            console.log('Loaded credentials from CLI - token length:', cliCredentials.apiKey?.length);
            // Store for future use
            await this.storeCredentials(cliCredentials);
            return cliCredentials;
        }

        // Fall back to stored credentials
        const stored = await this.context.secrets.get(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                console.log('Loaded credentials from storage - token length:', parsed.apiKey?.length);
                return parsed;
            } catch (error) {
                console.error('Failed to parse stored credentials:', error);
            }
        }

        return null;
    }

    private async loadFromCLI(): Promise<ZenFloCredentials | null> {
        try {
            // Try reading access.key file from ~/.zenflo
            const accessKeyPath = path.join(os.homedir(), '.zenflo', 'access.key');
            if (fs.existsSync(accessKeyPath)) {
                const accessKeyContent = fs.readFileSync(accessKeyPath, 'utf-8').trim();
                console.log('Read access.key file, length:', accessKeyContent.length);

                const accessKeyData = JSON.parse(accessKeyContent);
                console.log('Parsed access.key, has token:', !!accessKeyData.token);

                // Extract token and encryption keys from access.key JSON
                if (accessKeyData.token && typeof accessKeyData.token === 'string') {
                    console.log('Extracted token from access.key, length:', accessKeyData.token.length);

                    const credentials: ZenFloCredentials = {
                        baseUrl: 'https://zenflo.combinedmemory.com',
                        apiKey: accessKeyData.token,
                        model: 'claude-sonnet-4-20250514'
                    };

                    // Include encryption keys if available
                    if (accessKeyData.encryption?.publicKey && accessKeyData.encryption?.machineKey) {
                        credentials.encryption = {
                            publicKey: accessKeyData.encryption.publicKey,
                            machineKey: accessKeyData.encryption.machineKey
                        };
                        console.log('Loaded encryption keys from access.key');
                    }

                    return credentials;
                } else {
                    console.error('Token field is not a string:', typeof accessKeyData.token);
                }
            }

            // Fall back to settings.json if available
            const settingsPath = path.join(os.homedir(), '.zenflo', 'settings.json');
            if (fs.existsSync(settingsPath)) {
                const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
                const settings = JSON.parse(settingsContent);

                // Extract credentials from settings
                if (settings.auth && settings.auth.token) {
                    return {
                        baseUrl: settings.backend?.url || 'https://zenflo.combinedmemory.com',
                        apiKey: settings.auth.token,
                        model: settings.model || 'claude-sonnet-4-20250514'
                    };
                }
            }
        } catch (error) {
            console.error('Failed to load credentials from CLI:', error);
        }

        return null;
    }

    async storeCredentials(credentials: ZenFloCredentials): Promise<void> {
        try {
            // Validate credentials before storing
            if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
                console.error('Invalid credentials - apiKey must be a string:', typeof credentials.apiKey);
                return;
            }

            const serialized = JSON.stringify(credentials);
            console.log('Storing credentials, serialized length:', serialized.length);
            console.log('Storing credentials, apiKey length:', credentials.apiKey.length);

            await this.context.secrets.store(
                this.STORAGE_KEY,
                serialized
            );
        } catch (error) {
            console.error('Failed to store credentials:', error);
        }
    }

    async clearCredentials(): Promise<void> {
        try {
            await this.context.secrets.delete(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear credentials:', error);
        }
    }

    async getCredentials(): Promise<ZenFloCredentials | null> {
        const stored = await this.context.secrets.get(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse stored credentials:', error);
            }
        }
        return null;
    }
}
