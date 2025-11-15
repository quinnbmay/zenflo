import { Session } from "@/sync/storageTypes";
import { Message } from "@/sync/typesMessage";
import { trimIdent } from "@/utils/trimIdent";
import { VOICE_CONFIG } from "../voiceConfig";

interface SessionMetadata {
    summary?: { text?: string };
    path?: string;
    machineId?: string;
    homeDir?: string;
    [key: string]: any;
}


/**
 * Format a permission request for natural language context
 */
export function formatPermissionRequest(
    sessionId: string,
    requestId: string,
    toolName: string,
    toolArgs: any
): string {
    return trimIdent(`
        Claude Code is requesting permission to use ${toolName} (session ${sessionId}):
        <request_id>${requestId}</request_id>
        <tool_name>${toolName}</tool_name>
        <tool_args>${JSON.stringify(toolArgs)}</tool_args>
    `);
}

//
// Message formatting
//

export function formatMessage(message: Message): string | null {

    // Lines
    let lines: string[] = [];
    if (message.kind === 'agent-text' && message.text) {
        lines.push(`Claude Code: \n<text>${message.text}</text>`);
    } else if (message.kind === 'user-text' && message.text) {
        lines.push(`User sent message: \n<text>${message.text}</text>`);
    } else if (message.kind === 'tool-call' && message.tool && !VOICE_CONFIG.DISABLE_TOOL_CALLS) {
        const toolDescription = message.tool.description ? ` - ${message.tool.description}` : '';
        if (VOICE_CONFIG.LIMITED_TOOL_CALLS) {
            if (message.tool.description) {
                lines.push(`Claude Code is using ${message.tool.name || 'unknown'}${toolDescription}`);
            }
        } else {
            lines.push(`Claude Code is using ${message.tool.name || 'unknown'}${toolDescription} (tool_use_id: ${message.id}) with arguments: <arguments>${JSON.stringify(message.tool.input || {})}</arguments>`);
        }
    }
    if (lines.length === 0) {
        return null;
    }
    return lines.join('\n\n');
}

export function formatNewSingleMessage(sessionId: string, message: Message): string | null {
    let formatted = formatMessage(message);
    if (!formatted) {
        return null;
    }
    return 'New message in session: ' + sessionId + '\n\n' + formatted;
}

export function formatNewMessages(sessionId: string, messages: Message[]): string | null {
    let formatted = [...messages].sort((a, b) => a.createdAt - b.createdAt).map(formatMessage).filter(Boolean);
    if (formatted.length === 0) {
        return null;
    }
    return 'New messages in session: ' + sessionId + '\n\n' + formatted.join('\n\n');
}

/**
 * Formats message history for voice assistant context.
 *
 * CRITICAL: This function must use negative array slicing to get the MOST RECENT messages.
 *
 * Bug History (2025-01-03):
 * - Previously used messages.slice(0, MAX_HISTORY_MESSAGES) which took the FIRST 50 messages (oldest)
 * - This caused Max voice assistant to not see recent messages after app restart
 * - Fixed by using messages.slice(-MAX_HISTORY_MESSAGES) to take LAST 50 messages (most recent)
 *
 * Why this matters:
 * - When user asks "so what does this tell me?", Max needs to see the latest Claude response
 * - Without recent context, Max gives confused or outdated responses
 * - This is especially problematic after app restart when voice session reinitializes
 *
 * @param sessionId - The session ID for logging/context
 * @param messages - Full array of messages in the session (ordered chronologically)
 * @returns Formatted string containing the most recent N messages
 */
export function formatHistory(sessionId: string, messages: Message[]): string {
    // Take the LAST N messages (most recent), not the first N
    // Using negative slice (-50) means "take last 50 items from the end"
    let messagesToFormat = VOICE_CONFIG.MAX_HISTORY_MESSAGES > 0
        ? messages.slice(-VOICE_CONFIG.MAX_HISTORY_MESSAGES)  // ✅ Gets most recent messages
        : messages;
    let formatted = messagesToFormat.map(formatMessage).filter(Boolean);
    return 'History of messages in session: ' + sessionId + ' (most recent messages first)\n\n' + formatted.join('\n\n');
}

//
// Session states
//

export function formatSessionFull(session: Session, messages: Message[]): string {
    const sessionName = session.metadata?.summary?.text;
    const sessionPath = session.metadata?.path;
    const lines: string[] = [];

    // Add session context
    lines.push(`# Session ID: ${session.id}`);
    lines.push(`# Project path: ${sessionPath}`);
    lines.push(`# Session summary:\n${sessionName}`);

    // Add session metadata if available
    if (session.metadata?.summary?.text) {
        lines.push('## Session Summary');
        lines.push(session.metadata.summary.text);
        lines.push('');
    }

    // Add history
    lines.push('## Our interaction history so far');
    lines.push('');
    lines.push(formatHistory(session.id, messages));

    return lines.join('\n\n');
}

export function formatSessionOffline(sessionId: string, metadata?: SessionMetadata): string {
    return `Session went offline: ${sessionId}`;
}

export function formatSessionOnline(sessionId: string, metadata?: SessionMetadata): string {
    return `Session came online: ${sessionId}`;
}

export function formatSessionFocus(sessionId: string, metadata?: SessionMetadata): string {
    return `Session became focused: ${sessionId}`;
}

export function formatReadyEvent(sessionId: string): string {
    return `Claude Code done working in session: ${sessionId}. The previous message(s) are the summary of the work done. Report this to the human immediately.`;
}