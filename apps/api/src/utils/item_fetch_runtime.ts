import { and, eq, sql } from 'drizzle-orm';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from '@dpg/database';

export type ItemFetchFilters = {
  item_id?: string;
  item_network: string;
  item_domain: string;
  item_type?: string;
  item_instance_url?: string | null;
  item_schema_url?: string | null;
  item_state?: Record<string, unknown>;
  item_latitude?: number;
  item_longitude?: number;
  radius_meters?: number;
  created_by?: string;
  limit: number;
  offset: number;
};

function buildWhereClause(filters: Omit<ItemFetchFilters, 'limit' | 'offset'>) {
  const conditions = [];

  if (filters.item_id) {
    conditions.push(eq(items.item_id, filters.item_id));
  }

  conditions.push(eq(items.item_network, filters.item_network));
  conditions.push(eq(items.item_domain, filters.item_domain));

  if (filters.item_type) {
    conditions.push(eq(items.item_type, filters.item_type));
  }

  if (filters.item_instance_url) {
    conditions.push(eq(items.item_instance_url, filters.item_instance_url));
  }

  if (filters.item_schema_url) {
    conditions.push(eq(items.item_schema_url, filters.item_schema_url));
  }

  if (filters.item_state) {
    conditions.push(
      sql`${items.item_state} @> ${JSON.stringify(filters.item_state)}::jsonb`
    );
  }

  if (filters.created_by) {
    conditions.push(eq(items.created_by, filters.created_by));
  }

  if (
    filters.item_latitude !== undefined &&
    filters.item_longitude !== undefined &&
    filters.radius_meters !== undefined
  ) {
    conditions.push(
      sql`
        earth_box(
          ll_to_earth(${filters.item_latitude}, ${filters.item_longitude}),
          ${filters.radius_meters}
        ) @> ll_to_earth(${items.item_latitude}, ${items.item_longitude})
      `
    );

    conditions.push(
      sql`
        earth_distance(
          ll_to_earth(${filters.item_latitude}, ${filters.item_longitude}),
          ll_to_earth(${items.item_latitude}, ${items.item_longitude})
        ) <= ${filters.radius_meters}
      `
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

export async function countLocalItems(
  filters: Omit<ItemFetchFilters, 'limit' | 'offset'>
) {
  const whereClause = buildWhereClause(filters);
  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(whereClause);

  return Number(count);
}

export async function fetchLocalItems(filters: ItemFetchFilters) {
  const whereClause = buildWhereClause(filters);
  const total = await countLocalItems(filters);
  const result = await db
    .select()
    .from(items)
    .where(whereClause)
    .orderBy(sql`${items.created_at} DESC`)
    .limit(filters.limit)
    .offset(filters.offset);

  return {
    meta: {
      total,
      limit: filters.limit,
      offset: filters.offset,
    },
    items: result,
  };
}
