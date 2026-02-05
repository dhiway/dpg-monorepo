import { items } from '@dpg/database';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';
export const ItemSelectSchema = createSelectSchema(items);
export const ItemInsertSchema = createInsertSchema(items);

export const CreateItemBodySchema = z.object({
  item_type: z.string().min(1),

  item_domain: z.string().min(1),
  item_domain_url: z.url().nullable().optional(),

  item_schema_id: z.string().optional().default(''),
  item_schema_url: z.url().nullable().optional(),

  item_state: z.record(z.string(), z.unknown()),
  item_requirements: z.record(z.string(), z.unknown()),
  item_filters: z.record(z.string(), z.unknown()),
});

export const FetchItemsQuerySchema = z.object({
  item_type: z.string().min(1),

  item_domain: z.string().min(1),
  item_domain_url: z.url().nullable().optional(),

  item_schema_id: z.string().optional().default(''),
  item_schema_url: z.url().nullable().optional(),

  item_state: z.record(z.string(), z.unknown()).optional(),

  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const UpdateItemParamsSchema = z.object({
  itemType: z.string().min(1),
  itemId: z.uuid(),
});

export const UpdateItemBodySchema = ItemInsertSchema.omit({
  itemType: true,
  itemId: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
