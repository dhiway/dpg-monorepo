import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { fetch_schemas } from './schema/fetch_schemas';
import { refetch_schema } from './schema/refetch_schema';
import { fetch_schema } from './schema/fetch_schema';
import { fetch_item } from './item/fetch_item';

const network_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(fetch_schemas);
  fastify.register(fetch_schema);
  fastify.register(fetch_item);
  fastify.register(refetch_schema);
};

export default network_routes;
