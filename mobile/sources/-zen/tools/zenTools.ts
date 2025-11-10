import { z } from 'zod';
import { getCurrentAuth } from '@/auth/AuthContext';
import { storage } from '@/sync/storage';
import { addTodo, updateTodoStatusAndPriority, TaskPriority, TaskStatus } from '../model/ops';

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
    }
];

// Tool implementations
export const zenTools = {
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
    }
};
