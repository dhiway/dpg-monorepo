import z from 'zod';

const ItemRefSchema = z.object({
  item_network: z.string().min(1),
  item_domain: z.string().min(1),
  item_type: z.string().min(1),
  item_id: z.uuid(),
});

export const PerformActionBodySchema = z.object({
  action_name: z.string().min(1),
  source_item: ItemRefSchema,
  target_item: ItemRefSchema,
  requirements_snapshot: z.record(z.string(), z.unknown()),
  created_by: z.string().min(1),
  response_event_type: z.string().min(1).default('action_response'),
  response_event_payload: z.record(z.string(), z.unknown()),
  response_event_metadata: z.record(z.string(), z.unknown()).default({}),
  requester_event_url: z.url().optional(),
});

export const StoreEventBodySchema = z.object({
  event_type: z.string().min(1),
  action_name: z.string().min(1),
  action_id: z.uuid(),
  source_item: ItemRefSchema,
  target_item: ItemRefSchema,
  event_payload: z.record(z.string(), z.unknown()),
  event_metadata: z.record(z.string(), z.unknown()).default({}),
  created_by: z.string().min(1),
});
