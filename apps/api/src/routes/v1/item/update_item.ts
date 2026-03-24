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
import { auth_middleware_if_enabled } from 'apps/api/plugins/auth/auth_middleware';

type UpdateItemRequest = FastifyRequest<{
  Params: z.infer<typeof UpdateItemParamsSchema>;
  Body: z.infer<typeof UpdateItemBodySchema>;
}>;

export const update_item: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    method: 'PATCH',
    url: '/:itemId',
    preHandler: auth_middleware_if_enabled,
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
  const { itemId } = request.params;
  const body = request.body;
  const userId = request.user?.id;

  if (!userId) {
    return reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: 'Authenticated user is required to update an item',
    });
  }

  try {
    const result = await db
      .update(items)
      .set({
        ...body,
        updated_at: sql`now()`,
      })
      .where(and(eq(items.item_id, itemId), eq(items.created_by, userId)))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND_OR_FORBIDDEN',
        message: 'Item not found or does not belong to the authenticated user',
      });
    }

    return reply.code(200).send({
      item: result[0],
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

    request.log.error({ err, itemId, body }, 'Failed to update item');

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update item',
    });
  }
};
