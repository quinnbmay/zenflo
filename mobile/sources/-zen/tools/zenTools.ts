import { z } from 'zod';
import { getCurrentAuth } from '@/auth/AuthContext';
import { storage } from '@/sync/storage';
import { addTodo, updateTodoStatusAndPriority, TaskPriority, TaskStatus } from '../model/ops';
import { machineSpawnNewSession } from '@/sync/ops';
import { sync } from '@/sync/sync';
import type { Router } from 'expo-router';
// SuperMemory integration temporarily disabled due to build issues
// import { createToolCallExecutor } from '@supermemory/tools/openai';

/**
 * OpenAI Realtime API tool definitions for Zen voice assistant.
 *
 * This file provides tool schemas and implementations that enable the Zen voice assistant
 * to interact with the user's task list through OpenAI's function calling API.
 *
 * Tools provided:
 * - list_tasks: Get current tasks, optionally filtered by priority
 * - create_task: Create new tasks with title and optional priority
 * - update_task: Update task status or priority
 * - list_sessions: List active/recent Claude sessions
 * - open_session: Navigate to a specific session
 * - create_session: Create new Claude session
 *
 * Integration:
 * - zenToolsSchema: Array of OpenAI function definitions to pass to the Realtime API
 * - zenTools: Object with actual implementations called when tools are invoked
 *
 * Each tool returns JSON with { success: true/false, ... } format.
 * Tools use getCurrentAuth() to get credentials and storage.getState() to access tasks.
 *
 * @see sources/realtime/RealtimeVoiceSession.tsx for voice session integration
 * @see sources/-zen/model/ops.ts for task operations
 */

// OpenAI function calling schema
export const zenToolsSchema = [
    {
        type: 'function',
        name: 'list_tasks',
        description: 'Get current tasks from the user\'s task list. Can optionally filter by priority level (LOW, MEDIUM, HIGH, URGENT). Returns all tasks if no priority is specified.',
        parameters: {
            type: 'object',
            properties: {
                priority: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                    description: 'Optional priority level to filter tasks by'
                }
            },
            required: []
        }
    },
    {
        type: 'function',
        name: 'create_task',
        description: 'Create a new task in the user\'s task list. The task will be created with TODO status by default.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'The task title/description'
                },
                priority: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                    description: 'Optional priority level for the task (defaults to MEDIUM if not specified)'
                }
            },
            required: ['title']
        }
    },
    {
        type: 'function',
        name: 'update_task',
        description: 'Update a task\'s status (TODO, IN_PROGRESS, DONE, CANCELLED) or priority level (LOW, MEDIUM, HIGH, URGENT). At least one of status or priority must be provided.',
        parameters: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'The ID of the task to update'
                },
                status: {
                    type: 'string',
                    enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
                    description: 'Optional new status for the task'
                },
                priority: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                    description: 'Optional new priority for the task'
                }
            },
            required: ['taskId']
        }
    },
    {
        type: 'function',
        name: 'list_sessions',
        description: 'List Claude Code sessions. Can filter by active sessions, today\'s sessions, or recent sessions (last 10).',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    enum: ['active', 'today', 'recent'],
                    description: 'Filter type: active (currently running), today (created/updated today), or recent (last 10 by update time). Defaults to active.'
                }
            },
            required: []
        }
    },
    {
        type: 'function',
        name: 'open_session',
        description: 'Open and navigate to a specific Claude Code session by its ID.',
        parameters: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    description: 'The ID of the session to open'
                }
            },
            required: ['sessionId']
        }
    },
    {
        type: 'function',
        name: 'create_session',
        description: 'Create a new Claude Code session on a machine with optional initial prompt.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Optional first message to send to Claude'
                },
                machineId: {
                    type: 'string',
                    description: 'Optional machine ID (defaults to first active machine)'
                },
                path: {
                    type: 'string',
                    description: 'Optional working directory path (defaults to recent path for machine)'
                },
                agentType: {
                    type: 'string',
                    enum: ['claude', 'codex', 'qwen', 'gemini'],
                    description: 'Optional agent type (defaults to claude)'
                }
            },
            required: []
        }
    }
    // SuperMemory tools temporarily disabled due to build issues
    // {
    //     type: 'function',
    //     name: 'search_memory',
    //     description: 'Search the user\'s memories and patterns using SuperMemory. Returns concise summary of relevant findings (1-3 sentences max).',
    //     parameters: {
    //         type: 'object',
    //         properties: {
    //             query: {
    //                 type: 'string',
    //                 description: 'What to search for in the user\'s memories'
    //             },
    //             projectId: {
    //                 type: 'string',
    //                 description: 'Optional project ID to filter memories by specific project'
    //             }
    //         },
    //         required: ['query']
    //     }
    // },
    // {
    //     type: 'function',
    //     name: 'remember_this',
    //     description: 'Store information to the user\'s SuperMemory for future reference.',
    //     parameters: {
    //         type: 'object',
    //         properties: {
    //             information: {
    //                 type: 'string',
    //                 description: 'What to remember'
    //             },
    //             projectId: {
    //                 type: 'string',
    //                 description: 'Optional project ID to associate this memory with'
    //             }
    //         },
    //         required: ['information']
    //     }
    // }
];

