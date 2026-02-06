import z from '@dpg/schemas';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/utils/auth/auth_middleware';
import { and, eq, sql } from 'drizzle-orm';
import {
  FetchItemsQuerySchema,
  ItemSelectSchema,
} from 'packages/schemas/src/api/item_schemas';
import { items } from '@dpg/database';

type FetchItemsRequest = FastifyRequest<{
  Querystring: z.infer<typeof FetchItemsQuerySchema>;
}>;

export const fetch_items: FastifyPluginAsyncZod = async function (fastify) {
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
          items: ItemSelectSchema.array(),
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
    item_id,
    item_type,
    item_domain,
    item_domain_url,
    item_schema_id,
    item_schema_url,
    item_state,
    limit,
    offset,
  } = request.query;

  const conditions = [];

  // IMPORTANT: this enables partition pruning
  if (item_id) {
    conditions.push(eq(items.item_id, item_id));
  }

  if (item_type) {
    conditions.push(eq(items.item_type, item_type));
  }

  if (item_domain) {
    conditions.push(eq(items.item_domain, item_domain));
  }

  if (item_domain_url) {
    conditions.push(eq(items.item_domain_url, item_domain_url));
  }

  if (item_schema_id) {
    conditions.push(eq(items.item_schema_id, item_schema_id));
  }

  if (item_schema_url) {
    conditions.push(eq(items.item_schema_url, item_schema_url));
  }

  if (item_state) {
    // JSONB containment: item_state @> {...}
    conditions.push(
      sql`${items.item_state} @> ${JSON.stringify(item_state)}::jsonb`
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
      .orderBy(sql`${items.created_at} DESC`)
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
