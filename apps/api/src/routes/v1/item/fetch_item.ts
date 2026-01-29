import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from 'apps/api/db/postgres/utils/items_ref_table';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/utils/auth/auth_middleware';
import { FetchItemsQuerySchema } from './item_schemas';
import { and, eq, sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';

type FetchItemsRequest = FastifyRequest<{
  Querystring: z.infer<typeof FetchItemsQuerySchema>;
}>;

export const fetch_item: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/fetch',
    method: 'GET',
    preHandler: auth_middleware,
    schema: {
      tags: ['item'],
      query: FetchItemsQuerySchema,
      response: {
        201: z.object({
          meta: z.object({
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
          items: createSelectSchema(items).array(),
        }),
      },
    },
    handler: fetch_items_handler,
  });
};

const fetch_items_handler = async (
  request: FetchItemsRequest,
  reply: FastifyReply
) => {
  const {
    itemType,
    itemDomain,
    itemDomainUrl,
    itemSchemaId,
    itemSchemaUrl,
    itemState,
    limit,
    offset,
  } = request.query;

  const conditions = [];

  // IMPORTANT: this enables partition pruning
  if (itemType) {
    conditions.push(eq(items.itemType, itemType));
  }

  if (itemDomain) {
    conditions.push(eq(items.itemDomain, itemDomain));
  }

  if (itemDomainUrl) {
    conditions.push(eq(items.itemDomainUrl, itemDomainUrl));
  }

  if (itemSchemaId) {
    conditions.push(eq(items.itemSchemaId, itemSchemaId));
  }

  if (itemSchemaUrl) {
    conditions.push(eq(items.itemSchemaUrl, itemSchemaUrl));
  }

  if (itemState) {
    // JSONB containment: item_state @> {...}
    conditions.push(
      sql`${items.itemState} @> ${JSON.stringify(itemState)}::jsonb`
    );
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  try {
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(items)
      .where(whereClause);

    const result = await db
      .select()
      .from(items)
      .where(whereClause)
      .orderBy(sql`${items.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return reply.code(200).send({
      meta: {
        total: Number(count),
        limit,
        offset,
      },
      items: result,
    });
  } catch (err) {
    request.log.error({ err, query: request.query }, 'Failed to fetch items');

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch items',
    });
  }
};
