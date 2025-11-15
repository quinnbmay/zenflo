import * as vscode from 'vscode';
import { AIProvider, ProviderConfig } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

export class ProviderFactory {
    static createProvider(): AIProvider {
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

    static validateConfig(): { valid: boolean; error?: string } {
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
}
