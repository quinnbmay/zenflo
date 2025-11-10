/**
 * Zen Mode Notification Service
 *
 * Listens for task changes via Socket.IO and dispatches iOS push notifications.
 * Uses Expo Push Notification API for native iOS notifications with interactive actions.
 *
 * Created: 2025-11-08T02:30:00Z
 * Updated: 2025-11-08T18:00:00Z
 * Author: Claude Code via Happy
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { HappyWebSocketClient } from './websocket-client.js';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: number;
  updatedAt: number;
  linkedSessions?: {
    [sessionId: string]: {
      title: string;
      linkedAt: number;
    };
  };
}

interface PushToken {
  id: string;
  token: string;
  createdAt: number;
  updatedAt: number;
}

interface NotificationConfig {
  happyServerUrl: string;
  authToken: string;
  secretKey: string;
}

export class ZenModeNotificationService {
  private wsClient: HappyWebSocketClient;
  private config: NotificationConfig;
  private processedVersions: Map<string, number> = new Map();
  private previousTaskStates: Map<string, TodoItem> = new Map();
  private expo: Expo;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.expo = new Expo();

    // Initialize Socket.IO client
    this.wsClient = new HappyWebSocketClient(config.happyServerUrl, config.authToken);

    // Set up event handlers
    this.wsClient.on('connected', this.handleConnected.bind(this));
    this.wsClient.on('disconnected', this.handleDisconnected.bind(this));
    this.wsClient.on('todo-change', this.handleTodoChange.bind(this));
    this.wsClient.on('error', this.handleError.bind(this));
  }

  /**
   * Start the notification service
   */
  public start(): void {
    console.log('🚀 Starting Zen Mode Notification Service (iOS Push Notifications)');
    this.wsClient.connect();
  }

  /**
   * Stop the notification service
   */
  public stop(): void {
    console.log('⏹️  Stopping Zen Mode Notification Service');
    this.wsClient.disconnect();
  }

  /**
   * Fetch all push tokens for the authenticated user
   */
  private async fetchPushTokens(): Promise<PushToken[]> {
    try {
      const response = await axios.get<{ tokens: PushToken[] }>(
        `${this.config.happyServerUrl}/v1/push-tokens`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📱 Fetched ${response.data.tokens.length} push tokens`);
      return response.data.tokens;
    } catch (error) {
      console.error('❌ Failed to fetch push tokens:', error);
      throw new Error(`Failed to fetch push tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send iOS push notifications to all user devices
   */
  private async sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
    console.log(`📨 Sending ${messages.length} push notifications`);

    // Filter out invalid push tokens
    const validMessages = messages.filter(message => {
      if (Array.isArray(message.to)) {
        return message.to.every(token => Expo.isExpoPushToken(token));
      }
      return Expo.isExpoPushToken(message.to);
    });

    if (validMessages.length === 0) {
      console.log('⚠️  No valid Expo push tokens found');
      return;
    }

    // Create chunks to respect Expo's rate limits
    const chunks = this.expo.chunkPushNotifications(validMessages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

        // Log any errors
        const errors = ticketChunk.filter(ticket => ticket.status === 'error');
        if (errors.length > 0) {
          console.error('❌ Some notifications failed:', errors);
        } else {
          console.log(`✅ Sent ${chunk.length} notifications successfully`);
        }
      } catch (error) {
        console.error('❌ Failed to send push notification chunk:', error);
      }
    }
  }

  /**
   * Handle "Send Back" action - revert task to previous status
   */
  private async handleSendBack(taskId: string): Promise<void> {
    console.log(`🔄 Sending back task ${taskId}...`);

    // Fetch current task
    const response = await axios.get(
      `${this.config.happyServerUrl}/v1/kv/todo.${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
        },
      }
    );

    const currentValue = response.data.value;
    const currentVersion = response.data.version;

    // Decrypt task
    const decrypted = this.decrypt(currentValue);
    const task = JSON.parse(decrypted);

    // Determine new status based on current status
    let newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    if (task.status === 'DONE') {
      newStatus = 'IN_PROGRESS'; // Send completed task back to in progress
    } else if (task.status === 'CANCELLED') {
      newStatus = 'TODO'; // Send cancelled task back to todo
    } else {
      console.log(`⚠️  Task ${taskId} is not DONE or CANCELLED, cannot send back`);
      return;
    }

    // Update task
    const updatedTask = {
      ...task,
      status: newStatus,
      done: false,
      updatedAt: Date.now(),
      completedAt: undefined,
      cancelledAt: undefined,
    };

    // Encrypt updated task
    const encrypted = this.encrypt(JSON.stringify(updatedTask));

    // Send mutation to backend
    await axios.post(
      `${this.config.happyServerUrl}/v1/kv`,
      {
        mutations: [
          {
            key: `todo.${taskId}`,
            value: encrypted,
            version: currentVersion,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
        },
      }
    );

    console.log(`✅ Task ${taskId} sent back to ${newStatus}`);
  }

  /**
   * Encrypt task data
   */
  private encrypt(data: string): string {
    const secretKey = this.parseSecretKey(this.config.secretKey);
    const nonce = nacl.randomBytes(24);
    const message = naclUtil.decodeUTF8(data);
    const encrypted = nacl.secretbox(message, nonce, secretKey);

    // Combine nonce + ciphertext
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    return naclUtil.encodeBase64(combined);
  }

  private handleConnected(): void {
    console.log('✅ Notification service connected to Happy backend');
  }

  private handleDisconnected(info: { reason: string }): void {
    console.log(`📴 Notification service disconnected: ${info.reason}`);
  }

  private handleError(error: Error): void {
    console.error('❌ Notification service error:', error.message);
  }

  private async handleTodoChange(event: { taskId: string; version: number; timestamp: number }): Promise<void> {
    console.log(`🔔 Todo change detected: ${event.taskId} (v${event.version})`);

    // Skip if we've already processed this version
    const lastVersion = this.processedVersions.get(event.taskId);
    if (lastVersion && lastVersion >= event.version) {
      console.log(`⏭️  Skipping already processed version ${event.version}`);
      return;
    }

    try {
      // Fetch the updated task
      const task = await this.fetchTask(event.taskId);

      if (!task) {
        console.log(`⚠️  Task ${event.taskId} not found or encrypted`);
        return;
      }

      // Check if this is an update (not a creation)
      const previousTask = this.previousTaskStates.get(event.taskId);

      // Only send notifications for completed tasks
      if (previousTask && previousTask.status === 'DONE') {
        console.log(`⏭️  Skipping notification - task already done`);
        this.previousTaskStates.set(event.taskId, { ...task });
        this.processedVersions.set(event.taskId, event.version);
        return;
      }

      if (task.status !== 'DONE') {
        console.log(`⏭️  Skipping notification - task not completed (status: ${task.status})`);
        this.previousTaskStates.set(event.taskId, { ...task });
        this.processedVersions.set(event.taskId, event.version);
        return;
      }

      // Detect what changed
      let changeType: 'status_change' | 'priority_change' | 'title_change' | 'description_change' | 'created' | 'none' = 'none';

      if (!previousTask) {
        changeType = 'created';
      } else if (previousTask.status !== task.status) {
        changeType = 'status_change';
      } else if (previousTask.priority !== task.priority) {
        changeType = 'priority_change';
      } else if (previousTask.title !== task.title) {
        changeType = 'title_change';
      } else if ((previousTask.description || '') !== (task.description || '')) {
        changeType = 'description_change';
      }

      // Store current state as previous for next time
      this.previousTaskStates.set(event.taskId, { ...task });

      // Update processed version
      this.processedVersions.set(event.taskId, event.version);

      // Send notification
      await this.sendNotification(task, previousTask, changeType);
    } catch (error) {
      console.error(`❌ Failed to handle todo change for ${event.taskId}:`, error);
    }
  }

  private async fetchTask(taskId: string): Promise<TodoItem | null> {
    try {
      const response = await axios.get(
        `${this.config.happyServerUrl}/v1/kv/todo.${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.authToken}`,
          },
        }
      );

      const encodedValue = response.data.value;

      // Try to decode as base64 JSON first (MCP test tasks)
      try {
        const decoded = Buffer.from(encodedValue, 'base64').toString('utf-8');
        const task = JSON.parse(decoded);
        return { ...task, id: taskId };
      } catch {
        // If base64 decode fails, try to decrypt
        try {
          const decrypted = this.decrypt(encodedValue);
          const task = JSON.parse(decrypted);
          return { ...task, id: taskId };
        } catch {
          // Task is encrypted and we can't decrypt it
          console.log(`🔐 Task ${taskId} is encrypted, skipping notification`);
          return null;
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`🗑️  Task ${taskId} was deleted`);
        return null;
      }
      throw error;
    }
  }

  private decrypt(encryptedBase64: string): string {
    const secretKey = this.parseSecretKey(this.config.secretKey);
    const combined = naclUtil.decodeBase64(encryptedBase64);

    if (combined.length < 24) {
      throw new Error('Invalid encrypted data: too short');
    }

    const nonce = combined.slice(0, 24);
    const ciphertext = combined.slice(24);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, secretKey);
    if (!decrypted) {
      throw new Error('Decryption failed: invalid key or corrupted data');
    }

    return naclUtil.encodeUTF8(decrypted);
  }

  private parseSecretKey(secretStr: string): Uint8Array {
    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

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

  private async sendNotification(
    task: TodoItem,
    previousTask: TodoItem | undefined,
    changeType: 'status_change' | 'priority_change' | 'title_change' | 'description_change' | 'created' | 'none'
  ): Promise<void> {
    console.log(`📨 Preparing iOS notification for task: ${task.title}`);

    try {
      // Fetch push tokens
      const tokens = await this.fetchPushTokens();

      if (tokens.length === 0) {
        console.log('⚠️  No push tokens found for user');
        return;
      }

      // Build notification title and body
      const { title, body } = this.buildNotificationContent(task, previousTask, changeType);

      // Create Expo push messages for all tokens
      const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token.token,
        title,
        body,
        data: {
          taskId: task.id,
          type: 'zen-task-completed',
          status: task.status,
        },
        sound: 'default',
        priority: 'high',
        categoryId: 'zen-task', // iOS notification category for actions
      }));

      // Send notifications
      await this.sendPushNotifications(messages);
      console.log(`✅ iOS notifications sent for task ${task.id} to ${tokens.length} device(s)`);
    } catch (error) {
      console.error('❌ Failed to send iOS notification:', error);
    }
  }

  private buildNotificationContent(
    task: TodoItem,
    previousTask: TodoItem | undefined,
    changeType: 'status_change' | 'priority_change' | 'title_change' | 'description_change' | 'created' | 'none'
  ): { title: string; body: string } {
    const priorityEmoji = {
      'URGENT': '🔥',
      'HIGH': '⚡',
      'MEDIUM': '📌',
      'LOW': '💡',
    }[task.priority || 'MEDIUM'];

    let title = '✅ Task Completed';
    let body = `${priorityEmoji} ${task.title}`;

    // Add linked sessions info if available
    if (task.linkedSessions && Object.keys(task.linkedSessions).length > 0) {
      const sessionCount = Object.keys(task.linkedSessions).length;
      const firstSession = Object.values(task.linkedSessions)[0];
      if (sessionCount === 1) {
        body += `\n📎 Linked: ${firstSession.title}`;
      } else {
        body += `\n📎 ${sessionCount} linked sessions`;
      }
    }

    return { title, body };
  }

  private formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }
}

// Main entry point
const config: NotificationConfig = {
  happyServerUrl: process.env.ZENFLO_SERVER_URL || process.env.HAPPY_SERVER_URL || 'https://zenflo.combinedmemory.com',
  authToken: process.env.ZENFLO_AUTH_TOKEN || process.env.HAPPY_AUTH_TOKEN || '',
  secretKey: process.env.ZENFLO_SECRET_KEY || process.env.HAPPY_SECRET_KEY || '',
};

if (!config.authToken || !config.secretKey) {
  console.error('❌ Missing required environment variables: ZENFLO_AUTH_TOKEN, ZENFLO_SECRET_KEY');
  process.exit(1);
}

const service = new ZenModeNotificationService(config);
service.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down notification service...');
  service.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down notification service...');
  service.stop();
  process.exit(0);
});
