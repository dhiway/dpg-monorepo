import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { get_network_schemas } from './read_schemas';
import { refetch_network_schemas } from './refetch_schemas';
import { get_network_schema } from './read_schema';

const network_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(get_network_schemas);
  fastify.register(get_network_schema);
  fastify.register(refetch_network_schemas);
};

export default network_routes;
