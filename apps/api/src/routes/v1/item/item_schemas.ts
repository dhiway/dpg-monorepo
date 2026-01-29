import z from '@dpg/schemas';

export const CreateItemBodySchema = z.object({
  item_type: z.string().min(1),

  item_domain: z.string().min(1),
  item_domain_url: z.url().nullable().optional(),

  item_schema_id: z.string().min(1),
  item_schema_url: z.url().nullable().optional(),

  item_state: z.record(z.string(), z.unknown()),
  item_requirements: z.record(z.string(), z.unknown()),
  item_filters: z.record(z.string(), z.unknown()),
});
