import z, {
  getActionInteraction,
  StoreEventBodySchema,
  validateAgainstJsonSchema,
} from '@dpg/schemas';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { auth_middleware_if_enabled } from 'apps/api/plugins/auth/auth_middleware';
import { action_events, ensureActionEventPartition } from '@dpg/database';
import { getNetworkConfigByName } from 'apps/api/src/network_configs';
import {
  isServedDomainBinding,
  replyForUnservedDomain,
} from 'apps/api/src/utils/served_domain_guard';

type StoreEventRequest = FastifyRequest<{
  Body: z.infer<typeof StoreEventBodySchema>;
}>;

export const store_event: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/store',
    method: 'POST',
    preHandler: auth_middleware_if_enabled,
    schema: {
      tags: ['event'],
      body: StoreEventBodySchema,
      response: {
        201: z.object({
          event_id: z.string(),
          event_type: z.string(),
        }),
      },
    },
    handler: store_event_handler,
  });
};

export const store_event_handler = async (
  request: StoreEventRequest,
  reply: FastifyReply
) => {
  const body = request.body;

  if (
    !isServedDomainBinding(
      body.source_item.item_network,
      body.source_item.item_domain
    )
  ) {
    return replyForUnservedDomain(
      reply,
      body.source_item.item_network,
      body.source_item.item_domain
    );
  }

  try {
    const networkConfig = await getNetworkConfigByName(body.target_item.item_network);
    const interaction = getActionInteraction(networkConfig, {
      actionName: body.action_name,
      fromNetwork: body.source_item.item_network,
      fromDomain: body.source_item.item_domain,
      toNetwork: body.target_item.item_network,
      toDomain: body.target_item.item_domain,
    });

    validateAgainstJsonSchema(
      interaction.event_schema,
      body.event_payload,
      'event payload'
    );
  } catch (err) {
    return reply.code(400).send({
      error: 'INVALID_EVENT_REQUEST',
      message: err instanceof Error ? err.message : 'Invalid event request',
    });
  }

  try {
    await ensureActionEventPartition(db, body.event_type);
  } catch (err) {
    request.log.error(
      {
        err,
        event_type: body.event_type,
      },
      'Failed to ensure event partition'
    );

    return reply.code(500).send({
      error: 'PARTITION_SETUP_FAILED',
      message: 'Failed to prepare storage for event type',
    });
  }

  const [created] = await db
    .insert(action_events)
    .values({
      event_type: body.event_type,
      action_name: body.action_name,
      action_id: body.action_id,
      source_item_network: body.source_item.item_network,
      source_item_domain: body.source_item.item_domain,
      source_item_type: body.source_item.item_type,
      source_item_id: body.source_item.item_id,
      target_item_network: body.target_item.item_network,
      target_item_domain: body.target_item.item_domain,
      target_item_type: body.target_item.item_type,
      target_item_id: body.target_item.item_id,
      event_payload: body.event_payload,
      event_metadata: body.event_metadata,
      created_by: body.created_by,
    })
    .returning({
      event_id: action_events.event_id,
      event_type: action_events.event_type,
    });

  return reply.code(201).send(created);
};
