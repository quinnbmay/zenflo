import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIMessage, AIStreamChunk, ProviderConfig } from './types';

export class AnthropicProvider implements AIProvider {
    name = 'Anthropic';
    private client: Anthropic;
    private model: string;

    constructor(config: ProviderConfig) {
        this.client = new Anthropic({
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });
        this.model = config.model;
    }

    async sendMessage(messages: AIMessage[], onChunk: (chunk: AIStreamChunk) => void): Promise<void> {
        // Convert messages to Anthropic format
        const systemMessage = messages.find(m => m.role === 'system')?.content;
        const chatMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

        const stream = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemMessage,
            messages: chatMessages,
            stream: true
        });

        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                onChunk({
                    content: chunk.delta.text,
                    done: false
                });
            } else if (chunk.type === 'message_stop') {
                onChunk({
                    content: '',
                    done: true
                });
            }
        }
    }
}
