import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { store_event } from './store_event';

const event_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(store_event);
};

export default event_routes;
