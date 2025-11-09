import { z } from "zod";
import { Fastify } from "../types";
import { FeedBodySchema } from "@/app/feed/types";
import { feedGet } from "@/app/feed/feedGet";
import { feedPost } from "@/app/feed/feedPost";
import { Context } from "@/context";
import { db } from "@/storage/db";
import { inTx } from "@/storage/inTx";

export function feedRoutes(app: Fastify) {
    app.get('/v1/feed', {
        preHandler: app.authenticate,
        schema: {
            querystring: z.object({
                before: z.string().optional(),
                after: z.string().optional(),
                limit: z.coerce.number().int().min(1).max(200).default(50)
            }).optional(),
            response: {
                200: z.object({
                    items: z.array(z.object({
                        id: z.string(),
                        body: FeedBodySchema,
                        repeatKey: z.string().nullable(),
                        cursor: z.string(),
                        createdAt: z.number()
                    })),
                    hasMore: z.boolean()
                })
            }
        }
    }, async (request, reply) => {
        const items = await feedGet(db, Context.create(request.userId), {
            cursor: {
                before: request.query?.before,
                after: request.query?.after
            },
            limit: request.query?.limit
        });
        return reply.send({ items: items.items, hasMore: items.hasMore });
    });

    // POST endpoint for Claude to send inbox messages
    app.post('/v1/inbox/claude-message', {
        preHandler: app.authenticate,
        schema: {
            body: z.object({
                title: z.string(),
                message: z.string(),
                sessionId: z.string().optional(),
                priority: z.enum(['low', 'normal', 'high']).optional()
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    id: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const result = await inTx(async (tx) => {
            const feedItem = await feedPost(
                tx,
                Context.create(request.userId),
                {
                    kind: 'claude_message',
                    title: request.body.title,
                    message: request.body.message,
                    sessionId: request.body.sessionId,
                    priority: request.body.priority || 'normal'
                },
                null // No repeatKey for Claude messages
            );
            return feedItem;
        });

        return reply.send({ success: true, id: result.id });
    });
}
