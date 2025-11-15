import { z } from "zod";
import { type Fastify } from "../types";
import { db } from "@/storage/db";
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Expo SDK
const expo = new Expo();

export function pushRoutes(app: Fastify) {
    
    // Push Token Registration API
    app.post('/v1/push-tokens', {
        schema: {
            body: z.object({
                token: z.string()
            }),
            response: {
                200: z.object({
                    success: z.literal(true)
                }),
                500: z.object({
                    error: z.literal('Failed to register push token')
                })
            }
        },
        preHandler: app.authenticate
    }, async (request, reply) => {
        const userId = request.userId;
        const { token } = request.body;

        try {
            await db.accountPushToken.upsert({
                where: {
                    accountId_token: {
                        accountId: userId,
                        token: token
                    }
                },
                update: {
                    updatedAt: new Date()
                },
                create: {
                    accountId: userId,
                    token: token
                }
            });

            return reply.send({ success: true });
        } catch (error) {
            return reply.code(500).send({ error: 'Failed to register push token' });
        }
    });

    // Delete Push Token API
    app.delete('/v1/push-tokens/:token', {
        schema: {
            params: z.object({
                token: z.string()
            }),
            response: {
                200: z.object({
                    success: z.literal(true)
                }),
                500: z.object({
                    error: z.literal('Failed to delete push token')
                })
            }
        },
        preHandler: app.authenticate
    }, async (request, reply) => {
        const userId = request.userId;
        const { token } = request.params;

        try {
            await db.accountPushToken.deleteMany({
                where: {
                    accountId: userId,
                    token: token
                }
            });

            return reply.send({ success: true });
        } catch (error) {
            return reply.code(500).send({ error: 'Failed to delete push token' });
        }
    });

    // Get Push Tokens API
    app.get('/v1/push-tokens', {
        preHandler: app.authenticate
    }, async (request, reply) => {
        const userId = request.userId;

        try {
            const tokens = await db.accountPushToken.findMany({
                where: {
                    accountId: userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return reply.send({
                tokens: tokens.map(t => ({
                    id: t.id,
                    token: t.token,
                    createdAt: t.createdAt.getTime(),
                    updatedAt: t.updatedAt.getTime()
                }))
            });
        } catch (error) {
            return reply.code(500).send({ error: 'Failed to get push tokens' });
        }
    });

    // Send Remote Push Notification API
    app.post('/v1/notifications/send', {
        schema: {
            body: z.object({
                title: z.string(),
                body: z.string(),
                categoryId: z.string().optional(),
                data: z.record(z.any()).optional()
            }),
            response: {
                200: z.object({
                    success: z.literal(true),
                    sent: z.number()
                }),
                500: z.object({
                    error: z.string(),
                    success: z.literal(false)
                })
            }
        },
        preHandler: app.authenticate
    }, async (request, reply) => {
        const userId = request.userId;
        const { title, body, categoryId, data } = request.body;

        try {
            // Fetch all push tokens for the user
            const tokens = await db.accountPushToken.findMany({
                where: {
                    accountId: userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (tokens.length === 0) {
                app.log.warn({ userId }, 'No push tokens found for user');
                return reply.send({ success: true, sent: 0 });
            }

            // Validate and filter tokens
            const validTokens = tokens.filter(t => Expo.isExpoPushToken(t.token));
            
            if (validTokens.length === 0) {
                app.log.warn({ userId }, 'No valid push tokens found');
                return reply.send({ success: true, sent: 0 });
            }

            let totalSent = 0;
            const errors: any[] = [];

            // Send each token individually to avoid PUSH_TOO_MANY_EXPERIENCE_IDS error
            // This happens when you have tokens from different app IDs (e.g., @combinedmemory/happy vs @bulkacorp/happy)
            for (const token of validTokens) {
                try {
                    const message: ExpoPushMessage = {
                        to: token.token,
                        title,
                        body,
                        categoryId,
                        data,
                        sound: 'default',
                        priority: 'high'
                    };

                    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
                    
                    for (const ticket of ticketChunk) {
                        if (ticket.status === 'error') {
                            app.log.error({ 
                                token: token.token,
                                error: ticket.message, 
                                details: ticket.details 
                            }, 'Failed to send push notification');
                            errors.push({
                                token: token.token,
                                message: ticket.message,
                                details: ticket.details
                            });
                        } else {
                            totalSent++;
                        }
                    }
                } catch (error) {
                    app.log.error({ token: token.token, error }, 'Failed to send push notification');
                    errors.push({ token: token.token, error });
                }
            }

            app.log.info({ 
                userId, 
                sent: totalSent, 
                total: validTokens.length,
                errors: errors.length 
            }, 'Sent push notifications');

            return reply.send({ 
                success: true, 
                sent: totalSent 
            });
        } catch (error) {
            app.log.error({ error }, 'Failed to send notifications');
            return reply.code(500).send({ 
                error: 'Failed to send notifications',
                success: false 
            });
        }
    });
}
