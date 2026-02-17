import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { fetch_my_connections } from './fetch_my_connections';
import { check_connection } from './check_connection';

export const connection_routes: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(fetch_my_connections);
  await fastify.register(check_connection);
};
