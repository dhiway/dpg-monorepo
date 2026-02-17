import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { fetch_notifications } from './fetch_notifications';
import { mark_read } from './mark_read';

export const notification_routes: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(fetch_notifications);
  await fastify.register(mark_read);
};
