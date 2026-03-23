import { items } from '@dpg/database';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';
export const ItemSelectSchema = createSelectSchema(items);
export const ItemInsertSchema = createInsertSchema(items);

export const CreateItemBodySchema = ItemInsertSchema.omit({
  item_id: true,
  created_at: true,
  updated_at: true,
});

export const FetchItemsQuerySchema = z.object({
  item_id: z.uuid().optional(),
  item_network: z.string().min(1),
  item_domain: z.string().min(1),
  item_type: z.string().min(1),

  item_instance_url: z.url().nullable().optional(),

  item_schema_url: z.url().nullable().optional(),

  item_state: z.record(z.string(), z.unknown()).optional(),
  item_latitude: z.coerce.number().optional(),
  item_longitude: z.coerce.number().optional(),
  radius_meters: z.coerce.number().positive().optional(),

  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  (data) => {
    const hasCoordinates =
      data.item_latitude !== undefined || data.item_longitude !== undefined;

    if (!hasCoordinates) {
      return true;
    }

    return (
      data.item_latitude !== undefined &&
      data.item_longitude !== undefined &&
      data.radius_meters !== undefined
    );
  },
  {
    message:
      'item_latitude, item_longitude, and radius_meters must be provided together for geosearch',
    path: ['radius_meters'],
  }
);

export const UpdateItemParamsSchema = z.object({
  itemNetwork: z.string().min(1),
  itemDomain: z.string().min(1),
  itemType: z.string().min(1),
  itemId: z.uuid(),
});

export const UpdateItemBodySchema = ItemInsertSchema.omit({
  item_network: true,
  item_domain: true,
  item_type: true,
  item_id: true,
  created_at: true,
  updated_at: true,
})
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
