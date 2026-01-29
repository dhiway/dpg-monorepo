import { auth_middleware } from 'apps/api/utils/auth/auth_middleware';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  ItemSelectSchema,
  UpdateItemBodySchema,
  UpdateItemParamsSchema,
} from './item_schemas';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from 'apps/api/db/postgres/utils/items_ref_table';
import { and, DrizzleQueryError, eq, sql } from 'drizzle-orm';
import { DatabaseError } from 'pg';

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

  try {
    const result = await db
      .update(items)
      .set({
        ...body,
        updatedAt: sql`now()`,
      })
      .where(and(eq(items.itemType, itemType), eq(items.itemId, itemId)))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found',
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

    request.log.error({ err, itemType, itemId, body }, 'Failed to update item');

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update item',
    });
  }
};
