import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { perform_action } from './perform_action';
import { update_action_status } from './update_action_status';

const action_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(perform_action);
  fastify.register(update_action_status);
};

export default action_routes;
