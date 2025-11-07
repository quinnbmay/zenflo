import { z } from 'zod';
import { sync } from '@/sync/sync';
import { sessionAllow, sessionDeny } from '@/sync/ops';
import { storage } from '@/sync/storage';
import { trackPermissionResponse } from '@/track';
import { getCurrentRealtimeSessionId } from './RealtimeSession';

/**
 * Helper function to extract readable text content from message content array
 */
function extractTextContent(content: any[]): string {
    if (!content || content.length === 0) return '';

    const textParts: string[] = [];

    for (const item of content) {
        if (item.type === 'text' && item.text) {
            textParts.push(item.text.slice(0, 500)); // Limit to 500 chars per item
        } else if (item.type === 'tool-use') {
            textParts.push(`[Used tool: ${item.name}]`);
        } else if (item.type === 'tool-result') {
            textParts.push('[Tool result]');
        }
    }

    return textParts.join(' ');
}

/**
 * Static client tools for the realtime voice interface.
 * These tools allow the voice assistant to interact with Claude Code.
 */
export const realtimeClientTools = {
    /**
     * Send a message to Claude Code
     */
    messageClaudeCode: async (parameters: unknown) => {
        // Parse and validate the message parameter using Zod
        const messageSchema = z.object({
            message: z.string().min(1, 'Message cannot be empty')
        });
        const parsedMessage = messageSchema.safeParse(parameters);

        if (!parsedMessage.success) {
            console.error('❌ Invalid message parameter:', parsedMessage.error);
            return "error (invalid message parameter)";
        }

        const message = parsedMessage.data.message;
        const sessionId = getCurrentRealtimeSessionId();
        
        if (!sessionId) {
            console.error('❌ No active session');
            return "error (no active session)";
        }
        
        console.log('🔍 messageClaudeCode called with:', message);
        console.log('📤 Sending message to session:', sessionId);
        sync.sendMessage(sessionId, message);
        return "sent [DO NOT say anything else, simply say 'sent']";
    },

    /**
     * Process a permission request from Claude Code
     */
    processPermissionRequest: async (parameters: unknown) => {
        const messageSchema = z.object({
            decision: z.enum(['allow', 'deny'])
        });
        const parsedMessage = messageSchema.safeParse(parameters);

        if (!parsedMessage.success) {
            console.error('❌ Invalid decision parameter:', parsedMessage.error);
            return "error (invalid decision parameter, expected 'allow' or 'deny')";
        }

        const decision = parsedMessage.data.decision;
        const sessionId = getCurrentRealtimeSessionId();
        
        if (!sessionId) {
            console.error('❌ No active session');
            return "error (no active session)";
        }
        
        console.log('🔍 processPermissionRequest called with:', decision);
        
        // Get the current session to check for permission requests
        const session = storage.getState().sessions[sessionId];
        const requests = session?.agentState?.requests;
        
        if (!requests || Object.keys(requests).length === 0) {
            console.error('❌ No active permission request');
            return "error (no active permission request)";
        }
        
        const requestId = Object.keys(requests)[0];
        
        try {
            if (decision === 'allow') {
                await sessionAllow(sessionId, requestId);
                trackPermissionResponse(true);
            } else {
                await sessionDeny(sessionId, requestId);
                trackPermissionResponse(false);
            }
            return "done [DO NOT say anything else, simply say 'done']";
        } catch (error) {
            console.error('❌ Failed to process permission:', error);
            return `error (failed to ${decision} permission)`;
        }
    },

    /**
     * Get detailed information about a specific session including recent messages
     */
    getSessionDetails: async (parameters: unknown) => {
        const messageSchema = z.object({
            sessionId: z.string().min(1, 'Session ID cannot be empty')
        });
        const parsedParams = messageSchema.safeParse(parameters);

        if (!parsedParams.success) {
            console.error('❌ Invalid sessionId parameter:', parsedParams.error);
            return "error (invalid sessionId parameter)";
        }

        const { sessionId } = parsedParams.data;
        const sessions = storage.getState().sessions;
        const session = sessions[sessionId];

        if (!session) {
            return JSON.stringify({ error: 'Session not found' });
        }

        // Get recent messages (last 10)
        const sessionMessages = storage.getState().sessionMessages[sessionId];
        const recentMessages = sessionMessages?.messages?.slice(-10) || [];

        const messagePreview = recentMessages.map(msg => ({
            role: msg.role,
            preview: extractTextContent(msg.content).slice(0, 200),
            timestamp: msg.timestamp
        }));

        const details = {
            id: session.id,
            title: session.metadata?.summary?.text || session.metadata?.name || 'Untitled Session',
            path: session.metadata?.path,
            isOnline: session.presence === 'online',
            isThinking: session.thinking,
            lastActive: new Date(session.activeAt).toISOString(),
            messageCount: sessionMessages?.messages?.length || 0,
            recentMessages: messagePreview,
            hasPermissionRequests: !!(session.agentState?.requests && Object.keys(session.agentState.requests).length > 0)
        };

        console.log('🔍 getSessionDetails called for:', sessionId);
        return JSON.stringify(details);
    },

    /**
     * Get paginated message history from a specific session
     */
    getSessionMessages: async (parameters: unknown) => {
        const messageSchema = z.object({
            sessionId: z.string().min(1, 'Session ID cannot be empty'),
            limit: z.number().min(1).max(50).optional().default(10),
            offset: z.number().min(0).optional().default(0)
        });
        const parsedParams = messageSchema.safeParse(parameters);

        if (!parsedParams.success) {
            console.error('❌ Invalid parameters:', parsedParams.error);
            return "error (invalid parameters)";
        }

        const { sessionId, limit, offset } = parsedParams.data;
        const sessionMessages = storage.getState().sessionMessages[sessionId];

        if (!sessionMessages || !sessionMessages.messages) {
            return JSON.stringify({ messages: [], total: 0, hasMore: false });
        }

        const allMessages = sessionMessages.messages;
        const startIndex = Math.max(0, allMessages.length - offset - limit);
        const endIndex = allMessages.length - offset;
        const requestedMessages = allMessages.slice(startIndex, endIndex);

        const messages = requestedMessages.map(msg => ({
            role: msg.role,
            content: extractTextContent(msg.content),
            timestamp: msg.timestamp,
            hasTools: msg.content.some((c: any) => c.type === 'tool-use' || c.type === 'tool-result')
        }));

        console.log(`📜 getSessionMessages called for ${sessionId}: showing ${messages.length} messages (offset: ${offset})`);

        return JSON.stringify({
            messages,
            total: allMessages.length,
            hasMore: startIndex > 0,
            offset,
            limit
        });
    },

    /**
     * Browse all active sessions with comprehensive details
     */
    browseAllSessions: async () => {
        const sessions = storage.getState().sessions;
        const activeSessions = Object.values(sessions)
            .filter(session => session.active)
            .map(session => {
                const sessionMessages = storage.getState().sessionMessages[session.id];
                const messageCount = sessionMessages?.messages?.length || 0;
                const lastMessage = sessionMessages?.messages?.slice(-1)[0];

                return {
                    id: session.id,
                    title: session.metadata?.summary?.text || session.metadata?.name || 'Untitled Session',
                    path: session.metadata?.path,
                    isOnline: session.presence === 'online',
                    isThinking: session.thinking,
                    lastActive: new Date(session.activeAt).toISOString(),
                    messageCount,
                    lastMessagePreview: lastMessage ? extractTextContent(lastMessage.content).slice(0, 150) : '',
                    lastMessageRole: lastMessage?.role,
                    hasPermissionRequests: !!(session.agentState?.requests && Object.keys(session.agentState.requests).length > 0)
                };
            })
            .sort((a, b) => b.lastActive.localeCompare(a.lastActive));

        console.log('🗂️ browseAllSessions called, found:', activeSessions.length, 'sessions');
        return JSON.stringify({ sessions: activeSessions, count: activeSessions.length });
    },

    /**
     * Subscribe to updates from specific sessions (marks them for monitoring)
     */
    subscribeToSessionUpdates: async (parameters: unknown) => {
        const messageSchema = z.object({
            sessionIds: z.array(z.string()).min(1, 'Must provide at least one session ID')
        });
        const parsedParams = messageSchema.safeParse(parameters);

        if (!parsedParams.success) {
            console.error('❌ Invalid sessionIds parameter:', parsedParams.error);
            return "error (invalid sessionIds parameter)";
        }

        const { sessionIds } = parsedParams.data;
        const sessions = storage.getState().sessions;

        // Verify all sessions exist
        const validSessionIds = sessionIds.filter(id => sessions[id]);
        const invalidSessionIds = sessionIds.filter(id => !sessions[id]);

        console.log('📡 subscribeToSessionUpdates called for:', validSessionIds);

        return JSON.stringify({
            subscribed: validSessionIds,
            invalid: invalidSessionIds,
            message: `Monitoring ${validSessionIds.length} sessions. You can use getSessionDetails or getSessionMessages to check their status.`
        });
    },

    /**
     * List all active sessions
     */
    listActiveSessions: async () => {
        const sessions = storage.getState().sessions;
        const activeSessions = Object.values(sessions)
            .filter(session => session.active)
            .map(session => ({
                id: session.id,
                title: session.metadata?.summary?.text || session.metadata?.name || 'Untitled Session',
                path: session.metadata?.path,
                isOnline: session.presence === 'online',
                isThinking: session.thinking,
                lastActive: new Date(session.activeAt).toISOString()
            }))
            .sort((a, b) => b.lastActive.localeCompare(a.lastActive));

        console.log('📋 listActiveSessions called, found:', activeSessions.length, 'sessions');
        return JSON.stringify({ sessions: activeSessions, count: activeSessions.length });
    }
};