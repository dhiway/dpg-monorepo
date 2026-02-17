import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import item_routes from './item/item_routes';
import { websocket_example_routes } from './websocket_examples';
import { connection_routes } from './connection/connection_routes';
import { notification_routes } from './notification/notification_routes';

const v1_routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(item_routes, { prefix: '/item' });
  fastify.register(connection_routes, { prefix: '/connection' });
  fastify.register(notification_routes, { prefix: '/notification' });
  fastify.register(websocket_example_routes, { prefix: '/websocket' });
};

export default v1_routes;
