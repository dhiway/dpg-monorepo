import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { perform_action } from './perform_action';

const action_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(perform_action);
};

export default action_routes;
