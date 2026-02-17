/**
 * Base notification event structure.
 * All notification events extend this base.
 */
export interface BaseNotificationEvent {
  /** Unique event identifier */
  id: string;
  /** Event type discriminator */
  type: string;
  /** Unix timestamp (milliseconds) */
  timestamp: number;
  /** Recipient user ID */
  userId: string;
}

/**
 * Status change notification.
 * Sent when an item's status changes (e.g., pending -> approved).
 */
export interface StatusChangeEvent extends BaseNotificationEvent {
  type: 'status_change';
  data: {
    /** Item identifier */
    itemId: string;
    /** Type of item (e.g., 'connection', 'request', 'document') */
    itemType: string;
    /** Previous status */
    oldStatus: string;
    /** New status */
    newStatus: string;
    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Connection request notification.
 * Sent when a user receives a new connection request.
 */
export interface ConnectionRequestEvent extends BaseNotificationEvent {
  type: 'connection_request';
  data: {
    /** Connection request ID */
    connectionId: string;
    /** User ID of the requester */
    fromUserId: string;
    /** Display name of the requester */
    fromUserName: string;
    /** Contact details of the requester */
    fromUserContact?: string;
    /** Domain of the requester (e.g., 'aggregator', 'service-provider') */
    fromUserDomain?: string;
    /** Public broadcast details from the requester's profile */
    broadcastDetails?: Record<string, unknown>;
    /** Optional message from requester */
    message?: string;
    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Item update notification.
 * Generic notification for when any item is created, updated, or deleted.
 */
export interface ItemUpdateEvent extends BaseNotificationEvent {
  type: 'item_update';
  data: {
    /** Item identifier */
    itemId: string;
    /** Type of item (e.g., 'connection', 'message', 'document') */
    itemType: string;
    /** Action performed */
    action: 'created' | 'updated' | 'deleted';
    /** Changed fields and their values */
    changes: Record<string, unknown>;
    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Connection status change notification.
 * Sent when a connection request is accepted, rejected, or cancelled.
 */
export interface ConnectionStatusChangeEvent extends BaseNotificationEvent {
  type: 'connection_status_change';
  data: {
    /** Connection ID */
    connectionId: string;
    /** New status of the connection */
    status: 'accepted' | 'rejected' | 'cancelled';
    /** User ID of the person who changed the status */
    fromUserId: string;
    /** Display name of the person who changed the status */
    fromUserName: string;
    /** Contact details (only populated on accept) */
    respondDetails?: {
      name: string;
      contact: string;
      email: string;
    };
    /** Optional message */
    message?: string;
  };
}

/**
 * Custom notification event.
 * For application-specific notifications that don't fit standard types.
 */
export interface CustomEvent extends BaseNotificationEvent {
  type: 'custom';
  data: {
    /** Custom event subtype */
    subType: string;
    /** Custom event payload */
    payload: Record<string, unknown>;
  };
}

/**
 * Union type of all notification events.
 * Add new event types here as they're created.
 */
export type NotificationEvent =
  | StatusChangeEvent
  | ConnectionRequestEvent
  | ConnectionStatusChangeEvent
  | ItemUpdateEvent
  | CustomEvent;

/**
 * Helper type to extract event data without base fields.
 * Useful for creating events without manually specifying id, timestamp, userId.
 */
export type NotificationEventData<T extends NotificationEvent['type']> = Extract<
  NotificationEvent,
  { type: T }
>['data'];
