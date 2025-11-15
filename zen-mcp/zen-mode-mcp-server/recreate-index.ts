/**
 * Recreate todo.index with proper encryption
 *
 * This script fixes the broken Zen Mode by:
 * 1. Fetching all existing todo items from backend
 * 2. Separating them into undone and completed arrays
 * 3. Creating properly encrypted index
 * 4. Writing index at version 9 to fix version conflict
 *
 * Created: 2025-11-07 16:00 PST
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const HAPPY_SERVER = 'https://api.zenflo.dev';
const AUTH_TOKEN = process.env.HAPPY_AUTH_TOKEN!;
const SECRET_KEY = process.env.HAPPY_SECRET_KEY!;

// Base32 alphabet (RFC 4648) - same as Happy uses
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Parse Happy secret key format (dashed groups, Base32 encoded)
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

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  status?: string;
  priority?: string;
  createdAt: number | string;
  updatedAt: number | string;
  completedAt?: number | string;
  linkedSessions?: Record<string, boolean>;
}

interface TodoIndex {
  undoneOrder: string[];
  completedOrder: string[];
}

async function fetchAllTodos(): Promise<Map<string, TodoItem>> {
  console.log('Fetching all todo items from backend...');

  const response = await axios.get(`${HAPPY_SERVER}/v1/kv?prefix=todo.&limit=100`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  });

  const todos = new Map<string, TodoItem>();

  for (const item of response.data.items) {
    if (item.key === 'todo.index') continue;

    const todoId = item.key.replace('todo.', '');

    // Decode the value (could be base64 or encrypted)
    let todoData: TodoItem;

    try {
      // Try base64 first
      const decoded = Buffer.from(item.value, 'base64').toString('utf-8');
      todoData = JSON.parse(decoded);
      console.log(`  ${todoId}: ${todoData.title} (base64)`);
    } catch {
      // If that fails, might be encrypted - skip for now
      console.log(`  ${todoId}: [encrypted or invalid]`);
      continue;
    }

    todos.set(todoId, todoData);
  }

  console.log(`\nFound ${todos.size} valid todos`);
  return todos;
}

function createIndex(todos: Map<string, TodoItem>): TodoIndex {
  const undoneOrder: string[] = [];
  const completedOrder: string[] = [];

  // Sort by createdAt timestamp
  const sortedTodos = Array.from(todos.entries()).sort((a, b) => {
    const timeA = typeof a[1].createdAt === 'number' ? a[1].createdAt : new Date(a[1].createdAt).getTime();
    const timeB = typeof b[1].createdAt === 'number' ? b[1].createdAt : new Date(b[1].createdAt).getTime();
    return timeB - timeA; // Newest first
  });

  for (const [id, todo] of sortedTodos) {
    if (todo.done) {
      completedOrder.push(id);
    } else {
      undoneOrder.push(id);
    }
  }

  console.log(`\nIndex created:`);
  console.log(`  Undone: ${undoneOrder.length} tasks`);
  console.log(`  Completed: ${completedOrder.length} tasks`);

  return { undoneOrder, completedOrder };
}

function encryptIndex(index: TodoIndex, secretKey: string): string {
  // Parse the secret key
  const secret = parseSecretKey(secretKey);

  // Convert to JSON
  const plaintext = JSON.stringify(index);
  const plaintextBytes = naclUtil.decodeUTF8(plaintext);

  // Generate random nonce
  const nonce = nacl.randomBytes(24);

  // Encrypt using secretbox
  const ciphertext = nacl.secretbox(plaintextBytes, nonce, secret);

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  // Return base64
  return naclUtil.encodeBase64(combined);
}

async function writeIndex(encryptedIndex: string): Promise<void> {
  console.log(`\nWriting encrypted index...`);
  console.log(`Encrypted value length: ${encryptedIndex.length} chars`);

  const response = await axios.post(
    `${HAPPY_SERVER}/v1/kv`,
    {
      mutations: [{
        key: 'todo.index',
        value: encryptedIndex,
        version: 9, // Use version 9 to overwrite the deleted key
      }]
    },
    { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
  );

  console.log(`✅ Index written successfully!`);
  console.log(`Response:`, response.data);
}

async function main() {
  try {
    console.log('=== Recreating todo.index ===\n');

    // 1. Fetch all todos
    const todos = await fetchAllTodos();

    if (todos.size === 0) {
      throw new Error('No todos found in backend');
    }

    // 2. Create index structure
    const index = createIndex(todos);

    // 3. Encrypt the index
    const encryptedIndex = encryptIndex(index, SECRET_KEY);

    // 4. Write to backend
    await writeIndex(encryptedIndex);

    console.log('\n🎉 todo.index has been recreated successfully!');
    console.log('\nNext steps:');
    console.log('1. Try creating a task in Happy mobile app');
    console.log('2. Verify the task appears correctly');

  } catch (error: any) {
    console.error('\n❌ Failed to recreate index:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

main();
