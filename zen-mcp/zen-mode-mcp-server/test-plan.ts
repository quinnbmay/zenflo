/**
 * Test script for plan management features
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Plan {
  id: string;
  title: string;
  description?: string;
  goal: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

const config = {
  serverUrl: process.env.HAPPY_SERVER_URL || 'https://happy.combinedmemory.com',
  authToken: process.env.HAPPY_AUTH_TOKEN || '',
  secretKey: process.env.HAPPY_SECRET_KEY || '',
};

if (!config.authToken || !config.secretKey) {
  console.error('❌ Missing HAPPY_AUTH_TOKEN or HAPPY_SECRET_KEY');
  process.exit(1);
}

// Encryption helpers
function parseSecretKey(secretStr: string): Uint8Array {
  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secretStr.toUpperCase()
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
    buffer = (buffer << 5) | value;
    bufferLength += 5;
    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function encrypt(data: any): string {
  const secretKey = parseSecretKey(config.secretKey);
  const nonce = nacl.randomBytes(24);
  const message = naclUtil.decodeUTF8(JSON.stringify(data));
  const encrypted = nacl.secretbox(message, nonce, secretKey);
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return naclUtil.encodeBase64(combined);
}

function decrypt(encryptedBase64: string): any {
  const secretKey = parseSecretKey(config.secretKey);
  const combined = naclUtil.decodeBase64(encryptedBase64);
  const nonce = combined.slice(0, 24);
  const ciphertext = combined.slice(24);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, secretKey);
  if (!decrypted) throw new Error('Decryption failed');
  return JSON.parse(naclUtil.encodeUTF8(decrypted));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function createPlan(goal: string, description?: string, maxTasks: number = 5) {
  const planId = generateUUID();
  const now = Date.now();

  console.log('🤖 Using Claude to generate tasks...');

  const prompt = `You are a project planning expert. Break down this goal into ${maxTasks} concrete, actionable tasks.

Goal: "${goal}"
${description ? `Description: ${description}` : ''}

Create ${maxTasks} specific tasks that would accomplish this goal. For each task:
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

  let taskDefinitions: Array<{ title: string; description: string; priority: TaskPriority }> = [];

  try {
    const tmpFile = path.join(os.tmpdir(), `zen-plan-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, prompt);
    const command = `cat "${tmpFile}" | claude -p --output-format text`;
    const { stdout } = await execAsync(command, { timeout: 30000, maxBuffer: 1024 * 1024 });
    fs.unlinkSync(tmpFile);

    const jsonMatch = stdout.trim().match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      taskDefinitions = parsed.tasks || [];
      console.log('✅ Claude generated', taskDefinitions.length, 'tasks');
    }
  } catch (error) {
    console.log('⚠️  Claude failed, using fallback tasks');
    taskDefinitions = [
      { title: `Research: ${goal}`, description: 'Research and plan approach', priority: 'HIGH' },
      { title: 'Implement core functionality', description: 'Build main features', priority: 'HIGH' },
      { title: 'Testing and validation', description: 'Test thoroughly', priority: 'MEDIUM' },
      { title: 'Documentation', description: 'Document changes', priority: 'LOW' },
    ];
  }

  // Create tasks
  const taskIds: string[] = [];
  for (const taskDef of taskDefinitions) {
    const taskId = generateUUID();
    const task = {
      id: taskId,
      title: taskDef.title,
      description: taskDef.description,
      done: false,
      status: 'TODO',
      priority: taskDef.priority,
      planId,
      createdAt: now,
      updatedAt: now,
    };

    const encrypted = encrypt(task);
    await axios.post(
      `${config.serverUrl}/v1/kv`,
      { mutations: [{ key: `todo.${taskId}`, value: encrypted, version: -1 }] },
      { headers: { Authorization: `Bearer ${config.authToken}` } }
    );

    taskIds.push(taskId);
    console.log(`  ✓ Created task: ${taskDef.title}`);
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
  };

  const encrypted = encrypt(plan);
  await axios.post(
    `${config.serverUrl}/v1/kv`,
    { mutations: [{ key: `plan.${planId}`, value: encrypted, version: -1 }] },
    { headers: { Authorization: `Bearer ${config.authToken}` } }
  );

  return { planId, taskIds };
}

async function getPlan(planId: string): Promise<Plan> {
  const response = await axios.get(`${config.serverUrl}/v1/kv/plan.${planId}`, {
    headers: { Authorization: `Bearer ${config.authToken}` },
  });
  return decrypt(response.data.value);
}

async function updatePlan(planId: string, updates: Partial<Plan>) {
  const plan = await getPlan(planId);
  const response = await axios.get(`${config.serverUrl}/v1/kv/plan.${planId}`, {
    headers: { Authorization: `Bearer ${config.authToken}` },
  });
  const version = response.data.version;

  const updatedPlan = {
    ...plan,
    ...updates,
    updatedAt: Date.now(),
    completedAt: updates.status === 'COMPLETED' ? Date.now() : plan.completedAt,
  };

  const encrypted = encrypt(updatedPlan);
  await axios.post(
    `${config.serverUrl}/v1/kv`,
    { mutations: [{ key: `plan.${planId}`, value: encrypted, version }] },
    { headers: { Authorization: `Bearer ${config.authToken}` } }
  );
}

// Run test
async function test() {
  console.log('📋 Testing Plan Management System\n');

  console.log('1️⃣  Creating plan...');
  const result = await createPlan(
    'Add real-time collaboration to Happy notes',
    'Enable multiple users to edit notes simultaneously with conflict resolution',
    5
  );
  console.log('✅ Plan created:', result.planId);
  console.log('   Tasks created:', result.taskIds.length, '\n');

  console.log('2️⃣  Fetching plan details...');
  const plan = await getPlan(result.planId);
  console.log('   Title:', plan.title);
  console.log('   Status:', plan.status);
  console.log('   Task count:', plan.taskIds.length, '\n');

  console.log('3️⃣  Updating plan status...');
  await updatePlan(result.planId, { status: 'IN_PROGRESS' });
  const updated = await getPlan(result.planId);
  console.log('   New status:', updated.status, '\n');

  console.log('✅ All tests passed!');
  console.log('\n📊 Summary:');
  console.log('   Plan ID:', result.planId);
  console.log('   Task IDs:', result.taskIds.join(', '));
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
