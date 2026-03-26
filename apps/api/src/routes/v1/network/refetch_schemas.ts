import z from '@dpg/schemas';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware_if_enabled } from 'apps/api/plugins/auth/auth_middleware';
import { refreshConsumedSchemas } from 'apps/api/src/network_schema_cache';

export const refetch_network_schemas: FastifyPluginAsyncZod =
  async function (fastify) {
    fastify.route({
      url: '/refetch_schemas',
      method: 'POST',
      preHandler: auth_middleware_if_enabled,
      schema: {
        tags: ['network'],
        response: {
          200: z.object({
            refreshed: z.boolean(),
            schema_count: z.number(),
          }),
        },
      },
      handler: async (_, reply) => {
        const schemas = await refreshConsumedSchemas();

        return reply.send({
          refreshed: true,
          schema_count: schemas.length,
        });
      },
    });
  };
