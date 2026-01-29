import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { create_item } from './create_item';
import { fetch_items } from './fetch_items';
import { update_item } from './update_item';

const item_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(create_item);
  fastify.register(fetch_items);
  fastify.register(update_item);
};

export default item_routes;
