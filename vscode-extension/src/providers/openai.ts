import OpenAI from 'openai';
import { AIProvider, AIMessage, AIStreamChunk, ProviderConfig } from './types';

export class OpenAIProvider implements AIProvider {
    name = 'OpenAI';
    private client: OpenAI;
    private model: string;

    constructor(config: ProviderConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });
        this.model = config.model;
    }

    async sendMessage(messages: AIMessage[], onChunk: (chunk: AIStreamChunk) => void): Promise<void> {
        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            stream: true
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                onChunk({
                    content: delta,
                    done: false
                });
            }
        }

        onChunk({
            content: '',
            done: true
        });
    }
}
