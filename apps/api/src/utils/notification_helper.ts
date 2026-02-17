import { db } from 'apps/api/db/postgres/drizzle_config';
import { notifications } from '@dpg/database';

/**
 * Save a notification to the database.
 * This should be called whenever a WebSocket notification is sent.
 */
export async function saveNotification(params: {
  userId: string;
  type: string;
  data: Record<string, unknown>;
}) {
  try {
    await db.insert(notifications).values({
      user_id: params.userId,
      type: params.type,
      data: params.data,
      read: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to save notification:', err);
    // Don't throw - notification persistence failure shouldn't break the main flow
  }
}
