import z from 'zod';

const ActionItemRefSchema = z.object({
  item_network: z.string().min(1),
  item_domain: z.string().min(1),
  item_type: z.string().min(1),
  item_id: z.uuid(),
});

export const ActionTargetItemRefSchema = ActionItemRefSchema.extend({
  item_instance_url: z.url(),
});

export const ActionItemRefWithInstanceSchema = ActionItemRefSchema.extend({
  item_instance_url: z.url(),
});

export const PerformActionBodySchema = z.object({
  action_name: z.string().min(1),
  source_item: ActionItemRefSchema,
  target_item: ActionTargetItemRefSchema,
  requirements_snapshot: z.record(z.string(), z.unknown()),
});

export const PerformNetworkActionBodySchema = z.object({
  action_name: z.string().min(1),
  source_item: ActionItemRefWithInstanceSchema,
  target_item: ActionItemRefWithInstanceSchema,
  requirements_snapshot: z.record(z.string(), z.unknown()),
});

export const UpdateActionStatusBodySchema = z.object({
  action_id: z.uuid(),
  action_status: z.string().min(1),
  remarks: z.string().min(1).optional(),
});

export const StoreEventBodySchema = z.object({
  origin_instance_domain: z.url(),
  action_name: z.string().min(1),
  action_id: z.uuid(),
  action_status: z.string().min(1),
  update_count: z.int().nonnegative(),
  source_item: ActionItemRefWithInstanceSchema,
  target_item: ActionItemRefWithInstanceSchema,
  source_item_latitude: z.number().nullable().optional(),
  source_item_longitude: z.number().nullable().optional(),
  target_item_latitude: z.number().nullable().optional(),
  target_item_longitude: z.number().nullable().optional(),
  event_payload: z.record(z.string(), z.unknown()).default({}),
  remarks: z.string().min(1).optional(),
});
