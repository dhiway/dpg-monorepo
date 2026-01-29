import { auth_middleware } from 'apps/api/utils/auth/auth_middleware';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { CreateItemBodySchema } from './item_schemas';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from 'apps/api/db/postgres/utils/items_ref_table';
import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

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

  try {
    const result = await db
      .insert(items)
      .values({
        itemType: body.item_type,

        itemDomain: body.item_domain,
        itemDomainUrl: body.item_domain_url ?? null,

        itemSchemaId: body.item_schema_id,
        itemSchemaUrl: body.item_schema_url ?? null,

        itemState: body.item_state,
        itemRequirements: body.item_requirements,
        itemFilters: body.item_filters,
      })
      .onConflictDoNothing({
        target: [items.itemType, items.itemId],
      })
      .returning({
        itemType: items.itemType,
        itemId: items.itemId,
      });

    if (result.length === 0) {
      return reply.code(409).send({
        error: 'ITEM_ALREADY_EXISTS',
        message: 'An item with the same type and id already exists',
      });
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
      { err, item_type: body.item_type, item_id: body.item_id },
      'Failed to create item'
    );

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create item',
    });
  }
};
