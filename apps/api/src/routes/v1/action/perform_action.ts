import z, {
  getActionInteraction,
  PerformActionBodySchema,
  validateAgainstJsonSchema,
} from '@dpg/schemas';
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../../../db/postgres/drizzle_config';
import {
  auth_middleware_if_enabled,
} from '../../../../plugins/auth/auth_middleware';
import {
  action_events,
  ensureActionEventPartition,
  ensureActionPartition,
  item_actions,
} from '@dpg/database';
import { getNetworkConfigByName } from '../../../network_configs';
import {
  isServedDomainBinding,
  replyForUnservedDomain,
} from '../../../utils/served_domain_guard';

type PerformActionRequest = FastifyRequest<{
  Body: z.infer<typeof PerformActionBodySchema>;
}>;

export const perform_action: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/perform',
    method: 'POST',
    preHandler: auth_middleware_if_enabled,
    schema: {
      tags: ['action'],
      body: PerformActionBodySchema,
      response: {
        201: z.object({
          action_id: z.string(),
          action_name: z.string(),
          status: z.string(),
          response_event_type: z.string(),
          response_event_payload: z.record(z.string(), z.unknown()),
        }),
      },
    },
    handler: perform_action_handler,
  });
};

export const perform_action_handler = async (
  request: PerformActionRequest,
  reply: FastifyReply
) => {
  const body = request.body;

  if (
    !isServedDomainBinding(
      body.target_item.item_network,
      body.target_item.item_domain
    )
  ) {
    return await replyForUnservedDomain(
      reply,
      body.target_item.item_network,
      body.target_item.item_domain
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
      interaction.requirement_schema,
      body.requirements_snapshot,
      'action requirements'
    );

    validateAgainstJsonSchema(
      interaction.event_schema,
      body.response_event_payload,
      'action response event payload'
    );
  } catch (err) {
    return reply.code(400).send({
      error: 'INVALID_ACTION_REQUEST',
      message: err instanceof Error ? err.message : 'Invalid action request',
    });
  }

  const status =
    typeof body.response_event_payload.status === 'string'
      ? body.response_event_payload.status
      : 'pending';

  try {
    await ensureActionPartition(db, body.action_name);
    await ensureActionEventPartition(db, body.response_event_type);
  } catch (err) {
    request.log.error(
      {
        err,
        action_name: body.action_name,
        response_event_type: body.response_event_type,
      },
      'Failed to ensure action/event partitions'
    );

    return reply.code(500).send({
      error: 'PARTITION_SETUP_FAILED',
      message: 'Failed to prepare storage for action or event type',
    });
  }

  const [created] = await db
    .insert(item_actions)
    .values({
      action_name: body.action_name,
      source_item_network: body.source_item.item_network,
      source_item_domain: body.source_item.item_domain,
      source_item_type: body.source_item.item_type,
      source_item_id: body.source_item.item_id,
      target_item_network: body.target_item.item_network,
      target_item_domain: body.target_item.item_domain,
      target_item_type: body.target_item.item_type,
      target_item_id: body.target_item.item_id,
      status,
      requirements_snapshot: body.requirements_snapshot,
      created_by: body.created_by,
    })
    .returning({
      action_id: item_actions.action_id,
      action_name: item_actions.action_name,
      status: item_actions.status,
    });

  await db.insert(action_events).values({
    event_type: body.response_event_type,
    action_name: created.action_name,
    action_id: created.action_id,
    source_item_network: body.source_item.item_network,
    source_item_domain: body.source_item.item_domain,
    source_item_type: body.source_item.item_type,
    source_item_id: body.source_item.item_id,
    target_item_network: body.target_item.item_network,
    target_item_domain: body.target_item.item_domain,
    target_item_type: body.target_item.item_type,
    target_item_id: body.target_item.item_id,
    event_payload: body.response_event_payload,
    event_metadata: body.response_event_metadata,
    created_by: body.created_by,
  });

  if (body.requester_event_url) {
    void fetch(body.requester_event_url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event_type: body.response_event_type,
        action_name: created.action_name,
        action_id: created.action_id,
        source_item: body.source_item,
        target_item: body.target_item,
        event_payload: body.response_event_payload,
        event_metadata: body.response_event_metadata,
        created_by: body.created_by,
      }),
    }).catch((err) => {
      request.log.error({ err }, 'Failed to forward action response event');
    });
  }

  return reply.code(201).send({
    action_id: created.action_id,
    action_name: created.action_name,
    status: created.status,
    response_event_type: body.response_event_type,
    response_event_payload: body.response_event_payload,
  });
};
