/**
 * Zen Mode MCP HTTP Server
 *
 * HTTP-based MCP server for Happy's Zen Mode task management.
 * Deployed to Railway for easy URL-based access.
 *
 * Created: 2025-11-07
 * Author: Quinn May
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Types
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  status: TaskStatus;
  priority?: TaskPriority;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
}

// Base32 alphabet for secret key decoding
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

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

async function generateToken(secretStr: string): Promise<string> {
  const secret = parseSecretKey(secretStr);
  const keypair = nacl.sign.keyPair.fromSeed(secret);
  const challenge = nacl.randomBytes(32);
  const signature = nacl.sign.detached(challenge, keypair.secretKey);

  const response = await axios.post('https://zenflo.combinedmemory.com/v1/auth', {
    challenge: naclUtil.encodeBase64(challenge),
    signature: naclUtil.encodeBase64(signature),
    publicKey: naclUtil.encodeBase64(keypair.publicKey),
  });

  return response.data.token;
}

// Happy API client
class HappyApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getTodos() {
    const response = await axios.get('https://happy.combinedmemory.com/v1/kv', {
      params: { prefix: 'todo.', limit: 1000 },
      headers: { Authorization: `Bearer ${this.token}` }
    });

    const todos: Record<string, TodoItem> = {};
    const versions: Record<string, number> = {};
    let undoneOrder: string[] = [];
    let doneOrder: string[] = [];

    for (const item of response.data.items || []) {
      versions[item.key] = item.version;

      try {
        const decrypted = JSON.parse(Buffer.from(item.value, 'base64').toString());

        if (item.key === 'todo.index') {
          undoneOrder = decrypted.undoneOrder || [];
          doneOrder = decrypted.completedOrder || [];
        } else {
          const todoId = item.key.replace('todo.', '');
          if (todoId !== 'index') {
            todos[todoId] = decrypted;
          }
        }
      } catch (err) {
        console.error(`Failed to decrypt ${item.key}:`, err);
      }
    }

    return { todos, undoneOrder, doneOrder, versions };
  }

  async createTodo(title: string, priority?: TaskPriority, status?: TaskStatus) {
    const id = crypto.randomUUID();
    const now = Date.now();

    const todo: TodoItem = {
      id,
      title,
      done: false,
      status: status || 'TODO',
      priority,
      createdAt: now,
      updatedAt: now,
    };

    const encrypted = Buffer.from(JSON.stringify(todo)).toString('base64');

    await axios.post('https://happy.combinedmemory.com/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: encrypted,
        version: -1
      }]
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    // Update index
    await this.updateIndex(id, 'add', false);

    return id;
  }

  async updateTodo(id: string, updates: { status?: TaskStatus; priority?: TaskPriority; title?: string }) {
    const { todos, versions } = await this.getTodos();
    const todo = todos[id];
    if (!todo) throw new Error(`Todo ${id} not found`);

    const now = Date.now();
    const newStatus = updates.status !== undefined ? updates.status : todo.status;
    const newDone = newStatus === 'DONE' || newStatus === 'CANCELLED';

    const updated: TodoItem = {
      ...todo,
      title: updates.title !== undefined ? updates.title : todo.title,
      status: newStatus,
      priority: updates.priority !== undefined ? updates.priority : todo.priority,
      done: newDone,
      updatedAt: now,
      completedAt: newStatus === 'DONE' ? now : todo.completedAt,
      cancelledAt: newStatus === 'CANCELLED' ? now : todo.cancelledAt,
    };

    const encrypted = Buffer.from(JSON.stringify(updated)).toString('base64');
    const version = versions[`todo.${id}`] || 0;

    await axios.post('https://happy.combinedmemory.com/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: encrypted,
        version
      }]
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    if (newDone !== todo.done) {
      await this.updateIndex(id, 'move', newDone);
    }
  }

  async deleteTodo(id: string) {
    const { versions } = await this.getTodos();
    const version = versions[`todo.${id}`] || 0;

    await axios.post('https://happy.combinedmemory.com/v1/kv', {
      mutations: [{
        key: `todo.${id}`,
        value: null,
        version
      }]
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    await this.updateIndex(id, 'remove', false);
  }

  private async updateIndex(todoId: string, operation: 'add' | 'remove' | 'move', isDone: boolean) {
    const response = await axios.get(`https://happy.combinedmemory.com/v1/kv/todo.index`, {
      headers: { Authorization: `Bearer ${this.token}` }
    }).catch(() => ({ data: null, status: 404 }));

    let index = { undoneOrder: [] as string[], completedOrder: [] as string[] };
    let indexVersion = -1;

    if (response.data && response.status !== 404) {
      indexVersion = response.data.version;
      index = JSON.parse(Buffer.from(response.data.value, 'base64').toString());
    }

    let newUndone = index.undoneOrder.filter(id => id !== todoId);
    let newCompleted = index.completedOrder.filter(id => id !== todoId);

    if (operation === 'add') {
      newUndone.push(todoId);
    } else if (operation === 'move') {
      if (isDone) {
        newCompleted.unshift(todoId);
      } else {
        newUndone.push(todoId);
      }
    }

    const updated = { undoneOrder: newUndone, completedOrder: newCompleted };
    const encrypted = Buffer.from(JSON.stringify(updated)).toString('base64');

    await axios.post('https://happy.combinedmemory.com/v1/kv', {
      mutations: [{
        key: 'todo.index',
        value: encrypted,
        version: indexVersion
      }]
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }
}

// MCP endpoints
app.get('/mcp', (req, res) => {
  res.json({
    name: 'zen-mode',
    version: '1.0.0',
    description: 'Happy Zen Mode task management MCP server',
    tools: [
      {
        name: 'list_tasks',
        description: 'List all tasks',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }
          }
        }
      },
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS'] }
          },
          required: ['title']
        }
      },
      {
        name: 'get_task',
        description: 'Get task details',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'update_task',
        description: 'Update task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            title: { type: 'string' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'delete_task',
        description: 'Delete task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string' }
          },
          required: ['task_id']
        }
      }
    ]
  });
});

app.post('/mcp', async (req, res) => {
  try {
    const { tool, arguments: args, secret } = req.body;

    // Generate JWT from secret if provided
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (secret && !token) {
      token = await generateToken(secret);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = new HappyApiClient(token);

    switch (tool) {
      case 'list_tasks': {
        const { todos, undoneOrder, doneOrder } = await client.getTodos();
        let tasks = Object.values(todos);

        if (args?.status) {
          tasks = tasks.filter(t => t.status === args.status);
        }
        if (args?.priority) {
          tasks = tasks.filter(t => t.priority === args.priority);
        }

        const undone = tasks.filter(t => !t.done).sort((a, b) =>
          undoneOrder.indexOf(a.id) - undoneOrder.indexOf(b.id)
        );
        const done = tasks.filter(t => t.done).sort((a, b) =>
          doneOrder.indexOf(a.id) - doneOrder.indexOf(b.id)
        );

        return res.json({ total: tasks.length, tasks: [...undone, ...done] });
      }

      case 'create_task': {
        const taskId = await client.createTodo(args.title, args.priority, args.status);
        return res.json({ success: true, task_id: taskId });
      }

      case 'get_task': {
        const { todos } = await client.getTodos();
        const task = todos[args.task_id];
        if (!task) return res.status(404).json({ error: 'Task not found' });
        return res.json(task);
      }

      case 'update_task': {
        await client.updateTodo(args.task_id, {
          status: args.status,
          priority: args.priority,
          title: args.title
        });
        return res.json({ success: true });
      }

      case 'delete_task': {
        await client.deleteTodo(args.task_id);
        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Unknown tool' });
    }
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Zen Mode MCP HTTP Server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});
