import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { DrizzleQueryError } from 'drizzle-orm';
import { CreateItemBodySchema } from 'packages/schemas/src/api/item_schemas';
import { DatabaseError, ensureItemPartition, items } from '@dpg/database';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';

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
    await ensureItemPartition(
      db,
      body.item_network,
      body.item_domain,
      body.item_type
    );
  } catch (err) {
    request.log.error(
      {
        err,
        item_network: body.item_network,
        item_domain: body.item_domain,
        item_type: body.item_type,
      },
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
        item_network: body.item_network,
        item_type: body.item_type,

        item_domain: body.item_domain,
        item_domain_url: body.item_domain_url,

        item_schema_id: body.item_schema_id,
        item_schema_url: body.item_schema_url,

        item_state: body.item_state,
        item_requirements: body.item_requirements,
        item_filters: body.item_filters,
        item_latitude: body.item_latitude ?? null,
        item_longitude: body.item_longitude ?? null,
      })
      .onConflictDoNothing({
        target: [
          items.item_network,
          items.item_domain,
          items.item_type,
          items.item_id,
        ],
      })
      .returning({
        itemNetwork: items.item_network,
        itemDomain: items.item_domain,
        itemType: items.item_type,
        itemId: items.item_id,
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
      {
        err,
        item_network: body.item_network,
        item_domain: body.item_domain,
        item_type: body.item_type,
      },
      'Failed to create item'
    );

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create item',
    });
  }
};
