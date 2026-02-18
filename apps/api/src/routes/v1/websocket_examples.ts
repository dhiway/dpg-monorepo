import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import { getNotificationPublisher } from '../../websocket/setup';

/**
 * Example routes demonstrating WebSocket notification integration.
 * These show how to publish different types of notifications.
 */

// Schema for publishing a test notification
const PublishNotificationBodySchema = z.object({
  userId: z.string(),
  type: z.enum(['status_change', 'connection_request', 'item_update', 'custom']),
  data: z.record(z.string(), z.unknown()),
});

type PublishNotificationRequest = FastifyRequest<{
  Body: z.infer<typeof PublishNotificationBodySchema>;
}>;

export const websocket_example_routes: FastifyPluginAsyncZod = async function (
  fastify
) {
  /**
   * GET /ws-stats
   * Get WebSocket server statistics
   */
  fastify.route({
    method: 'GET',
    url: '/ws-stats',
    preHandler: auth_middleware,
    schema: {
      tags: ['websocket'],
      response: {
        200: z.object({
          connections: z.number(),
          users: z.number(),
          redisHealthy: z.boolean(),
        }),
        503: z.object({
          error: z.string(),
          message: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      const { getWebSocketStats } = await import('../../websocket/setup');
      const stats = getWebSocketStats();

      if (!stats) {
        return reply.code(503).send({
          error: 'WEBSOCKET_NOT_INITIALIZED',
          message: 'WebSocket server is not initialized',
        });
      }

      return reply.code(200).send(stats);
    },
  });

  /**
   * POST /publish-notification
   * Manually publish a notification (for testing)
   */
  fastify.route({
    method: 'POST',
    url: '/publish-notification',
    preHandler: auth_middleware,
    schema: {
      tags: ['websocket'],
      body: PublishNotificationBodySchema,
      response: {
        200: z.object({
          success: z.boolean(),
          eventId: z.string(),
        }),
      },
    },
    handler: async (request: PublishNotificationRequest, reply: FastifyReply) => {
      const { userId, type, data } = request.body;

      try {
        const publisher = getNotificationPublisher();
        let event;

        // Publish based on type
        switch (type) {
          case 'status_change':
            event = await publisher.publishStatusChange(userId, data as any);
            break;
          case 'connection_request':
            event = await publisher.publishConnectionRequest(userId, data as any);
            break;
          case 'item_update':
            event = await publisher.publishItemUpdate(userId, data as any);
            break;
          case 'custom':
            event = await publisher.publishCustom(userId, data as any);
            break;
        }

        return reply.code(200).send({
          success: true,
          eventId: event.id,
        });
      } catch (error) {
        request.log.error({ error, userId, type }, 'Failed to publish notification');
        return reply.code(500).send({
          error: 'PUBLISH_FAILED',
          message: 'Failed to publish notification',
        });
      }
    },
  });

  /**
   * POST /example/connection-request
   * Example: Send a connection request notification
   */
  fastify.route({
    method: 'POST',
    url: '/example/connection-request',
    preHandler: auth_middleware,
    schema: {
      tags: ['websocket'],
      body: z.object({
        toUserId: z.string(),
        fromUserName: z.string(),
        message: z.string().optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
        }),
      },
    },
    handler: async (request: any, reply: FastifyReply) => {
      const { toUserId, fromUserName, message } = request.body;
      const fromUserId = request.user.id; // From authenticated user

      try {
        const publisher = getNotificationPublisher();

        await publisher.publishConnectionRequest(toUserId, {
          connectionId: `conn_${Date.now()}`, // In real app, this would be from DB
          fromUserId,
          fromUserName,
          message,
        });

        return reply.code(200).send({ success: true });
      } catch (error) {
        request.log.error({ error, toUserId }, 'Failed to send connection request');
        return reply.code(500).send({
          error: 'NOTIFICATION_FAILED',
          message: 'Failed to send connection request notification',
        });
      }
    },
  });

  /**
   * POST /example/status-change
   * Example: Send a status change notification
   */
  fastify.route({
    method: 'POST',
    url: '/example/status-change',
    preHandler: auth_middleware,
    schema: {
      tags: ['websocket'],
      body: z.object({
        userId: z.string(),
        itemId: z.string(),
        itemType: z.string(),
        oldStatus: z.string(),
        newStatus: z.string(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
        }),
      },
    },
    handler: async (request: any, reply: FastifyReply) => {
      const { userId, itemId, itemType, oldStatus, newStatus } = request.body;

      try {
        const publisher = getNotificationPublisher();

        await publisher.publishStatusChange(userId, {
          itemId,
          itemType,
          oldStatus,
          newStatus,
        });

        return reply.code(200).send({ success: true });
      } catch (error) {
        request.log.error({ error, userId }, 'Failed to send status change');
        return reply.code(500).send({
          error: 'NOTIFICATION_FAILED',
          message: 'Failed to send status change notification',
        });
      }
    },
  });
};
