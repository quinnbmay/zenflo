import * as vscode from 'vscode';
import { AIProvider, ProviderConfig } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { CredentialManager, ZenFloCredentials } from '../auth/credentials';

export class ProviderFactory {
    private static credentialManager: CredentialManager | null = null;
    private static cachedCredentials: ZenFloCredentials | null = null;

    static setCredentialManager(manager: CredentialManager) {
        this.credentialManager = manager;
    }

    static async loadCredentials(): Promise<void> {
        if (this.credentialManager) {
            this.cachedCredentials = await this.credentialManager.getCredentials();
        }
    }

    static async createProvider(): Promise<AIProvider> {
        // Try to use stored ZenFlo credentials first
        if (this.cachedCredentials) {
            const providerConfig: ProviderConfig = {
                type: 'custom',
                apiKey: this.cachedCredentials.apiKey,
                model: this.cachedCredentials.model,
                baseUrl: this.cachedCredentials.baseUrl
            };
            return new AnthropicProvider(providerConfig);
        }

        // Fall back to workspace configuration
        const config = vscode.workspace.getConfiguration('zenflo');
        const providerType = config.get<string>('provider', 'anthropic');

        const providerConfig: ProviderConfig = {
            type: providerType as any,
            apiKey: '',
            model: ''
        };

        switch (providerType) {
            case 'anthropic':
                providerConfig.apiKey = config.get<string>('anthropic.apiKey', '');
                providerConfig.model = config.get<string>('anthropic.model', 'claude-sonnet-4-20250514');
                return new AnthropicProvider(providerConfig);

            case 'openai':
                providerConfig.apiKey = config.get<string>('openai.apiKey', '');
                providerConfig.model = config.get<string>('openai.model', 'gpt-4-turbo-preview');
                return new OpenAIProvider(providerConfig);

            case 'custom':
                providerConfig.apiKey = config.get<string>('custom.apiKey', '');
                providerConfig.model = config.get<string>('custom.model', '');
                providerConfig.baseUrl = config.get<string>('custom.baseUrl', '');
                // Custom provider uses Anthropic SDK with custom base URL
                return new AnthropicProvider(providerConfig);

            default:
                throw new Error(`Unknown provider type: ${providerType}`);
        }
    }

    static async validateConfig(): Promise<{ valid: boolean; error?: string }> {
        // Check stored credentials first
        if (this.cachedCredentials) {
            return { valid: true };
        }

        // Fall back to workspace configuration
        const config = vscode.workspace.getConfiguration('zenflo');
        const providerType = config.get<string>('provider', 'anthropic');

        switch (providerType) {
            case 'anthropic':
                const anthropicKey = config.get<string>('anthropic.apiKey', '');
                if (!anthropicKey) {
                    return { valid: false, error: 'Anthropic API key is not set. Please configure it in settings.' };
                }
                break;

            case 'openai':
                const openaiKey = config.get<string>('openai.apiKey', '');
                if (!openaiKey) {
                    return { valid: false, error: 'OpenAI API key is not set. Please configure it in settings.' };
                }
                break;

            case 'custom':
                const customKey = config.get<string>('custom.apiKey', '');
                const customUrl = config.get<string>('custom.baseUrl', '');
                if (!customKey || !customUrl) {
                    return { valid: false, error: 'Custom provider API key and base URL must be set. Please configure them in settings.' };
                }
                break;
        }

        return { valid: true };
    }

    static getCredentials(): ZenFloCredentials | null {
        return this.cachedCredentials;
    }
}
