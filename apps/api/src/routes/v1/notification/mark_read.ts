import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import z from '@dpg/schemas';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { notifications } from '@dpg/database';
import { eq, and } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

const ParamsSchema = z.object({
  notificationId: z.string().uuid(),
});

type MarkReadRequest = FastifyRequest<{
  Params: z.infer<typeof ParamsSchema>;
}>;

export const mark_read: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/:notificationId/mark-read',
    method: 'POST',
    preHandler: auth_middleware,
    schema: {
      tags: ['notification'],
      params: ParamsSchema,
      response: {
        200: z.object({
          success: z.boolean(),
        }),
      },
    },
    handler: async (request: MarkReadRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { notificationId } = request.params;

      try {
        // Update notification to mark as read
        // Only allow users to mark their own notifications
        await db
          .update(notifications)
          .set({
            read: true,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(notifications.id, notificationId),
              eq(notifications.user_id, userId)
            )
          );

        return reply.code(200).send({
          success: true,
        });
      } catch (err) {
        request.log.error({ err, notificationId }, 'Failed to mark notification as read');
        throw err;
      }
    },
  });
};
