import { io, Socket } from 'socket.io-client';
import { Encryption } from './encryption';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
}

export interface Session {
    id: string;
    title: string | null;
    messageCount: number;
    updatedAt: number;
    dataEncryptionKey: string | null;
    messages: Message[];
}

export class SyncClient {
    private socket: Socket | null = null;
    private encryption: Encryption | null = null;
    private sessionKeys = new Map<string, Uint8Array>();
    private sessions = new Map<string, Session>();

    constructor(
        private baseUrl: string,
        private token: string,
        private encryptionKeys?: { publicKey: string; machineKey: string }
    ) {
        if (encryptionKeys) {
            this.encryption = new Encryption(
                encryptionKeys.publicKey,
                encryptionKeys.machineKey
            );
        }
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Convert HTTPS URL to WebSocket URL
            const wsUrl = this.baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
            console.log('Connecting to WebSocket:', wsUrl);
            console.log('Using token (first 20 chars):', this.token.substring(0, 20) + '...');

            this.socket = io(wsUrl, {
                path: '/v1/updates',  // CRITICAL: Socket.io namespace path
                auth: {
                    token: this.token,
                    clientType: 'user-scoped' as const  // Match mobile/webapp clients
                },
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity,
                timeout: 10000,
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket connected successfully!');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error);
                console.error('Error details:', error.message);
                reject(error);
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
            });

            // Handle updates from server
            this.socket.on('update', async (update: any) => {
                await this.handleUpdate(update);
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private async handleUpdate(update: any): Promise<void> {
        if (!update || !update.body) {
            return;
        }

        const body = update.body;

        switch (body.t) {
            case 'new-message':
                await this.handleNewMessage(body);
                break;
            case 'update-session':
                await this.handleSessionUpdate(body);
                break;
            // Add more update handlers as needed
        }
    }

    private async handleNewMessage(update: any): Promise<void> {
        const sessionId = update.sid;
        const message = update.message;

        if (!this.encryption) {
            console.warn('Cannot decrypt message - no encryption keys');
            return;
        }

        // Get session key
        let sessionKey = this.sessionKeys.get(sessionId);
        if (!sessionKey) {
            // Fetch session to get encryption key
            const session = await this.fetchSession(sessionId);
            if (!session || !session.dataEncryptionKey) {
                console.error('Cannot decrypt - no session key');
                return;
            }

            const decryptedKey = await this.encryption.decryptEncryptionKey(session.dataEncryptionKey);
            if (!decryptedKey) {
                console.error('Failed to decrypt session key');
                return;
            }

            sessionKey = decryptedKey;
            this.sessionKeys.set(sessionId, sessionKey);
        }

        // Decrypt message
        if (message.content?.t === 'encrypted' && message.content?.c) {
            const decryptedContent = await this.encryption.decryptMessage(
                message.content.c,
                sessionKey
            );

            if (decryptedContent) {
                // Parse decrypted content
                const parsed = JSON.parse(decryptedContent);

                const decryptedMessage: Message = {
                    id: message.id,
                    role: parsed.role,
                    content: parsed.content,
                    createdAt: message.createdAt
                };

                // Add to session
                let session = this.sessions.get(sessionId);
                if (!session) {
                    const fetchedSession = await this.fetchSession(sessionId);
                    if (fetchedSession) {
                        session = fetchedSession;
                        this.sessions.set(sessionId, session);
                    }
                }

                if (session) {
                    session.messages.push(decryptedMessage);
                    session.messageCount = session.messages.length;
                    session.updatedAt = Date.now();
                }
            }
        }
    }

    private async handleSessionUpdate(update: any): Promise<void> {
        const sessionId = update.id || update.sid;
        if (!sessionId) return;

        const session = this.sessions.get(sessionId);
        if (session) {
            if (update.active !== undefined) {
                // Session activity changed
            }
            if (update.thinking !== undefined) {
                // Thinking state changed
            }
        }
    }

    async fetchSession(sessionId: string): Promise<Session | null> {
        if (!this.socket) {
            throw new Error('Not connected');
        }

        return new Promise((resolve, reject) => {
            this.socket!.emit('request', `/v1/sessions/${sessionId}/messages`, (response: any) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.data);
                }
            });
        });
    }

    /**
     * Fetch all sessions from the server and initialize session encryption keys.
     * This MUST be called before loading messages for any session.
     */
    async fetchSessions(): Promise<void> {
        if (!this.encryption) {
            console.warn('Cannot fetch sessions - no encryption keys');
            return;
        }

        console.log('📥 Fetching all sessions from /v1/sessions...');
        const response = await fetch(`${this.baseUrl}/v1/sessions`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch sessions: ${response.status}`);
        }

        const data: any = await response.json();
        const sessions = data.sessions || [];
        console.log(`📥 Fetched ${sessions.length} sessions`);

        // Decrypt and store session keys
        for (const session of sessions) {
            if (session.dataEncryptionKey) {
                const decryptedKey = await this.encryption.decryptEncryptionKey(session.dataEncryptionKey);
                if (decryptedKey) {
                    this.sessionKeys.set(session.id, decryptedKey);
                    console.log(`🔑 Stored encryption key for session ${session.id}`);
                } else {
                    console.error(`❌ Failed to decrypt key for session ${session.id}`);
                }
            }
        }
    }

    async loadSessionMessages(sessionId: string): Promise<Message[]> {
        if (!this.encryption) {
            console.warn('Cannot decrypt messages - no encryption keys');
            return [];
        }

        // Ensure we have the session key - fetch all sessions if not
        let sessionKey = this.sessionKeys.get(sessionId);
        if (!sessionKey) {
            console.log(`🔑 No session key for ${sessionId}, fetching all sessions...`);
            await this.fetchSessions();
            sessionKey = this.sessionKeys.get(sessionId);

            if (!sessionKey) {
                throw new Error(`No encryption key available for session ${sessionId}`);
            }
        }

        // Fetch messages (this endpoint does NOT return dataEncryptionKey)
        console.log(`💬 Fetching messages for session ${sessionId}...`);
        const response = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}/messages`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch messages: ${response.status}`);
        }

        const data: any = await response.json();
        console.log(`💬 Received ${data.messages?.length || 0} messages for session ${sessionId}`);

        // Decrypt all messages using the pre-fetched session key
        const messages: Message[] = [];
        for (const msg of data.messages || []) {
            if (msg.content?.t === 'encrypted' && msg.content?.c) {
                const decryptedContent = await this.encryption.decryptMessage(
                    msg.content.c,
                    sessionKey
                );

                if (decryptedContent) {
                    try {
                        const parsed = JSON.parse(decryptedContent);
                        messages.push({
                            id: msg.id,
                            role: parsed.role,
                            content: parsed.content,
                            createdAt: msg.createdAt
                        });
                    } catch (error) {
                        console.error('Failed to parse decrypted message:', error);
                    }
                }
            }
        }

        console.log(`✅ Successfully decrypted ${messages.length} messages`);

        // Cache session
        const session: Session = {
            id: sessionId,
            title: null, // We don't get title from messages endpoint
            messageCount: messages.length,
            updatedAt: Date.now(),
            dataEncryptionKey: null, // We already have the decrypted key in memory
            messages
        };

        this.sessions.set(sessionId, session);

        return messages;
    }

    getSession(sessionId: string): Session | null {
        return this.sessions.get(sessionId) || null;
    }
}
