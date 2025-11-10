/**
 * ZenFlo MCP server
 * Provides ZenFlo CLI specific tools including chat session title management and inbox messaging
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AddressInfo } from "node:net";
import { z } from "zod";
import { logger } from "@/ui/logger";
import { ApiSessionClient } from "@/api/apiSession";
import { ApiClient } from "@/api/api";
import { randomUUID } from "node:crypto";

export async function startZenfloServer(client: ApiSessionClient, apiClient: ApiClient) {
    // Handler that sends title updates via the client
    const handler = async (title: string) => {
        logger.debug('[zenfloMCP] Changing title to:', title);
        try {
            // Send title as a summary message, similar to title generator
            client.sendClaudeSessionMessage({
                type: 'summary',
                summary: title,
                leafUuid: randomUUID()
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    };

    //
    // Create the MCP server
    //

    const mcp = new McpServer({
        name: "ZenFlo MCP",
        version: "1.0.0",
        description: "ZenFlo CLI MCP server with chat session management tools",
    });

    mcp.registerTool('change_title', {
        description: 'Change the title of the current chat session',
        title: 'Change Chat Title',
        inputSchema: {
            title: z.string().describe('The new title for the chat session'),
        },
    }, async (args) => {
        const response = await handler(args.title);
        logger.debug('[zenfloMCP] Response:', response);

        if (response.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully changed chat title to: "${args.title}"`,
                    },
                ],
                isError: false,
            };
        } else {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to change chat title: ${response.error || 'Unknown error'}`,
                    },
                ],
                isError: true,
            };
        }
    });

    mcp.registerTool('send_inbox_message', {
        description: 'Send a message to Quinn\'s ZenFlo app inbox for cross-session communication',
        title: 'Send Inbox Message',
        inputSchema: {
            title: z.string().describe('Message title (e.g., "Task completed", "Found a bug")'),
            message: z.string().describe('Message content/details'),
            sessionId: z.string().optional().describe('Optional session ID to link the message to (makes it clickable)'),
            priority: z.enum(['low', 'normal', 'high']).optional().describe('Message priority (affects icon and color)'),
        },
    }, async (args) => {
        logger.debug('[zenfloMCP] Sending inbox message:', args.title);
        try {
            await apiClient.sendInboxMessage({
                title: args.title,
                message: args.message,
                sessionId: args.sessionId,
                priority: args.priority || 'normal'
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully sent inbox message: "${args.title}"`,
                    },
                ],
                isError: false,
            };
        } catch (error) {
            logger.debug('[zenfloMCP] Error sending inbox message:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to send inbox message: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });

    const transport = new StreamableHTTPServerTransport({
        // NOTE: Returning session id here will result in claude
        // sdk spawn to fail with `Invalid Request: Server already initialized`
        sessionIdGenerator: undefined
    });
    await mcp.connect(transport);

    //
    // Create the HTTP server
    //

    const server = createServer(async (req, res) => {
        try {
            await transport.handleRequest(req, res);
        } catch (error) {
            logger.debug("Error handling request:", error);
            if (!res.headersSent) {
                res.writeHead(500).end();
            }
        }
    });

    const baseUrl = await new Promise<URL>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const addr = server.address() as AddressInfo;
            resolve(new URL(`http://127.0.0.1:${addr.port}`));
        });
    });

    return {
        url: baseUrl.toString(),
        toolNames: ['change_title', 'send_inbox_message'],
        stop: () => {
            logger.debug('[zenfloMCP] Stopping server');
            mcp.close();
            server.close();
        }
    }
}
