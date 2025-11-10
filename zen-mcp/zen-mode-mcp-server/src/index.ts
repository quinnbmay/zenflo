#!/usr/bin/env node

/**
 * Zen Mode MCP Server
 *
 * MCP server that wraps ZenFlo's Zen Mode task management functionality.
 * Compatible with iOS Task Manager MCP interface for seamless replacement.
 *
 * Created: 2025-11-07
 * Author: Quinn May with Claude Code
 * API: https://happy.combinedmemory.com (NAS hosted)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// ============================================================================
// Encryption Utilities
// ============================================================================

// Base32 alphabet (RFC 4648) - same as ZenFlo uses
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Parse ZenFlo secret key format (dashed groups, Base32 encoded)
 * Example: CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ
 */
function parseSecretKey(secretStr: string): Uint8Array {
  // Normalize: uppercase, fix common typos, remove non-base32
  let normalized = secretStr.toUpperCase()
    .replace(/0/g, 'O')  // Zero to O
    .replace(/1/g, 'I')  // One to I
    .replace(/8/g, 'B')  // Eight to B
    .replace(/9/g, 'G'); // Nine to G

  // Remove dashes and spaces
  const cleaned = normalized.replace(/[^A-Z2-7]/g, '');

  if (cleaned.length === 0) {
    throw new Error('No valid Base32 characters found');
  }

  // Decode from Base32
  const bytes: number[] = [];
  let buffer = 0;
  let bufferLength = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }

    buffer = (buffer << 5) | value;
    bufferLength += 5;

    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }

  const result = new Uint8Array(bytes);

  if (result.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes, got ${result.length}`);
  }

  return result;
}

// ============================================================================
// Types (matching Zen mode ops.ts)
// ============================================================================

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Plan {
  id: string;
  title: string;
  description?: string;
  goal: string; // High-level goal/objective
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  taskIds: string[]; // Tasks attached to this plan
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  projectPath?: string;
  workingDirectory?: string;
  gitRepo?: {
    remote: string;
    branch: string;
  };
}

interface TodoItem {
  id: string;
  title: string;
  description?: string; // Multi-line description for task context
  done: boolean;
  status: TaskStatus;
  priority?: TaskPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
  subtasks?: Subtask[]; // Subtasks for breaking down complex tasks
  parentTaskId?: string; // Optional reference to parent task
  planId?: string; // Reference to parent plan
  projectPath?: string; // Absolute path to project/repo (e.g., "/Users/quinnmay/developer/happy")
  workingDirectory?: string; // Specific subdirectory within project (e.g., "happy-mobile")
  gitRepo?: {
    remote: string; // Git remote URL
    branch: string; // Current branch
  };
  linkedSessions?: {
    [sessionId: string]: {
      title: string;
      linkedAt: number;
    };
  };
}

interface TodoState {
  todos: Record<string, TodoItem>;
  undoneOrder: string[];
  doneOrder: string[];
  versions: Record<string, number>;
}

// ============================================================================
// API Client for ZenFlo Backend
// ============================================================================

class ZenFloApiClient {
  private client: AxiosInstance;
  private token?: string;
  private masterSecret?: Uint8Array;

  constructor(private baseURL: string = 'https://zenflo.combinedmemory.com') {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set authentication token and master secret for encryption
   */
  setAuth(token: string, masterSecret?: Uint8Array) {
    this.token = token;
    this.masterSecret = masterSecret;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Get all todos from KV storage
   */
  async getTodos(): Promise<TodoState> {
    if (!this.token) {
      throw new Error('Authentication required. Please set ZENFLO_AUTH_TOKEN (or HAPPY_AUTH_TOKEN) environment variable.');
    }

    try {
      // Fetch all KV items with todo prefix
      const queryParams = new URLSearchParams({
        prefix: 'todo.',
        limit: '1000',
      });

      const response = await this.client.get(`/v1/kv?${queryParams.toString()}`);

      const state: TodoState = {
        todos: {},
        undoneOrder: [],
        doneOrder: [],
        versions: {},
      };

      const itemsNeedingMigration: Array<{ key: string; todo: TodoItem }> = [];

      // Process each encrypted KV item
      for (const item of response.data.items || []) {
        state.versions[item.key] = item.version;

        try {
          // Decrypt the value
          const decrypted = await this.decryptData(item.value);

          if (item.key === 'todo.index') {
            // Handle index
            state.undoneOrder = decrypted.undoneOrder || [];
            state.doneOrder = decrypted.completedOrder || [];
          } else if (item.key.startsWith('todo.')) {
            // Handle todo item
            const todoId = item.key.substring(5); // Remove 'todo.' prefix
            if (todoId && todoId !== 'index') {
              let todo = decrypted as TodoItem;

              // Migrate legacy tasks without status field
              if (!todo.status) {
                const migratedStatus: TaskStatus = todo.done ? 'DONE' : 'TODO';
                todo = {
                  ...todo,
                  status: migratedStatus,
                };
                itemsNeedingMigration.push({ key: item.key, todo });
                console.error(`Migrated legacy task ${todoId}: done=${todo.done} -> status=${migratedStatus}`);
              }

              state.todos[todoId] = todo;
            }
          }
        } catch (error) {
          console.error(`Failed to decrypt todo item ${item.key}:`, error);
        }
      }

      // Clean up orders
      state.undoneOrder = state.undoneOrder.filter(id => id in state.todos);
      state.doneOrder = state.doneOrder.filter(id => id in state.todos);

      // Persist migrations back to database (async, don't wait)
      if (itemsNeedingMigration.length > 0) {
        this.persistMigrations(itemsNeedingMigration, state).catch(err => {
          console.error('Failed to persist task migrations:', err);
        });
      }

      return state;
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      throw error;
    }
  }

  /**
   * Persist migrated tasks back to the database
   */
  private async persistMigrations(
    items: Array<{ key: string; todo: TodoItem }>,
    state: TodoState
  ): Promise<void> {
    try {
      const mutations = items.map(({ key, todo }) => ({
        key,
        value: this.encryptData(todo),
        version: state.versions[key] || 0,
      }));

      // Encrypt all mutations in parallel
      const encryptedMutations = await Promise.all(
        mutations.map(async (m) => ({
          key: m.key,
          value: await m.value,
          version: m.version,
        }))
      );

      await this.client.post('/v1/kv', {
        mutations: encryptedMutations,
      });

      console.error(`Successfully persisted ${items.length} migrated tasks`);
    } catch (error) {
      console.error('Failed to persist migrations:', error);
      throw error;
    }
  }

  /**
   * Create a new todo
   */
  async createTodo(
    title: string,
    description?: string,
    priority?: TaskPriority,
    status?: TaskStatus,
    projectPath?: string,
    workingDirectory?: string,
    gitRepo?: { remote: string; branch: string }
  ): Promise<string> {
    const id = this.generateUUID();
    const now = Date.now();

    const newTodo: TodoItem = {
      id,
      title,
      description,
      done: false,
      status: status || 'TODO',
      priority,
      projectPath,
      workingDirectory,
      gitRepo,
      createdAt: now,
      updatedAt: now,
      linkedSessions: {},
    };

    // Encrypt and store via KV API
    const encrypted = await this.encryptData(newTodo);
    await this.client.post('/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: encrypted,
        version: -1, // New key
      }]
    });

    // Update index
    await this.updateIndex(id, 'add', false);

    return id;
  }

  /**
   * Update todo status, priority, title, description, and/or project context
   */
  async updateTodo(
    id: string,
    updates: {
      status?: TaskStatus;
      priority?: TaskPriority;
      title?: string;
      description?: string;
      projectPath?: string;
      workingDirectory?: string;
      gitRepo?: { remote: string; branch: string };
    }
  ): Promise<void> {
    // Get current todo
    const todos = await this.getTodos();
    const todo = todos.todos[id];
    if (!todo) {
      throw new Error(`Todo ${id} not found`);
    }

    const now = Date.now();
    const newStatus = updates.status !== undefined ? updates.status : todo.status;
    const newDone = newStatus === 'DONE' || newStatus === 'CANCELLED';

    const updatedTodo: TodoItem = {
      ...todo,
      title: updates.title !== undefined ? updates.title : todo.title,
      description: updates.description !== undefined ? updates.description : todo.description,
      status: newStatus,
      priority: updates.priority !== undefined ? updates.priority : todo.priority,
      projectPath: updates.projectPath !== undefined ? updates.projectPath : todo.projectPath,
      workingDirectory: updates.workingDirectory !== undefined ? updates.workingDirectory : todo.workingDirectory,
      gitRepo: updates.gitRepo !== undefined ? updates.gitRepo : todo.gitRepo,
      done: newDone,
      updatedAt: now,
      completedAt: newStatus === 'DONE' ? now : todo.completedAt,
      cancelledAt: newStatus === 'CANCELLED' ? now : todo.cancelledAt,
    };

    // Encrypt and update via KV API
    const encrypted = await this.encryptData(updatedTodo);
    const currentVersion = todos.versions[`todo.${id}`] || 0;
    await this.client.post('/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: encrypted,
        version: currentVersion,
      }]
    });

    // Update index if done status changed
    if (newDone !== todo.done) {
      await this.updateIndex(id, 'move', newDone);
    }
  }

  /**
   * Delete a todo
   */
  async deleteTodo(id: string): Promise<void> {
    const todos = await this.getTodos();
    const currentVersion = todos.versions[`todo.${id}`] || 0;

    // Delete via KV API (send null value to delete)
    await this.client.post('/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: null,
        version: currentVersion,
      }]
    });

    // Update index
    await this.updateIndex(id, 'remove', false);
  }

  /**
   * Analyze task complexity to determine if it needs breakdown
   */
  async analyzeTaskComplexity(taskId: string): Promise<{
    isComplex: boolean;
    reason: string;
    estimatedSubtasks: number;
  }> {
    const todos = await this.getTodos();
    const task = todos.todos[taskId];

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Simple heuristics for complexity
    const titleWords = task.title.split(' ').length;
    const hasDescription = !!task.description && task.description.length > 50;
    const descriptionLength = task.description?.length || 0;

    // Check for complexity indicators
    const complexityIndicators = [
      task.title.toLowerCase().includes('implement'),
      task.title.toLowerCase().includes('build'),
      task.title.toLowerCase().includes('create'),
      task.title.toLowerCase().includes('design'),
      task.title.toLowerCase().includes('refactor'),
      titleWords > 5,
      hasDescription,
      descriptionLength > 200,
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;
    const isComplex = complexityScore >= 3;

    const estimatedSubtasks = Math.min(Math.max(Math.floor(complexityScore * 1.5), 3), 8);

    let reason = '';
    if (isComplex) {
      reason = `Task appears complex based on: ${complexityIndicators.filter(Boolean).length} indicators`;
    } else {
      reason = 'Task appears simple enough to complete without breakdown';
    }

    return {
      isComplex,
      reason,
      estimatedSubtasks,
    };
  }

  /**
   * Generate AI-suggested subtasks for a task using Claude
   */
  async suggestSubtasks(taskId: string, maxSubtasks: number = 5): Promise<{
    subtasks: Array<{ title: string; estimate: string }>;
    reasoning: string;
  }> {
    const todos = await this.getTodos();
    const task = todos.todos[taskId];

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Use Claude via CLI to generate intelligent subtask suggestions
    try {
      const claudeResponse = await this.analyzeTaskWithClaude(task, maxSubtasks);
      return claudeResponse;
    } catch (error) {
      console.error('Claude API call failed, falling back to pattern-based suggestions:', error);
      // Fallback to pattern-based suggestions if Claude fails
      const suggestions = this.generateSubtaskSuggestions(task, maxSubtasks);
      return {
        subtasks: suggestions,
        reasoning: `Analyzed task "${task.title}" and suggested ${suggestions.length} subtasks based on common implementation patterns (fallback mode).`,
      };
    }
  }

  /**
   * Use Claude Code MCP to analyze task and generate subtask suggestions
   * This reuses the existing claude-code-mcp server instead of spawning CLI directly
   */
  private async analyzeTaskWithClaude(
    task: TodoItem,
    maxSubtasks: number
  ): Promise<{
    subtasks: Array<{ title: string; estimate: string }>;
    reasoning: string;
  }> {
    const prompt = `You are a task breakdown expert. Analyze this task and break it down into ${maxSubtasks} actionable subtasks.

Task Title: "${task.title}"
${task.description ? `Task Description: ${task.description}` : ''}
${task.priority ? `Priority: ${task.priority}` : ''}

Please analyze this task and suggest ${maxSubtasks} concrete, actionable subtasks that would help complete this work. For each subtask:
1. Make it specific and actionable
2. Estimate the time needed (e.g., "30-45 min", "1-2 hours")
3. Order them logically (what should be done first)

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no explanation):
{
  "subtasks": [
    {"title": "First subtask", "estimate": "30-45 min"},
    {"title": "Second subtask", "estimate": "1-2 hours"}
  ],
  "reasoning": "Brief explanation of the breakdown approach"
}`;

    // Use direct Claude CLI execution (MCP servers can't call other MCP servers)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Write prompt to temp file to avoid escaping issues
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const tmpFile = path.join(os.tmpdir(), `zen-task-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, prompt);

    const command = `cat "${tmpFile}" | claude -p --output-format text`;

    const { stdout } = await execAsync(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // Ignore cleanup errors
    }

    return this.parseClaudeResponse(stdout.trim(), maxSubtasks);
  }

  /**
   * Parse Claude's response and extract subtasks
   */
  private parseClaudeResponse(
    response: string,
    maxSubtasks: number
  ): {
    subtasks: Array<{ title: string; estimate: string }>;
    reasoning: string;
  } {
    // Try to extract JSON from the response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
      throw new Error('Invalid response format from Claude');
    }

    // Ensure we don't exceed maxSubtasks
    parsed.subtasks = parsed.subtasks.slice(0, maxSubtasks);

    return {
      subtasks: parsed.subtasks,
      reasoning: parsed.reasoning || 'AI-generated task breakdown',
    };
  }

  /**
   * Helper to generate subtask suggestions
   * TODO: Replace with actual Claude API call
   */
  private generateSubtaskSuggestions(
    task: TodoItem,
    maxSubtasks: number
  ): Array<{ title: string; estimate: string }> {
    const suggestions: Array<{ title: string; estimate: string }> = [];

    // Pattern-based suggestions
    if (task.title.toLowerCase().includes('implement') || task.title.toLowerCase().includes('add')) {
      suggestions.push(
        { title: 'Design the data model and interfaces', estimate: '30-60 min' },
        { title: 'Implement core functionality', estimate: '1-2 hours' },
        { title: 'Add error handling and validation', estimate: '30-45 min' },
        { title: 'Write tests', estimate: '45-60 min' },
        { title: 'Update documentation', estimate: '15-30 min' }
      );
    } else if (task.title.toLowerCase().includes('fix') || task.title.toLowerCase().includes('bug')) {
      suggestions.push(
        { title: 'Reproduce and isolate the issue', estimate: '30-45 min' },
        { title: 'Identify root cause', estimate: '30-60 min' },
        { title: 'Implement fix', estimate: '30-60 min' },
        { title: 'Test the fix', estimate: '20-30 min' },
        { title: 'Deploy and verify', estimate: '15-20 min' }
      );
    } else if (task.title.toLowerCase().includes('refactor')) {
      suggestions.push(
        { title: 'Analyze current code structure', estimate: '30-45 min' },
        { title: 'Plan refactoring approach', estimate: '20-30 min' },
        { title: 'Refactor in small increments', estimate: '1-2 hours' },
        { title: 'Ensure tests still pass', estimate: '15-30 min' },
        { title: 'Review and optimize', estimate: '30-45 min' }
      );
    } else {
      // Generic breakdown
      suggestions.push(
        { title: 'Research and plan approach', estimate: '20-30 min' },
        { title: 'Implement main functionality', estimate: '1-2 hours' },
        { title: 'Test and validate', estimate: '30-45 min' },
        { title: 'Document changes', estimate: '15-20 min' }
      );
    }

    return suggestions.slice(0, maxSubtasks);
  }

  /**
   * Add a subtask to a task
   */
  async addSubtask(taskId: string, subtaskTitle: string): Promise<string> {
    const todos = await this.getTodos();
    const task = todos.todos[taskId];

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const subtaskId = this.generateUUID();
    const now = Date.now();

    const newSubtask: Subtask = {
      id: subtaskId,
      title: subtaskTitle,
      done: false,
      createdAt: now,
      updatedAt: now,
    };

    const updatedTask: TodoItem = {
      ...task,
      subtasks: [...(task.subtasks || []), newSubtask],
      updatedAt: now,
    };

    // Encrypt and update
    const encrypted = await this.encryptData(updatedTask);
    const currentVersion = todos.versions[`todo.${taskId}`] || 0;

    await this.client.post('/v1/kv', {
      mutations: [{
        key: `todo.${taskId}`,
        value: encrypted,
        version: currentVersion,
      }]
    });

    return subtaskId;
  }

  /**
   * Create a new plan with AI-generated tasks
   */
  async createPlan(
    goal: string,
    description?: string,
    maxTasks?: number,
    projectPath?: string,
    workingDirectory?: string,
    gitRepo?: { remote: string; branch: string }
  ): Promise<{ planId: string; taskIds: string[] }> {
    const planId = this.generateUUID();
    const now = Date.now();

    // Use Claude to break down the goal into tasks
    const prompt = `You are a project planning expert. Break down this goal into ${maxTasks || 5} concrete, actionable tasks.

Goal: "${goal}"
${description ? `Description: ${description}` : ''}

Create ${maxTasks || 5} specific tasks that would accomplish this goal. For each task:
1. Make it specific and actionable
2. Assign a realistic priority (LOW, MEDIUM, HIGH, URGENT)
3. Provide a brief description
4. Order them logically

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "tasks": [
    {"title": "Task title", "description": "Task description", "priority": "HIGH"},
    {"title": "Another task", "description": "Task description", "priority": "MEDIUM"}
  ],
  "reasoning": "Brief explanation of the plan"
}`;

    // Get Claude's task breakdown
    let taskDefinitions: Array<{ title: string; description: string; priority: TaskPriority }> = [];
    let reasoning = '';

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tmpFile = path.join(os.tmpdir(), `zen-plan-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, prompt);

      const command = `cat "${tmpFile}" | claude -p --output-format text`;
      const { stdout } = await execAsync(command, { timeout: 30000, maxBuffer: 1024 * 1024 });

      fs.unlinkSync(tmpFile);

      // Parse response
      const jsonMatch = stdout.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        taskDefinitions = parsed.tasks || [];
        reasoning = parsed.reasoning || '';
      }
    } catch (error) {
      console.error('Claude failed, using fallback task generation:', error);
      // Fallback: create generic tasks
      taskDefinitions = [
        { title: `Research and plan: ${goal}`, description: 'Research approach and create detailed plan', priority: 'HIGH' },
        { title: `Implement core functionality`, description: 'Build main features', priority: 'HIGH' },
        { title: `Testing and validation`, description: 'Test implementation thoroughly', priority: 'MEDIUM' },
        { title: `Documentation and cleanup`, description: 'Document changes and clean up', priority: 'LOW' },
      ];
    }

    // Create all tasks
    const taskIds: string[] = [];
    for (const taskDef of taskDefinitions) {
      const taskId = await this.createTodo(
        taskDef.title,
        taskDef.description,
        taskDef.priority,
        'TODO',
        projectPath,
        workingDirectory,
        gitRepo
      );

      // Link task to plan
      const todos = await this.getTodos();
      const task = todos.todos[taskId];
      if (task) {
        const updatedTask = { ...task, planId };
        const encrypted = await this.encryptData(updatedTask);
        await this.client.post('/v1/kv', {
          mutations: [{ key: `todo.${taskId}`, value: encrypted, version: todos.versions[`todo.${taskId}`] || 0 }]
        });
      }

      taskIds.push(taskId);
    }

    // Create plan
    const plan: Plan = {
      id: planId,
      title: goal,
      description,
      goal,
      status: 'PLANNING',
      taskIds,
      createdAt: now,
      updatedAt: now,
      projectPath,
      workingDirectory,
      gitRepo,
    };

    // Save plan
    const encrypted = await this.encryptData(plan);
    await this.client.post('/v1/kv', {
      mutations: [{ key: `plan.${planId}`, value: encrypted, version: -1 }]
    });

    return { planId, taskIds };
  }

  /**
   * Update a plan's status, title, or description
   */
  async updatePlan(
    planId: string,
    updates: {
      title?: string;
      description?: string;
      status?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    }
  ): Promise<void> {
    // Fetch plan
    const response = await this.client.get(`/v1/kv/plan.${planId}`);
    const plan = await this.decryptData(response.data.value) as Plan;
    const currentVersion = response.data.version;

    const now = Date.now();
    const updatedPlan: Plan = {
      ...plan,
      title: updates.title !== undefined ? updates.title : plan.title,
      description: updates.description !== undefined ? updates.description : plan.description,
      status: updates.status !== undefined ? updates.status : plan.status,
      updatedAt: now,
      completedAt: updates.status === 'COMPLETED' ? now : plan.completedAt,
    };

    // Save
    const encrypted = await this.encryptData(updatedPlan);
    await this.client.post('/v1/kv', {
      mutations: [{ key: `plan.${planId}`, value: encrypted, version: currentVersion }]
    });
  }

  /**
   * Get a plan by ID
   */
  async getPlan(planId: string): Promise<Plan> {
    const response = await this.client.get(`/v1/kv/plan.${planId}`);
    return await this.decryptData(response.data.value) as Plan;
  }

  /**
   * Toggle a subtask's done status
   */
  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    const todos = await this.getTodos();
    const task = todos.todos[taskId];

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!task.subtasks) {
      throw new Error(`Task ${taskId} has no subtasks`);
    }

    const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex === -1) {
      throw new Error(`Subtask ${subtaskId} not found in task ${taskId}`);
    }

    const now = Date.now();
    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      done: !updatedSubtasks[subtaskIndex].done,
      updatedAt: now,
    };

    const updatedTask: TodoItem = {
      ...task,
      subtasks: updatedSubtasks,
      updatedAt: now,
    };

    // Encrypt and update
    const encrypted = await this.encryptData(updatedTask);
    const currentVersion = todos.versions[`todo.${taskId}`] || 0;

    await this.client.post('/v1/kv', {
      mutations: [{
        key: `todo.${taskId}`,
        value: encrypted,
        version: currentVersion,
      }]
    });
  }

  /**
   * Rebuild the index from scratch based on all todos
   */
  async rebuildIndex(): Promise<{ added: number; removed: number }> {
    const todos = await this.getTodos();

    // Build correct orders from current todos
    const allTodoIds = Object.keys(todos.todos);
    const newUndoneOrder: string[] = [];
    const newCompletedOrder: string[] = [];

    // Sort todos by creation time
    const sortedTodos = Object.values(todos.todos).sort((a, b) => a.createdAt - b.createdAt);

    for (const todo of sortedTodos) {
      if (todo.done) {
        newCompletedOrder.push(todo.id);
      } else {
        newUndoneOrder.push(todo.id);
      }
    }

    // Calculate diff
    const oldUndone = new Set(todos.undoneOrder);
    const newUndone = new Set(newUndoneOrder);
    const added = newUndoneOrder.filter(id => !oldUndone.has(id)).length;
    const removed = todos.undoneOrder.filter(id => !newUndone.has(id)).length;

    // Update index
    const newIndex = {
      undoneOrder: newUndoneOrder,
      completedOrder: newCompletedOrder,
    };

    const encrypted = await this.encryptData(newIndex);
    const indexVersion = todos.versions['todo.index'] || -1;

    await this.client.post('/v1/kv', {
      mutations: [{
        key: 'todo.index',
        value: encrypted,
        version: indexVersion,
      }]
    });

    return { added, removed };
  }

  /**
   * Helper: Update index (add/remove/move todo)
   */
  private async updateIndex(
    todoId: string,
    operation: 'add' | 'remove' | 'move',
    isDone: boolean
  ): Promise<void> {
    try {
      let currentIndex = {
        undoneOrder: [] as string[],
        completedOrder: [] as string[],
      };
      let indexVersion = -1;

      // Get current index (handle 404 gracefully)
      try {
        const indexResponse = await this.client.get('/v1/kv/todo.index');
        if (indexResponse.data) {
          indexVersion = indexResponse.data.version;
          currentIndex = await this.decryptData(indexResponse.data.value);
        }
      } catch (error: any) {
        // 404 is fine - index doesn't exist yet, will create new one
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // Apply operation
      let newUndoneOrder = currentIndex.undoneOrder.filter(id => id !== todoId);
      let newCompletedOrder = currentIndex.completedOrder.filter(id => id !== todoId);

      if (operation === 'add') {
        newUndoneOrder.push(todoId);
      } else if (operation === 'move') {
        if (isDone) {
          newCompletedOrder.unshift(todoId); // Add to beginning
        } else {
          newUndoneOrder.push(todoId); // Add to end
        }
      }
      // 'remove' just filters out, already done above

      const updatedIndex = {
        undoneOrder: newUndoneOrder,
        completedOrder: newCompletedOrder,
      };

      // Encrypt and save
      const encrypted = await this.encryptData(updatedIndex);
      await this.client.post('/v1/kv', {
        mutations: [{
          key: 'todo.index',
          value: encrypted,
          version: indexVersion,
        }]
      });
    } catch (error) {
      console.error('Failed to update index:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using ZenFlo's secretbox encryption (EXACT match to mobile app)
   * Matches: happy-mobile/sources/encryption/libsodium.ts:encryptSecretBox
   */
  private async encryptData(data: any): Promise<string> {
    if (!this.masterSecret) {
      throw new Error('Master secret not configured. Cannot encrypt data.');
    }

    // Step 1: JSON.stringify (same as Happy app)
    const jsonString = JSON.stringify(data);

    // Step 2: Convert to UTF-8 bytes using TextEncoder (same as Happy app)
    const messageBytes = new TextEncoder().encode(jsonString);

    // Step 3: Generate random nonce (24 bytes)
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // Step 4: Encrypt using secretbox
    const encrypted = nacl.secretbox(messageBytes, nonce, this.masterSecret);

    // Step 5: Combine nonce + encrypted data
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    // Step 6: Base64 encode (same as encryptRaw in encryption.ts)
    return naclUtil.encodeBase64(combined);
  }

  /**
   * Decrypt data using ZenFlo's secretbox encryption (EXACT match to mobile app)
   * Matches: happy-mobile/sources/encryption/libsodium.ts:decryptSecretBox
   */
  private async decryptData(encrypted: string): Promise<any> {
    if (!this.masterSecret) {
      throw new Error('Master secret not configured. Cannot decrypt data.');
    }

    try {
      // Step 1: Decode from base64 (reverse of encryptRaw)
      const data = naclUtil.decodeBase64(encrypted);

      // Step 2: Extract nonce (first 24 bytes)
      const nonce = data.slice(0, nacl.secretbox.nonceLength);

      // Step 3: Extract encrypted data (rest of bytes)
      const ciphertext = data.slice(nacl.secretbox.nonceLength);

      // Step 4: Decrypt using secretbox
      const decrypted = nacl.secretbox.open(ciphertext, nonce, this.masterSecret);

      if (!decrypted) {
        throw new Error('Decryption failed - invalid data or key');
      }

      // Step 5: Decode UTF-8 bytes to string
      const jsonString = new TextDecoder().decode(decrypted);

      // Step 6: Parse JSON
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate UUID (simple implementation)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// ============================================================================
// MCP Server Implementation
// ============================================================================

const server = new Server(
  {
    name: 'zen-mode-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const apiClient = new ZenFloApiClient();

// Initialize authentication from environment variables
// Support both ZENFLO_* (new) and HAPPY_* (legacy) env vars
const authToken = process.env.ZENFLO_AUTH_TOKEN || process.env.HAPPY_AUTH_TOKEN;
const secretKeyStr = process.env.ZENFLO_SECRET_KEY || process.env.HAPPY_SECRET_KEY;

if (authToken) {
  // Parse secret key for encryption if provided
  let masterSecret: Uint8Array | undefined;
  if (secretKeyStr) {
    try {
      masterSecret = parseSecretKey(secretKeyStr);
      console.error('Master secret parsed successfully for encryption');
    } catch (error) {
      console.error(`Failed to parse secret key: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Encryption will not be available');
    }
  } else {
    console.error('WARNING: ZENFLO_SECRET_KEY (or HAPPY_SECRET_KEY) not set. Encryption will not be available.');
  }

  apiClient.setAuth(authToken, masterSecret);
} else {
  console.error('WARNING: ZENFLO_AUTH_TOKEN (or HAPPY_AUTH_TOKEN) not set. Please configure authentication.');
}

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Tool[] = [
  {
    name: 'list_tasks',
    description: 'List all tasks from Zen mode. Returns tasks with status, priority, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
          description: 'Filter by task status (optional)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Filter by priority (optional)',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in Zen mode',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title (short summary)',
        },
        description: {
          type: 'string',
          description: 'Task description (detailed context, multi-line allowed)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Task priority level (optional, defaults to MEDIUM)',
        },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS'],
          description: 'Initial task status (optional, defaults to TODO)',
        },
        project_path: {
          type: 'string',
          description: 'Absolute path to project/repo (e.g., "/Users/quinnmay/developer/happy")',
        },
        working_directory: {
          type: 'string',
          description: 'Specific subdirectory within project (e.g., "happy-mobile")',
        },
        git_remote: {
          type: 'string',
          description: 'Git remote URL (optional)',
        },
        git_branch: {
          type: 'string',
          description: 'Git branch name (optional)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_task',
    description: 'Get details of a specific task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update task status, priority, title, description, or project context',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID',
        },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
          description: 'New task status (optional)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'New priority level (optional)',
        },
        title: {
          type: 'string',
          description: 'New task title (optional)',
        },
        description: {
          type: 'string',
          description: 'New task description (optional)',
        },
        project_path: {
          type: 'string',
          description: 'New project path (optional)',
        },
        working_directory: {
          type: 'string',
          description: 'New working directory (optional)',
        },
        git_remote: {
          type: 'string',
          description: 'New git remote URL (optional)',
        },
        git_branch: {
          type: 'string',
          description: 'New git branch (optional)',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'rebuild_index',
    description: 'Rebuild the task index from scratch. Use this to fix sync issues when tasks exist but don\'t appear in the UI.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'analyze_task_complexity',
    description: 'Analyze a task to determine if it\'s complex enough to benefit from AI breakdown into subtasks',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID to analyze',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'suggest_subtasks',
    description: 'Use AI to analyze a task and suggest subtasks for breaking it down. Returns suggested subtasks with estimates.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID to break down',
        },
        max_subtasks: {
          type: 'number',
          description: 'Maximum number of subtasks to suggest (default: 5)',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'add_subtask',
    description: 'Add a subtask to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Parent task ID',
        },
        subtask_title: {
          type: 'string',
          description: 'Subtask title',
        },
      },
      required: ['task_id', 'subtask_title'],
    },
  },
  {
    name: 'toggle_subtask',
    description: 'Toggle a subtask completion status',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Parent task ID',
        },
        subtask_id: {
          type: 'string',
          description: 'Subtask ID to toggle',
        },
      },
      required: ['task_id', 'subtask_id'],
    },
  },
  {
    name: 'create_plan',
    description: 'Create a new plan with AI-generated tasks. The AI will break down the goal into actionable tasks automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'High-level goal/objective for the plan',
        },
        description: {
          type: 'string',
          description: 'Additional context or requirements (optional)',
        },
        max_tasks: {
          type: 'number',
          description: 'Maximum number of tasks to generate (default: 5)',
        },
        project_path: {
          type: 'string',
          description: 'Absolute path to project/repo (optional)',
        },
        working_directory: {
          type: 'string',
          description: 'Specific subdirectory within project (optional)',
        },
        git_remote: {
          type: 'string',
          description: 'Git remote URL (optional)',
        },
        git_branch: {
          type: 'string',
          description: 'Git branch name (optional)',
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'update_plan',
    description: 'Update a plan\'s status, title, or description',
    inputSchema: {
      type: 'object',
      properties: {
        plan_id: {
          type: 'string',
          description: 'Plan ID',
        },
        title: {
          type: 'string',
          description: 'New plan title (optional)',
        },
        description: {
          type: 'string',
          description: 'New plan description (optional)',
        },
        status: {
          type: 'string',
          enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          description: 'New plan status (optional)',
        },
      },
      required: ['plan_id'],
    },
  },
  {
    name: 'get_plan',
    description: 'Get details of a specific plan including all attached tasks',
    inputSchema: {
      type: 'object',
      properties: {
        plan_id: {
          type: 'string',
          description: 'Plan ID',
        },
      },
      required: ['plan_id'],
    },
  },
  {
    name: 'list_todo_tasks',
    description: 'List only TODO tasks, sorted by priority (URGENT → HIGH → MEDIUM → LOW). More focused than list_tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Filter by specific priority (optional)',
        },
      },
    },
  },
  {
    name: 'list_in_progress_tasks',
    description: 'List only IN_PROGRESS tasks, sorted by most recently updated. Should typically show only 1-2 tasks.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_completed_tasks',
    description: 'List only DONE tasks with pagination, sorted by completion date (most recent first). Use this to review recent work.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 10, max: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of tasks to skip for pagination (default: 0)',
        },
      },
    },
  },
  {
    name: 'list_cancelled_tasks',
    description: 'List only CANCELLED tasks with pagination, sorted by cancellation date (most recent first).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 10, max: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of tasks to skip for pagination (default: 0)',
        },
      },
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_tasks': {
        const todos = await apiClient.getTodos();
        const filterStatus = args?.status as TaskStatus | undefined;
        const filterPriority = args?.priority as TaskPriority | undefined;

        // Filter and format tasks
        let tasks = Object.values(todos.todos);

        if (filterStatus) {
          tasks = tasks.filter((t) => t.status === filterStatus);
        }
        if (filterPriority) {
          tasks = tasks.filter((t) => t.priority === filterPriority);
        }

        // Sort: undone tasks first (by undoneOrder), then done tasks (by doneOrder)
        const undone = tasks
          .filter((t) => !t.done)
          .sort(
            (a, b) =>
              todos.undoneOrder.indexOf(a.id) - todos.undoneOrder.indexOf(b.id)
          );
        const done = tasks
          .filter((t) => t.done)
          .sort(
            (a, b) => todos.doneOrder.indexOf(a.id) - todos.doneOrder.indexOf(b.id)
          );
        const sorted = [...undone, ...done];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: sorted.length,
                  tasks: sorted.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority || 'MEDIUM',
                    done: t.done,
                    createdAt: new Date(t.createdAt).toISOString(),
                    updatedAt: new Date(t.updatedAt).toISOString(),
                    completedAt: t.completedAt
                      ? new Date(t.completedAt).toISOString()
                      : undefined,
                    linkedSessions: t.linkedSessions
                      ? Object.keys(t.linkedSessions).length
                      : 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_task': {
        const title = args?.title as string;
        const description = args?.description as string | undefined;
        const priority = args?.priority as TaskPriority | undefined;
        const status = args?.status as TaskStatus | undefined;
        const projectPath = args?.project_path as string | undefined;
        const workingDirectory = args?.working_directory as string | undefined;
        const gitRemote = args?.git_remote as string | undefined;
        const gitBranch = args?.git_branch as string | undefined;

        if (!title) {
          throw new Error('Task title is required');
        }

        // Build gitRepo object if both remote and branch are provided
        const gitRepo = gitRemote && gitBranch ? { remote: gitRemote, branch: gitBranch } : undefined;

        const taskId = await apiClient.createTodo(title, description, priority, status, projectPath, workingDirectory, gitRepo);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                message: `Task created: ${title}`,
              }),
            },
          ],
        };
      }

      case 'get_task': {
        const taskId = args?.task_id as string;

        if (!taskId) {
          throw new Error('task_id is required');
        }

        const todos = await apiClient.getTodos();
        const task = todos.todos[taskId];

        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority || 'MEDIUM',
                  done: task.done,
                  createdAt: new Date(task.createdAt).toISOString(),
                  updatedAt: new Date(task.updatedAt).toISOString(),
                  completedAt: task.completedAt
                    ? new Date(task.completedAt).toISOString()
                    : undefined,
                  cancelledAt: task.cancelledAt
                    ? new Date(task.cancelledAt).toISOString()
                    : undefined,
                  linkedSessions: task.linkedSessions || {},
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'update_task': {
        const taskId = args?.task_id as string;
        const status = args?.status as TaskStatus | undefined;
        const priority = args?.priority as TaskPriority | undefined;
        const title = args?.title as string | undefined;
        const description = args?.description as string | undefined;
        const projectPath = args?.project_path as string | undefined;
        const workingDirectory = args?.working_directory as string | undefined;
        const gitRemote = args?.git_remote as string | undefined;
        const gitBranch = args?.git_branch as string | undefined;

        if (!taskId) {
          throw new Error('task_id is required');
        }

        // Build gitRepo object if either remote or branch is provided
        let gitRepo: { remote: string; branch: string } | undefined;
        if (gitRemote || gitBranch) {
          // Get current task to fill in missing git values
          const todos = await apiClient.getTodos();
          const currentTask = todos.todos[taskId];
          gitRepo = {
            remote: gitRemote || currentTask?.gitRepo?.remote || '',
            branch: gitBranch || currentTask?.gitRepo?.branch || '',
          };
        }

        await apiClient.updateTodo(taskId, { status, priority, title, description, projectPath, workingDirectory, gitRepo });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                message: 'Task updated successfully',
              }),
            },
          ],
        };
      }

      case 'delete_task': {
        const taskId = args?.task_id as string;

        if (!taskId) {
          throw new Error('task_id is required');
        }

        await apiClient.deleteTodo(taskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                message: 'Task deleted successfully',
              }),
            },
          ],
        };
      }

      case 'rebuild_index': {
        const result = await apiClient.rebuildIndex();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                added: result.added,
                removed: result.removed,
                message: `Index rebuilt: ${result.added} tasks added, ${result.removed} tasks removed`,
              }),
            },
          ],
        };
      }

      case 'analyze_task_complexity': {
        const taskId = args?.task_id as string;

        if (!taskId) {
          throw new Error('task_id is required');
        }

        const analysis = await apiClient.analyzeTaskComplexity(taskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                ...analysis,
              }, null, 2),
            },
          ],
        };
      }

      case 'suggest_subtasks': {
        const taskId = args?.task_id as string;
        const maxSubtasks = (args?.max_subtasks as number) || 5;

        if (!taskId) {
          throw new Error('task_id is required');
        }

        const suggestions = await apiClient.suggestSubtasks(taskId, maxSubtasks);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                ...suggestions,
              }, null, 2),
            },
          ],
        };
      }

      case 'add_subtask': {
        const taskId = args?.task_id as string;
        const subtaskTitle = args?.subtask_title as string;

        if (!taskId || !subtaskTitle) {
          throw new Error('task_id and subtask_title are required');
        }

        const subtaskId = await apiClient.addSubtask(taskId, subtaskTitle);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                subtask_id: subtaskId,
                message: `Subtask added: ${subtaskTitle}`,
              }),
            },
          ],
        };
      }

      case 'toggle_subtask': {
        const taskId = args?.task_id as string;
        const subtaskId = args?.subtask_id as string;

        if (!taskId || !subtaskId) {
          throw new Error('task_id and subtask_id are required');
        }

        await apiClient.toggleSubtask(taskId, subtaskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                subtask_id: subtaskId,
                message: 'Subtask toggled successfully',
              }),
            },
          ],
        };
      }

      case 'create_plan': {
        const goal = args?.goal as string;
        const description = args?.description as string | undefined;
        const maxTasks = args?.max_tasks as number | undefined;
        const projectPath = args?.project_path as string | undefined;
        const workingDirectory = args?.working_directory as string | undefined;
        const gitRemote = args?.git_remote as string | undefined;
        const gitBranch = args?.git_branch as string | undefined;

        if (!goal) {
          throw new Error('goal is required');
        }

        const gitRepo = gitRemote && gitBranch ? { remote: gitRemote, branch: gitBranch } : undefined;

        const result = await apiClient.createPlan(goal, description, maxTasks, projectPath, workingDirectory, gitRepo);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                plan_id: result.planId,
                task_ids: result.taskIds,
                message: `Plan created with ${result.taskIds.length} tasks`,
              }, null, 2),
            },
          ],
        };
      }

      case 'update_plan': {
        const planId = args?.plan_id as string;
        const title = args?.title as string | undefined;
        const description = args?.description as string | undefined;
        const status = args?.status as 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | undefined;

        if (!planId) {
          throw new Error('plan_id is required');
        }

        await apiClient.updatePlan(planId, { title, description, status });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                plan_id: planId,
                message: 'Plan updated successfully',
              }),
            },
          ],
        };
      }

      case 'get_plan': {
        const planId = args?.plan_id as string;

        if (!planId) {
          throw new Error('plan_id is required');
        }

        const plan = await apiClient.getPlan(planId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: plan.id,
                  title: plan.title,
                  description: plan.description,
                  goal: plan.goal,
                  status: plan.status,
                  taskIds: plan.taskIds,
                  taskCount: plan.taskIds.length,
                  createdAt: new Date(plan.createdAt).toISOString(),
                  updatedAt: new Date(plan.updatedAt).toISOString(),
                  completedAt: plan.completedAt ? new Date(plan.completedAt).toISOString() : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_todo_tasks': {
        const todos = await apiClient.getTodos();
        const filterPriority = args?.priority as TaskPriority | undefined;

        // Filter for TODO tasks only
        let tasks = Object.values(todos.todos).filter((t) => t.status === 'TODO');

        if (filterPriority) {
          tasks = tasks.filter((t) => t.priority === filterPriority);
        }

        // Sort by priority: URGENT → HIGH → MEDIUM → LOW
        const priorityOrder: Record<TaskPriority, number> = {
          URGENT: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };

        tasks.sort((a, b) => {
          const aPriority = a.priority || 'MEDIUM';
          const bPriority = b.priority || 'MEDIUM';
          return priorityOrder[aPriority] - priorityOrder[bPriority];
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: tasks.length,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'MEDIUM',
                    createdAt: new Date(t.createdAt).toISOString(),
                    updatedAt: new Date(t.updatedAt).toISOString(),
                    linkedSessions: t.linkedSessions
                      ? Object.keys(t.linkedSessions).length
                      : 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_in_progress_tasks': {
        const todos = await apiClient.getTodos();

        // Filter for IN_PROGRESS tasks only
        let tasks = Object.values(todos.todos).filter((t) => t.status === 'IN_PROGRESS');

        // Sort by most recently updated
        tasks.sort((a, b) => b.updatedAt - a.updatedAt);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: tasks.length,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'MEDIUM',
                    createdAt: new Date(t.createdAt).toISOString(),
                    updatedAt: new Date(t.updatedAt).toISOString(),
                    linkedSessions: t.linkedSessions
                      ? Object.keys(t.linkedSessions).length
                      : 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_completed_tasks': {
        const todos = await apiClient.getTodos();
        const limit = Math.min((args?.limit as number) || 10, 50);
        const offset = (args?.offset as number) || 0;

        // Filter for DONE tasks only
        let tasks = Object.values(todos.todos).filter((t) => t.status === 'DONE');

        // Sort by completion date (most recent first)
        tasks.sort((a, b) => {
          const aTime = a.completedAt || a.updatedAt;
          const bTime = b.completedAt || b.updatedAt;
          return bTime - aTime;
        });

        // Paginate
        const total = tasks.length;
        const paginated = tasks.slice(offset, offset + limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total,
                  limit,
                  offset,
                  hasMore: offset + limit < total,
                  tasks: paginated.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'MEDIUM',
                    createdAt: new Date(t.createdAt).toISOString(),
                    completedAt: t.completedAt
                      ? new Date(t.completedAt).toISOString()
                      : new Date(t.updatedAt).toISOString(),
                    linkedSessions: t.linkedSessions
                      ? Object.keys(t.linkedSessions).length
                      : 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_cancelled_tasks': {
        const todos = await apiClient.getTodos();
        const limit = Math.min((args?.limit as number) || 10, 50);
        const offset = (args?.offset as number) || 0;

        // Filter for CANCELLED tasks only
        let tasks = Object.values(todos.todos).filter((t) => t.status === 'CANCELLED');

        // Sort by cancellation date (most recent first)
        tasks.sort((a, b) => {
          const aTime = a.cancelledAt || a.updatedAt;
          const bTime = b.cancelledAt || b.updatedAt;
          return bTime - aTime;
        });

        // Paginate
        const total = tasks.length;
        const paginated = tasks.slice(offset, offset + limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total,
                  limit,
                  offset,
                  hasMore: offset + limit < total,
                  tasks: paginated.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'MEDIUM',
                    createdAt: new Date(t.createdAt).toISOString(),
                    cancelledAt: t.cancelledAt
                      ? new Date(t.cancelledAt).toISOString()
                      : new Date(t.updatedAt).toISOString(),
                    linkedSessions: t.linkedSessions
                      ? Object.keys(t.linkedSessions).length
                      : 0,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            success: false,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Zen Mode MCP Server started successfully');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
