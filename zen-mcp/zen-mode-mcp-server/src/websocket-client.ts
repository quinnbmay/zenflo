/**
 * Socket.IO Client for Happy Backend
 *
 * Connects to Happy backend Socket.IO server to receive real-time update events.
 * Filters for kv-batch-update messages containing todo.* key changes.
 *
 * Created: 2025-11-08T02:30:00Z
 * Updated: 2025-11-08T17:35:00Z
 * Author: Claude Code via Happy
 */

import { io, Socket } from 'socket.io-client';
import EventEmitter from 'events';

interface KVBatchUpdateEvent {
  type: 'kv-batch-update';
  changes: Array<{
    key: string;
    value: string | null; // null indicates deletion
    version: number;
  }>;
}

interface UpdatePayload {
  id: string;
  seq: number;
  body: {
    t: string;
    changes?: Array<{
      key: string;
      value: string | null;
      version: number;
    }>;
  };
  createdAt: number;
}

interface TodoChangeEvent {
  taskId: string;
  version: number;
  timestamp: number;
}

export class HappySocketIOClient extends EventEmitter {
  private socket: Socket | null = null;
  private serverUrl: string;
  private authToken: string;
  private reconnectInterval: number = 5000;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(serverUrl: string, authToken: string) {
    super();
    // Remove /v1/kv/watch if present and use base URL
    this.serverUrl = serverUrl.replace(/\/v1\/kv\/watch$/, '');
    this.authToken = authToken;
  }

  /**
   * Connect to Happy backend Socket.IO server
   */
  public connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      console.log('⚠️  Already connected or connecting to Socket.IO');
      return;
    }

    this.isConnecting = true;
    console.log(`🔌 Connecting to Happy Socket.IO: ${this.serverUrl}/v1/updates`);

    try {
      // Connect to Socket.IO endpoint with authentication
      this.socket = io(this.serverUrl, {
        path: '/v1/updates',
        auth: {
          token: this.authToken,
          clientType: 'user-scoped',
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We'll handle reconnection ourselves
        timeout: 20000,
      });

      this.socket.on('connect', this.handleConnect.bind(this));
      this.socket.on('disconnect', this.handleDisconnect.bind(this));
      this.socket.on('error', this.handleError.bind(this));
      this.socket.on('update', this.handleUpdate.bind(this));
    } catch (error) {
      console.error('❌ Failed to create Socket.IO connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    this.shouldReconnect = false;

    if (this.socket) {
      console.log('🔌 Disconnecting from Happy Socket.IO');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleConnect(): void {
    this.isConnecting = false;
    console.log('✅ Connected to Happy Socket.IO');
    this.emit('connected');
  }

  private handleUpdate(payload: UpdatePayload): void {
    try {
      // Check if this is a kv-batch-update event
      if (payload.body.t === 'kv-batch-update' && payload.body.changes) {
        this.handleKVBatchUpdate({
          type: 'kv-batch-update',
          changes: payload.body.changes,
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle update event:', error);
    }
  }

  private handleKVBatchUpdate(event: KVBatchUpdateEvent): void {
    console.log(`📦 Received kv-batch-update with ${event.changes.length} changes`);

    // Filter for todo.* keys (excluding todo.index)
    const todoChanges: TodoChangeEvent[] = event.changes
      .filter(item => item.key.startsWith('todo.') && item.key !== 'todo.index')
      .map(item => ({
        taskId: item.key.replace('todo.', ''),
        version: item.version,
        timestamp: Date.now(),
      }));

    if (todoChanges.length > 0) {
      console.log(`🔔 Detected ${todoChanges.length} todo changes`);

      // Emit each todo change as separate event
      for (const change of todoChanges) {
        this.emit('todo-change', change);
      }
    }
  }

  private handleError(error: Error): void {
    console.error('❌ Socket.IO error:', error.message);
    this.emit('error', error);
  }

  private handleDisconnect(reason: string): void {
    this.isConnecting = false;
    console.log(`📴 Socket.IO disconnected: ${reason}`);
    this.emit('disconnected', { reason });

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    console.log(`⏱️  Reconnecting in ${this.reconnectInterval / 1000}s...`);
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Check if Socket.IO is currently connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

// Export both class and alias for backwards compatibility
export { HappySocketIOClient as HappyWebSocketClient };
