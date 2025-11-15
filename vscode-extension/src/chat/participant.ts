import * as vscode from 'vscode';
import { ProviderFactory } from '../providers/factory';
import { AIMessage } from '../providers/types';

export class ZenFloChatParticipant {
    private participant: vscode.ChatParticipant;

    constructor(context: vscode.ExtensionContext) {
        this.participant = vscode.chat.createChatParticipant('zenflo.assistant', this.handleRequest.bind(this));
        this.participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');

        context.subscriptions.push(this.participant);
    }

    private async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        // Validate provider configuration
        const validation = await ProviderFactory.validateConfig();
        if (!validation.valid) {
            stream.markdown(`❌ **Configuration Error**\n\n${validation.error}`);
            return { metadata: { error: validation.error } };
        }

        try {
            // Get the AI provider
            const provider = await ProviderFactory.createProvider();

            // Build context from request
            const messages = await this.buildMessages(request, context);

            // Stream response
            let fullResponse = '';
            await provider.sendMessage(messages, (chunk: any) => {
                if (!chunk.done) {
                    fullResponse += chunk.content;
                    stream.markdown(chunk.content);
                }
            });

            return {
                metadata: {
                    command: request.command,
                    provider: provider.name
                }
            };
        } catch (error: any) {
            const errorMsg = `❌ Error: ${error.message}`;
            stream.markdown(errorMsg);
            return { metadata: { error: error.message } };
        }
    }

    private async buildMessages(
        request: vscode.ChatRequest,
        context: vscode.ChatContext
    ): Promise<AIMessage[]> {
        const messages: AIMessage[] = [];

        // System message with instructions
        messages.push({
            role: 'system',
            content: this.getSystemPrompt(request.command)
        });

        // Add chat history
        for (const turn of context.history) {
            if (turn instanceof vscode.ChatRequestTurn) {
                messages.push({
                    role: 'user',
                    content: turn.prompt
                });
            } else if (turn instanceof vscode.ChatResponseTurn) {
                const responseText = turn.response.map(r => {
                    if (r instanceof vscode.ChatResponseMarkdownPart) {
                        return r.value.value;
                    }
                    return '';
                }).join('');

                if (responseText) {
                    messages.push({
                        role: 'assistant',
                        content: responseText
                    });
                }
            }
        }

        // Add current request with file context
        const userMessage = await this.buildUserMessage(request);
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    private async buildUserMessage(request: vscode.ChatRequest): Promise<string> {
        let message = request.prompt;

        // Add file context from references
        const fileContexts: string[] = [];
        for (const ref of request.references) {
            if (ref.value instanceof vscode.Uri) {
                const content = await this.getFileContent(ref.value);
                if (content) {
                    fileContexts.push(content);
                }
            } else if (ref.value instanceof vscode.Location) {
                const content = await this.getFileContent(ref.value.uri, ref.value.range);
                if (content) {
                    fileContexts.push(content);
                }
            }
        }

        if (fileContexts.length > 0) {
            message = `${message}\n\n<file_context>\n${fileContexts.join('\n\n')}\n</file_context>`;
        }

        return message;
    }

    private async getFileContent(uri: vscode.Uri, range?: vscode.Range): Promise<string | null> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const relativePath = vscode.workspace.asRelativePath(uri);

            let content: string;
            if (range) {
                content = document.getText(range);
            } else {
                content = document.getText();
            }

            const languageId = document.languageId;
            return `<file path="${relativePath}" language="${languageId}">\n${content}\n</file>`;
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }

    private getSystemPrompt(command?: string): string {
        const basePrompt = `You are ZenFlo, an expert AI coding assistant. You help developers write, understand, and improve code.

Key guidelines:
- Provide clear, concise explanations
- When showing code, use proper markdown code blocks with language identifiers
- Consider the full file context when available
- Be direct and helpful`;

        switch (command) {
            case 'explain':
                return `${basePrompt}\n\nYour task: Explain the provided code clearly and thoroughly. Break down complex concepts and highlight important patterns or potential issues.`;

            case 'fix':
                return `${basePrompt}\n\nYour task: Identify and fix issues in the provided code. Explain what was wrong and why your solution is better.`;

            case 'refactor':
                return `${basePrompt}\n\nYour task: Refactor the provided code to improve its quality, readability, and maintainability. Explain your changes.`;

            case 'test':
                return `${basePrompt}\n\nYour task: Generate comprehensive tests for the provided code. Include edge cases and explain your testing strategy.`;

            default:
                return basePrompt;
        }
    }
}
