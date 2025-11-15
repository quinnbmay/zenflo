/**
 * Zen Mode MCP Server - Cloudflare Worker
 *
 * Created: 2025-11-07
 * Author: Quinn May
 * Backend: ZenFlo NAS (api.zenflo.dev)
 *
 * HTTP-based MCP server for Happy's Zen Mode task management.
 * Replaces iOS Task Manager with unified task system.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

interface Env {
  // No environment variables needed - auth is per-request
}

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
}

interface TodoState {
  items: TodoItem[];
  order: string[];
}

// Base32 decoding
function parseSecretKey(secretStr: string): Uint8Array {
  let normalized = secretStr.toUpperCase()
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B')
    .replace(/9/g, 'G');

  const cleaned = normalized.replace(/[^A-Z2-7]/g, '');

  const bytes: number[] = [];
  let buffer = 0;
  let bufferLength = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;

    buffer = (buffer << 5) | value;
    bufferLength += 5;

    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }

  return new Uint8Array(bytes.slice(0, 32));
}

// Base64 encoding utilities
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate JWT token from secret
async function generateToken(secretStr: string): Promise<string> {
  const seed = parseSecretKey(secretStr);

  // Use @noble/ed25519 for Ed25519 operations
  const ed25519 = await import('@noble/ed25519');

  // In @noble/ed25519 v3, the seed IS the private key (32 bytes)
  const privateKey = seed;
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  // Generate random challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Sign the challenge
  const signature = await ed25519.signAsync(challenge, privateKey);

  // Send auth request to ZenFlo backend
  const response = await fetch('https://api.zenflo.dev/v1/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge: arrayBufferToBase64(challenge),
      signature: arrayBufferToBase64(signature),
      publicKey: arrayBufferToBase64(publicKey),
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.statusText}`);
  }

  const data = await response.json() as { token: string };
  return data.token;
}

// Happy API Client
class HappyApiClient {
  constructor(private token: string) {}

  async getTodos(): Promise<TodoState> {
    const queryParams = new URLSearchParams({
      prefix: 'todo.',
      limit: '1000',
    });

    const response = await fetch(`https://api.zenflo.dev/v1/kv?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch todos: ${response.statusText}`);
    }

    const data = await response.json() as { items: Array<{ key: string; value: string }> };
    const kvItems = data.items || [];

    const items: TodoItem[] = [];
    let order: string[] = [];

    for (const item of kvItems) {
      if (item.key === 'todo.order' || item.key === 'todo.index') {
        // Skip order/index keys for now
        continue;
      } else if (item.key.startsWith('todo.')) {
        try {
          // Try to decode base64 JSON
          const decoded = atob(item.value);
          const todoItem = JSON.parse(decoded) as TodoItem;
          items.push(todoItem);
        } catch {
          // If base64 decode fails, try direct JSON parse
          try {
            const todoItem = JSON.parse(item.value) as TodoItem;
            items.push(todoItem);
          } catch {
            // Skip encrypted items
            continue;
          }
        }
      }
    }

    return { items, order };
  }

  async createTodo(title: string, priority?: string, status?: string): Promise<TodoItem> {
    // Generate proper UUID like Happy app does
    const id = crypto.randomUUID();
    const now = Date.now();

    const newItem: TodoItem = {
      id,
      title,
      done: false,
      status: (status as any) || 'TODO',
      priority: priority as any,
      createdAt: now,
      updatedAt: now,
    };

    // Base64 encode like Happy app does for unencrypted tasks
    const itemJson = JSON.stringify(newItem);
    const encoded = btoa(itemJson);

    // Save with proper key: todo.{uuid}
    await fetch('https://api.zenflo.dev/v1/kv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: `todo.${id}`,
        value: encoded,
      }),
    });

    return newItem;
  }

  async updateTodo(taskId: string, updates: { status?: string; priority?: string; title?: string }): Promise<TodoItem> {
    const state = await this.getTodos();
    const item = state.items.find(i => i.id === taskId);

    if (!item) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const now = Date.now();
    const updatedItem: TodoItem = {
      ...item,
      ...updates,
      updatedAt: now,
      done: updates.status === 'DONE' || updates.status === 'CANCELLED',
    };

    if (updates.status === 'DONE' && !item.completedAt) {
      updatedItem.completedAt = now;
    }
    if (updates.status === 'CANCELLED' && !item.cancelledAt) {
      updatedItem.cancelledAt = now;
    }

    // Base64 encode like ZenFlo app
    const itemJson = JSON.stringify(updatedItem);
    const encoded = btoa(itemJson);

    await fetch('https://api.zenflo.dev/v1/kv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: `todo.${taskId}`,
        value: encoded,
      }),
    });

    return updatedItem;
  }

  async deleteTodo(taskId: string): Promise<void> {
    // Delete item with proper key format
    await fetch(`https://api.zenflo.dev/v1/kv/todo.${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      if (request.method === 'GET') {
        // Tool discovery
        return new Response(JSON.stringify({
          name: 'zen-mode',
          version: '1.0.0',
          description: 'Happy Zen Mode task management MCP server',
          tools: [
            {
              name: 'list_tasks',
              description: 'List all tasks with optional filters',
              inputSchema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                },
              },
            },
            {
              name: 'create_task',
              description: 'Create a new task',
              inputSchema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS'] },
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
                  task_id: { type: 'string' },
                },
                required: ['task_id'],
              },
            },
            {
              name: 'update_task',
              description: 'Update an existing task',
              inputSchema: {
                type: 'object',
                properties: {
                  task_id: { type: 'string' },
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                  title: { type: 'string' },
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
                  task_id: { type: 'string' },
                },
                required: ['task_id'],
              },
            },
          ],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json() as { tool: string; arguments: any; secret?: string };

          // Get token from Authorization header or generate from secret
          let token = request.headers.get('Authorization')?.replace('Bearer ', '');
          const secretHeader = request.headers.get('X-Secret');
          const secret = body.secret || secretHeader;

          if (!token && secret) {
            token = await generateToken(secret);
          }

          if (!token) {
            return new Response(JSON.stringify({ error: 'Missing authentication' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const client = new HappyApiClient(token);

          // Handle tool calls
          switch (body.tool) {
            case 'list_tasks': {
              const state = await client.getTodos();
              let items = state.items;

              if (body.arguments?.status) {
                items = items.filter(i => i.status === body.arguments.status);
              }
              if (body.arguments?.priority) {
                items = items.filter(i => i.priority === body.arguments.priority);
              }

              return new Response(JSON.stringify({
                total: items.length,
                tasks: items,
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            case 'create_task': {
              const item = await client.createTodo(
                body.arguments.title,
                body.arguments.priority,
                body.arguments.status
              );

              return new Response(JSON.stringify({ task: item }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            case 'get_task': {
              const state = await client.getTodos();
              const item = state.items.find(i => i.id === body.arguments.task_id);

              if (!item) {
                return new Response(JSON.stringify({ error: 'Task not found' }), {
                  status: 404,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              return new Response(JSON.stringify({ task: item }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            case 'update_task': {
              const updates: any = {};
              if (body.arguments.status) updates.status = body.arguments.status;
              if (body.arguments.priority) updates.priority = body.arguments.priority;
              if (body.arguments.title) updates.title = body.arguments.title;

              const item = await client.updateTodo(body.arguments.task_id, updates);

              return new Response(JSON.stringify({ task: item }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            case 'delete_task': {
              await client.deleteTodo(body.arguments.task_id);

              return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            default:
              return new Response(JSON.stringify({ error: 'Unknown tool' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
          }
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
