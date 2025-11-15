// AI Provider Types

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIStreamChunk {
    content: string;
    done: boolean;
}

export interface AIProvider {
    name: string;
    sendMessage(messages: AIMessage[], onChunk: (chunk: AIStreamChunk) => void): Promise<void>;
}

export type ProviderType = 'anthropic' | 'openai' | 'custom';

export interface ProviderConfig {
    type: ProviderType;
    apiKey: string;
    model: string;
    baseUrl?: string;
}
