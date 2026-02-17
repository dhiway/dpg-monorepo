import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import z from '@dpg/schemas';
import { fetchUserConnections } from './fetch_connections_helper';
import { ItemSelectSchema } from 'packages/schemas/src/api/item_schemas';
import { FastifyReply, FastifyRequest } from 'fastify';

const QuerySchema = z.object({
  status: z
    .enum(['pending', 'accepted', 'rejected', 'cancelled'])
    .array()
    .optional(),
  direction: z.enum(['sent', 'received', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

type FetchMyConnectionsRequest = FastifyRequest<{
  Querystring: z.infer<typeof QuerySchema>;
}>;

export const fetch_my_connections: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/my-connections',
    method: 'GET',
    preHandler: auth_middleware,
    schema: {
      tags: ['connection'],
      query: QuerySchema,
      response: {
        200: z.object({
          meta: z.object({
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
          connections: ItemSelectSchema.array(),
        }),
      },
    },
    handler: async (request: FetchMyConnectionsRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { status, direction, limit, offset } = request.query;

      try {
        const result = await fetchUserConnections(userId, {
          status,
          direction,
          limit,
          offset,
        });

        return reply.code(200).send({
          meta: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          },
          connections: result.items,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch connections');
        throw err;
      }
    },
  });
};
