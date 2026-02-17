import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { auth_middleware } from 'apps/api/plugins/auth/auth_middleware';
import z from '@dpg/schemas';
import { checkExistingConnection } from './fetch_connections_helper';
import { ItemSelectSchema } from 'packages/schemas/src/api/item_schemas';
import { FastifyReply, FastifyRequest } from 'fastify';

const ParamsSchema = z.object({
  userId: z.string(),
});

type CheckConnectionRequest = FastifyRequest<{
  Params: z.infer<typeof ParamsSchema>;
}>;

export const check_connection: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/check/:userId',
    method: 'GET',
    preHandler: auth_middleware,
    schema: {
      tags: ['connection'],
      params: ParamsSchema,
      response: {
        200: z.object({
          exists: z.boolean(),
          connection: ItemSelectSchema.nullable(),
        }),
      },
    },
    handler: async (request: CheckConnectionRequest, reply: FastifyReply) => {
      const currentUserId = (request as any).user.id;
      const { userId: targetUserId } = request.params;

      try {
        const connection = await checkExistingConnection(
          currentUserId,
          targetUserId
        );

        return reply.code(200).send({
          exists: connection !== null,
          connection,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to check connection');
        throw err;
      }
    },
  });
};
