import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from '@dpg/database';
import { and, eq, sql } from 'drizzle-orm';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ConnectionItemState {
  requesterId: string;
  requesterName: string;
  requesterContact: string;
  requesterDomain: string;
  recipientId: string;
  recipientName?: string;
  recipientDomain: string;
  status: ConnectionStatus;
  broadcastDetails: Record<string, unknown>;
  respondDetails: {
    name: string;
    contact: string;
    email: string;
  } | null;
  createdAt: string;
  respondedAt: string | null;
}

export async function fetchUserConnections(
  userId: string,
  options?: {
    status?: ConnectionStatus[];
    direction?: 'sent' | 'received' | 'all';
    limit?: number;
    offset?: number;
  }
) {
  const { status, direction = 'all', limit = 20, offset = 0 } = options || {};

  const conditions = [eq(items.item_type, 'connection')];

  // Direction filter
  if (direction === 'sent') {
    conditions.push(sql`${items.item_state}->>'requesterId' = ${userId}`);
  } else if (direction === 'received') {
    conditions.push(sql`${items.item_state}->>'recipientId' = ${userId}`);
  } else {
    // Both sent and received
    conditions.push(
      sql`(${items.item_state}->>'requesterId' = ${userId} OR ${items.item_state}->>'recipientId' = ${userId})`
    );
  }

  // Status filter
  if (status && status.length > 0) {
    conditions.push(sql`${items.item_state}->>'status' = ANY(${status})`);
  }

  const whereClause = and(...conditions);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(whereClause);

  // Get paginated results
  const results = await db
    .select()
    .from(items)
    .where(whereClause)
    .orderBy(sql`${items.created_at} DESC`)
    .limit(limit)
    .offset(offset);

  return { items: results, total: Number(count), limit, offset };
}

export async function checkExistingConnection(
  userId1: string,
  userId2: string
) {
  const result = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.item_type, 'connection'),
        sql`(
          (${items.item_state}->>'requesterId' = ${userId1} AND ${items.item_state}->>'recipientId' = ${userId2})
          OR
          (${items.item_state}->>'requesterId' = ${userId2} AND ${items.item_state}->>'recipientId' = ${userId1})
        )`,
        // Exclude rejected and cancelled connections
        sql`${items.item_state}->>'status' NOT IN ('rejected', 'cancelled')`
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
