import { Message, ToolCallMessage } from './typesMessage';
import { AgentEvent } from './typesRaw';

type MessageSpeaker = 'user' | 'assistant' | 'system';

type MessagePreview = {
    speaker: MessageSpeaker;
    text: string;
};

function describeAgentEvent(event: AgentEvent): string | null {
    switch (event.type) {
        case 'switch':
            return `Switched to ${event.mode} mode`;
        case 'message':
            return event.message;
        case 'limit-reached': {
            const date = new Date(event.endsAt * 1000);
            const formatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Usage limit reached until ${formatted}`;
        }
        case 'ready':
            return null;
        default: {
            const _exhaustive: never = event;
            return _exhaustive;
        }
    }
}

function describeToolCall(message: ToolCallMessage): string {
    const name = message.tool?.name ?? 'tool';
    const state = message.tool?.state;
    const stateText = state ? ` (${state})` : '';
    return `Used tool: ${name}${stateText}`;
}

export function buildMessagePreview(message: Message): MessagePreview | null {
    switch (message.kind) {
        case 'user-text':
            return {
                speaker: 'user',
                text: message.displayText ?? message.text,
            };
        case 'agent-text':
            return {
                speaker: 'assistant',
                text: message.text,
            };
        case 'tool-call':
            return {
                speaker: 'assistant',
                text: describeToolCall(message),
            };
        case 'agent-event': {
            const description = describeAgentEvent(message.event);
            if (!description) {
                return null;
            }
            return {
                speaker: 'system',
                text: description,
            };
        }
        default: {
            const _exhaustive: never = message;
            return _exhaustive;
        }
    }
}
