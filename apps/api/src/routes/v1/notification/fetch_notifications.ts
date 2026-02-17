import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import z from '@dpg/schemas';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { notifications } from '@dpg/database';
import { and, eq, desc, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
});

type FetchNotificationsRequest = FastifyRequest<{
  Querystring: z.infer<typeof QuerySchema>;
}>;

const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
  read: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const fetch_notifications: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/fetch',
    method: 'GET',
    preHandler: auth_middleware,
    schema: {
      tags: ['notification'],
      query: QuerySchema,
      response: {
        200: z.object({
          meta: z.object({
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
            unread: z.number(),
          }),
          notifications: NotificationSchema.array(),
        }),
      },
    },
    handler: async (request: FetchNotificationsRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit, offset, unreadOnly } = request.query;

      try {
        // Build conditions
        const conditions = [eq(notifications.user_id, userId)];
        if (unreadOnly) {
          conditions.push(eq(notifications.read, false));
        }

        const whereClause = and(...conditions);

        // Get total count
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(whereClause);

        // Get unread count
        const [{ unreadCount }] = await db
          .select({ unreadCount: sql<number>`count(*)` })
          .from(notifications)
          .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));

        // Get paginated results
        const results = await db
          .select()
          .from(notifications)
          .where(whereClause)
          .orderBy(desc(notifications.created_at))
          .limit(limit)
          .offset(offset);

        return reply.code(200).send({
          meta: {
            total: Number(count),
            limit,
            offset,
            unread: Number(unreadCount),
          },
          notifications: results,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch notifications');
        throw err;
      }
    },
  });
};
