import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { DrizzleQueryError } from 'drizzle-orm';
import { CreateItemBodySchema } from 'packages/schemas/src/api/item_schemas';
import { DatabaseError, ensureItemPartition, items } from '@dpg/database';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import { checkExistingConnection } from '../connection/fetch_connections_helper';
import { getNotificationPublisher } from '../../../websocket/setup';
import { saveNotification } from '../../../utils/notification_helper';

type CreateItemRequest = FastifyRequest<{
  Body: z.infer<typeof CreateItemBodySchema>;
}>;

export const create_item: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/create',
    method: 'POST',
    preHandler: auth_middleware,
    schema: {
      tags: ['item'],
      body: CreateItemBodySchema,
      response: {
        201: z.object({
          item_type: z.string(),
          item_id: z.string(),
        }),
      },
    },
    handler: create_item_handler,
  });
};

export const create_item_handler = async (
  request: CreateItemRequest,
  reply: FastifyReply
) => {
  const body = request.body;

  // Special handling for connection items: check for duplicates
  if (body.item_type === 'connection') {
    const state = body.item_state as any;
    if (state?.requesterId && state?.recipientId) {
      try {
        const existingConnection = await checkExistingConnection(
          state.requesterId,
          state.recipientId
        );
        
        if (existingConnection) {
          return reply.code(400).send({
            error: 'DUPLICATE_CONNECTION',
            message: 'A connection already exists with this user',
            existingConnection,
          });
        }
      } catch (err) {
        request.log.error({ err }, 'Failed to check for duplicate connection');
        // Continue with creation if check fails - better to allow than block
      }
    }
  }

  try {
    await ensureItemPartition(db, body.item_type);
  } catch (err) {
    request.log.error(
      { err, item_type: body.item_type },
      'Failed to ensure item partition'
    );

    return reply.code(500).send({
      error: 'PARTITION_SETUP_FAILED',
      message: 'Failed to prepare storage for item type',
    });
  }

  try {
    const result = await db
      .insert(items)
      .values({
        item_type: body.item_type,

        item_domain: body.item_domain,
        item_domain_url: body.item_domain_url ?? null,

        item_schema_id: body.item_schema_id,
        item_schema_url: body.item_schema_url ?? null,

        item_state: body.item_state,
        item_requirements: body.item_requirements,
        item_filters: body.item_filters,
      })
      .onConflictDoNothing({
        target: [items.item_type, items.item_id],
      })
      .returning({
        itemType: items.item_type,
        itemId: items.item_id,
      });

    if (result.length === 0) {
      return reply.code(409).send({
        error: 'ITEM_ALREADY_EXISTS',
        message: 'An item with the same type and id already exists',
      });
    }

    // Send WebSocket notification for connection requests
    if (body.item_type === 'connection') {
      const state = body.item_state as any;
      if (state?.recipientId && state?.requesterId && state?.requesterName) {
        try {
          const publisher = getNotificationPublisher();
          if (publisher) {
            const event = await publisher.publishConnectionRequest(state.recipientId, {
              connectionId: result[0].itemId,
              fromUserId: state.requesterId,
              fromUserName: state.requesterName,
              fromUserContact: state.requesterContact,
              fromUserDomain: state.requesterDomain,
              broadcastDetails: state.broadcastDetails || {},
              message: state.message,
            });
            
            // Save notification to database
            await saveNotification({
              userId: state.recipientId,
              type: 'connection_request',
              data: event.data,
            });
          }
        } catch (err) {
          request.log.error({ err }, 'Failed to send connection request notification');
          // Don't fail the request if notification fails
        }
      }
    }

    return reply.code(201).send({
      item_type: result[0].itemType,
      item_id: result[0].itemId,
    });
  } catch (err) {
    /**
     * Handle known database errors explicitly
     */
    if (err instanceof DrizzleQueryError) {
      const cause = err.cause;

      if (cause instanceof DatabaseError) {
        // 23505 = unique_violation (fallback safety)
        if (cause.code === '23505') {
          return reply.code(409).send({
            error: 'ITEM_ALREADY_EXISTS',
            message: 'An item with the same type and id already exists',
          });
        }

        // 23503 = foreign_key_violation
        if (cause.code === '23503') {
          return reply.code(400).send({
            error: 'INVALID_REFERENCE',
            message: 'One or more referenced entities do not exist',
          });
        }
      }
    }

    request.log.error(
      { err, item_type: body.item_type },
      'Failed to create item'
    );

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create item',
    });
  }
};
