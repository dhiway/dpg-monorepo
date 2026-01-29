import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { create_item } from './create';

const item_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(create_item);
};

export default item_routes;
