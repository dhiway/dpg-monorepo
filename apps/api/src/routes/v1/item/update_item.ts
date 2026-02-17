import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { and, DrizzleQueryError, eq, sql } from 'drizzle-orm';
import { DatabaseError } from '@dpg/database';
import {
  ItemSelectSchema,
  UpdateItemBodySchema,
  UpdateItemParamsSchema,
} from 'packages/schemas/src/api/item_schemas';
import { items } from '@dpg/database';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import { getNotificationPublisher } from '../../../websocket/setup';
import { saveNotification } from '../../../utils/notification_helper';
import { ConnectionItemState } from '../connection/fetch_connections_helper';

type UpdateItemRequest = FastifyRequest<{
  Params: z.infer<typeof UpdateItemParamsSchema>;
  Body: z.infer<typeof UpdateItemBodySchema>;
}>;

export const update_item: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    method: 'PATCH',
    url: '/:itemType/:itemId',
    preHandler: auth_middleware,
    schema: {
      tags: ['item'],
      params: UpdateItemParamsSchema,
      body: UpdateItemBodySchema,
      response: {
        200: z.object({
          item: ItemSelectSchema,
        }),
      },
    },
    handler: update_item_handler,
  });
};

export const update_item_handler = async (
  request: UpdateItemRequest,
  reply: FastifyReply
) => {
  const { itemType, itemId } = request.params;
  const body = request.body;

  // Fetch the current item to compare old vs new state
  let currentItem: any = null;
  if (itemType === 'connection' && body.item_state) {
    try {
      const existing = await db
        .select()
        .from(items)
        .where(and(eq(items.item_type, itemType), eq(items.item_id, itemId)))
        .limit(1);
      
      if (existing.length > 0) {
        currentItem = existing[0];
      }
    } catch (err) {
      request.log.warn({ err }, 'Failed to fetch current item for comparison');
    }
  }

  try {
    const result = await db
      .update(items)
      .set({
        ...body,
        updated_at: sql`now()`,
      })
      .where(and(eq(items.item_type, itemType), eq(items.item_id, itemId)))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found',
      });
    }

    const updatedItem = result[0];

    // Special handling for connection status changes
    if (itemType === 'connection' && currentItem && body.item_state) {
      const oldState = currentItem.item_state as ConnectionItemState;
      const newState = body.item_state as Partial<ConnectionItemState>;
      
      // If status changed, send notification to the requester
      if (newState.status && newState.status !== oldState.status) {
        try {
          const publisher = getNotificationPublisher();
          if (publisher) {
            const recipientId = newState.status === 'cancelled' 
              ? oldState.recipientId 
              : oldState.requesterId;
            
            const fromUserName = newState.respondDetails?.name || oldState.requesterName;
            
            const event = await publisher.publishConnectionStatusChange(recipientId, {
              connectionId: itemId,
              status: newState.status as 'accepted' | 'rejected' | 'cancelled',
              fromUserId: (request as any).session?.userId || 'system',
              fromUserName,
              respondDetails: newState.respondDetails || undefined,
              message: newState.status === 'accepted' 
                ? 'Your connection request was accepted'
                : newState.status === 'rejected'
                ? 'Your connection request was declined'
                : 'Connection request was cancelled',
            });
            
            // Save notification to database
            await saveNotification({
              userId: recipientId,
              type: 'connection_status_change',
              data: event.data,
            });
          }
        } catch (err) {
          request.log.error({ err }, 'Failed to send connection status change notification');
          // Don't fail the request if notification fails
        }
      }
    }

    // Send WebSocket notification for item update (generic)
    try {
      const publisher = getNotificationPublisher();
      
      // Determine which user(s) to notify
      // If the item has a user_id field, notify that user
      if (updatedItem.item_state && typeof updatedItem.item_state === 'object' && 'userId' in updatedItem.item_state) {
        const userId = (updatedItem.item_state as any).userId;
        
        await publisher.publishItemUpdate(userId, {
          itemId: updatedItem.item_id,
          itemType: updatedItem.item_type,
          action: 'updated',
          changes: body,
        });
      }
    } catch (wsError) {
      // Log WebSocket error but don't fail the request
      request.log.warn({ wsError, itemId, itemType }, 'Failed to send WebSocket notification');
    }

    return reply.code(200).send({
      item: updatedItem,
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      const cause = err.cause;

      if (cause instanceof DatabaseError) {
        // Example: JSON schema / type issues
        if (cause.code === '22P02') {
          return reply.code(400).send({
            error: 'INVALID_INPUT',
            message: 'Invalid value provided',
          });
        }
      }
    }

    request.log.error({ err, itemType, itemId, body }, 'Failed to update item');

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update item',
    });
  }
};
