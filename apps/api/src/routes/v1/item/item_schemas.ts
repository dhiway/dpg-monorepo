import z from '@dpg/schemas';
import { items } from 'apps/api/db/postgres/utils/items_ref_table';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const ItemSelectSchema = createSelectSchema(items);
export const ItemInsertSchema = createInsertSchema(items);

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

export const FetchItemsQuerySchema = z.object({
  itemType: z.string().min(1).optional(),
  itemDomain: z.string().min(1).optional(),
  itemDomainUrl: z.url().optional(),
  itemSchemaId: z.string().min(1).optional(),
  itemSchemaUrl: z.url().optional(),
  // JSONB partial match
  itemState: z.record(z.string(), z.unknown()).optional(),
  // Pagination
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