// SuperMemory configuration - temporarily disabled due to build issues
// const SUPERMEMORY_API_KEY = process.env.EXPO_PUBLIC_SUPERMEMORY_API_KEY || '';

// Initialize SuperMemory tool executor if API key is available
// let executeSupermemoryTool: ReturnType<typeof createToolCallExecutor> | null = null;
// if (SUPERMEMORY_API_KEY) {
//     try {
//         executeSupermemoryTool = createToolCallExecutor(SUPERMEMORY_API_KEY, {
//             projectId: 'zenflo'
//         });
//         console.log('✅ SuperMemory tools initialized');
//     } catch (error) {
//         console.error('❌ Failed to initialize SuperMemory tools:', error);
//     }
// }

// Tool implementations factory - accepts router for navigation
export const createZenTools = (router: Router) => ({
    /**
     * List tasks, optionally filtered by priority
     */
    list_tasks: async (parameters: unknown) => {
        const schema = z.object({
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const { priority } = parsed.data;
        const todoState = storage.getState().todoState;

        if (!todoState) {
            return JSON.stringify({ success: false, error: 'Tasks not loaded' });
        }

        // Get all tasks
        const allTasks = Object.values(todoState.todos);

        // Filter by priority if specified
        const tasks = priority
            ? allTasks.filter(task => task.priority === priority)
            : allTasks;

        // Format tasks for display
        const formattedTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            done: task.done,
            createdAt: new Date(task.createdAt).toISOString(),
            updatedAt: new Date(task.updatedAt).toISOString()
        }));

        console.log(`📋 list_tasks called${priority ? ` (priority: ${priority})` : ''}, found:`, formattedTasks.length, 'tasks');
        return JSON.stringify({
            success: true,
            tasks: formattedTasks,
            count: formattedTasks.length,
            filter: priority ? { priority } : undefined
        });
    },

    /**
     * Create a new task
     */
    create_task: async (parameters: unknown) => {
        const schema = z.object({
            title: z.string().min(1, 'Title cannot be empty'),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const auth = getCurrentAuth();
        if (!auth?.credentials) {
            console.error('❌ No auth credentials available');
            return JSON.stringify({ success: false, error: 'Not authenticated' });
        }

        const { title, priority } = parsed.data;

        try {
            const taskId = await addTodo(
                auth.credentials,
                title,
                priority || 'MEDIUM',
                'TODO'
            );

            console.log(`✅ create_task called: created task "${title}" with priority ${priority || 'MEDIUM'} (id: ${taskId})`);
            return JSON.stringify({
                success: true,
                taskId,
                title,
                priority: priority || 'MEDIUM',
                status: 'TODO'
            });
        } catch (error) {
            console.error('❌ Failed to create task:', error);
            return JSON.stringify({
                success: false,
                error: 'Failed to create task'
            });
        }
    },

    /**
     * Update a task's status and/or priority
     */
    update_task: async (parameters: unknown) => {
        const schema = z.object({
            taskId: z.string().min(1, 'Task ID cannot be empty'),
            status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const { taskId, status, priority } = parsed.data;

        // Validate at least one update field is provided
        if (!status && !priority) {
            console.error('❌ No update fields provided');
            return JSON.stringify({
                success: false,
                error: 'Must provide either status or priority to update'
            });
        }

        const auth = getCurrentAuth();
        if (!auth?.credentials) {
            console.error('❌ No auth credentials available');
            return JSON.stringify({ success: false, error: 'Not authenticated' });
        }

        // Check if task exists
        const todoState = storage.getState().todoState;
        if (!todoState || !todoState.todos[taskId]) {
            console.error('❌ Task not found:', taskId);
            return JSON.stringify({ success: false, error: 'Task not found' });
        }

        try {
            await updateTodoStatusAndPriority(
                auth.credentials,
                taskId,
                status as TaskStatus | undefined,
                priority as TaskPriority | undefined
            );

            const updates = [];
            if (status) updates.push(`status: ${status}`);
            if (priority) updates.push(`priority: ${priority}`);

            console.log(`✅ update_task called: updated task ${taskId} (${updates.join(', ')})`);
            return JSON.stringify({
                success: true,
                taskId,
                updates: { status, priority }
            });
        } catch (error) {
            console.error('❌ Failed to update task:', error);
            return JSON.stringify({
                success: false,
                error: 'Failed to update task'
            });
        }
    },

    /**
     * List sessions with optional filtering
     */
    list_sessions: async (parameters: unknown) => {
        const schema = z.object({
            filter: z.enum(['active', 'today', 'recent']).optional()
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const { filter = 'active' } = parsed.data;
        const allSessions = Object.values(storage.getState().sessions);

        let sessions = allSessions;

        // Apply filter
        if (filter === 'active') {
            sessions = allSessions.filter(s => s.active);
        } else if (filter === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayMs = todayStart.getTime();
            sessions = allSessions.filter(s => s.updatedAt >= todayMs);
        } else if (filter === 'recent') {
            sessions = allSessions
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 10);
        }

        // Format for display
        const formattedSessions = sessions.map(s => ({
            sessionId: s.id,
            title: s.metadata?.name || 'Untitled',
            path: s.metadata?.path || null,
            machineId: s.metadata?.machineId || null,
            updatedAt: new Date(s.updatedAt).toISOString()
        }));

        console.log(`📋 list_sessions called (filter: ${filter}), found:`, formattedSessions.length, 'sessions');
        return JSON.stringify({
            success: true,
            sessions: formattedSessions,
            count: formattedSessions.length,
            filter
        });
    },

    /**
     * Open a specific session
     */
    open_session: async (parameters: unknown) => {
        const schema = z.object({
            sessionId: z.string().min(1, 'Session ID cannot be empty')
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const { sessionId } = parsed.data;

        // Check if session exists
        const session = storage.getState().sessions[sessionId];
        if (!session) {
            console.error('❌ Session not found:', sessionId);
            return JSON.stringify({ success: false, error: 'Session not found' });
        }

        try {
            // Navigate to session
            router.navigate(`/session/${sessionId}` as any);

            const title = session.metadata?.name || 'Untitled';
            console.log(`✅ open_session called: opened session "${title}" (${sessionId})`);
            return JSON.stringify({
                success: true,
                sessionId,
                title
            });
        } catch (error) {
            console.error('❌ Failed to open session:', error);
            return JSON.stringify({
                success: false,
                error: 'Failed to open session'
            });
        }
    },

    /**
     * Create a new session
     */
    create_session: async (parameters: unknown) => {
        const schema = z.object({
            prompt: z.string().optional(),
            machineId: z.string().optional(),
            path: z.string().optional(),
            agentType: z.enum(['claude', 'codex', 'qwen', 'gemini']).optional()
        });
        const parsed = schema.safeParse(parameters);

        if (!parsed.success) {
            console.error('❌ Invalid parameters:', parsed.error);
            return JSON.stringify({ success: false, error: 'Invalid parameters' });
        }

        const { prompt, machineId: providedMachineId, path: providedPath, agentType = 'claude' } = parsed.data;

        try {
            // Get machines
            const allMachines = Object.values(storage.getState().machines);
            const activeMachines = allMachines.filter(m => m.active);

            if (activeMachines.length === 0) {
                return JSON.stringify({
                    success: false,
                    error: 'No active machines available'
                });
            }

            // Determine machine to use
            const machineId = providedMachineId || activeMachines[0].id;
            const machine = allMachines.find(m => m.id === machineId);

            if (!machine) {
                return JSON.stringify({
                    success: false,
                    error: 'Machine not found'
                });
            }

            // Determine path - use provided path or machine's home directory
            const path = providedPath || machine.metadata?.homeDir || '~';

            // Spawn new session
            console.log(`🚀 create_session: spawning on machine ${machineId} at ${path}`);
            const result = await machineSpawnNewSession({
                machineId,
                directory: path,
                approvedNewDirectoryCreation: false,
                agent: agentType
            });

            if (result.type === 'error') {
                console.error('❌ Failed to spawn session:', result.errorMessage);
                return JSON.stringify({
                    success: false,
                    error: result.errorMessage || 'Failed to create session'
                });
            }

            if (result.type === 'requestToApproveDirectoryCreation') {
                console.error('❌ Directory creation approval required:', result.directory);
                return JSON.stringify({
                    success: false,
                    error: 'Directory does not exist and requires approval to create'
                });
            }

            const sessionId = result.sessionId;
            console.log(`✅ Session created: ${sessionId}`);

            // Send prompt if provided
            if (prompt) {
                console.log(`📤 Sending initial prompt to session ${sessionId}`);
                await sync.sendMessage(sessionId, prompt);
            }

            // Navigate to the new session
            router.navigate(`/session/${sessionId}` as any);

            console.log(`✅ create_session: created and opened session ${sessionId} at ${path}`);
            return JSON.stringify({
                success: true,
                sessionId,
                path,
                machineId,
                promptSent: !!prompt
            });

        } catch (error) {
            console.error('❌ Failed to create session:', error);
            return JSON.stringify({
                success: false,
                error: 'Failed to create session'
            });
        }
    },

    /**
     * Search user's memories using SuperMemory
     * Temporarily disabled due to build issues
     */
    search_memory: async (parameters: unknown) => {
        console.log('[ZEN TOOLS] search_memory - SuperMemory temporarily disabled');
        return JSON.stringify({
            success: false,
            message: "Memory features temporarily disabled."
        });
    },

    /**
     * Store information to SuperMemory
     * Temporarily disabled due to build issues
     */
    remember_this: async (parameters: unknown) => {
        console.log('[ZEN TOOLS] remember_this - SuperMemory temporarily disabled');
        return JSON.stringify({
            success: false,
            message: "Memory features temporarily disabled."
        });
    }
});

// Legacy export for backward compatibility - note: requires router to be passed
export const zenTools = createZenTools as any;
