import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import item_routes from './item/item_routes';
import action_routes from './action/action_routes';
import event_routes from './event/event_routes';

const v1_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(item_routes, { prefix: '/item' });
  fastify.register(action_routes, { prefix: '/action' });
  fastify.register(event_routes, { prefix: '/event' });
};

export default v1_routes;
