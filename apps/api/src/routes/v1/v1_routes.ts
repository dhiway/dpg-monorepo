import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import item_routes from './item/item_routes';

const v1_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(item_routes, { prefix: '/item' });
};

export default v1_routes;
