import crypto from 'crypto';
import type { NotificationEvent, NotificationEventData } from '../types/events';
import type { RedisAdapter } from '../server/redis_adapter';
import type { NotificationWebSocketServer } from '../server/websocket_server';

/**
 * Configuration for notification publisher.
 */
export interface NotificationPublisherConfig {
  /** WebSocket server instance (for direct delivery in single-instance mode) */
  wsServer?: NotificationWebSocketServer;
  /** Redis adapter (for multi-instance mode) */
  redisAdapter?: RedisAdapter;
}

/**
 * Publisher for sending notifications to users.
 * Supports both single-instance (direct) and multi-instance (via Redis) modes.
 */
export class NotificationPublisher {
  private wsServer?: NotificationWebSocketServer;
  private redisAdapter?: RedisAdapter;

  constructor(config: NotificationPublisherConfig) {
    this.wsServer = config.wsServer;
    this.redisAdapter = config.redisAdapter;

    if (!this.wsServer && !this.redisAdapter) {
      throw new Error('NotificationPublisher requires either wsServer or redisAdapter');
    }
  }

  /**
   * Publish a status change notification.
   * 
   * @param userId - User ID to send notification to
   * @param data - Status change event data
   * @returns The created event
   */
  async publishStatusChange(
    userId: string,
    data: NotificationEventData<'status_change'>
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type: 'status_change',
      data,
    };

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish a connection request notification.
   * 
   * @param userId - User ID to send notification to
   * @param data - Connection request event data
   * @returns The created event
   */
  async publishConnectionRequest(
    userId: string,
    data: NotificationEventData<'connection_request'>
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type: 'connection_request',
      data,
    };

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish a connection status change notification.
   * 
   * @param userId - User ID to send notification to
   * @param data - Connection status change event data
   * @returns The created event
   */
  async publishConnectionStatusChange(
    userId: string,
    data: NotificationEventData<'connection_status_change'>
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type: 'connection_status_change',
      data,
    };

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish an item update notification.
   * 
   * @param userId - User ID to send notification to
   * @param data - Item update event data
   * @returns The created event
   */
  async publishItemUpdate(
    userId: string,
    data: NotificationEventData<'item_update'>
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type: 'item_update',
      data,
    };

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish a custom notification.
   * 
   * @param userId - User ID to send notification to
   * @param data - Custom event data
   * @returns The created event
   */
  async publishCustom(
    userId: string,
    data: NotificationEventData<'custom'>
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type: 'custom',
      data,
    };

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish a notification to a single user.
   * 
   * @param userId - User ID to send notification to
   * @param type - Event type
   * @param data - Event data
   * @returns The created event
   */
  async publishToUser(
    userId: string,
    type: NotificationEvent['type'],
    data: unknown
  ): Promise<NotificationEvent> {
    const event: NotificationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type,
      data,
    } as NotificationEvent;

    await this.publishEvent(event);
    return event;
  }

  /**
   * Publish a notification to multiple users.
   * Creates separate events for each user.
   * 
   * @param userIds - Array of user IDs
   * @param type - Event type
   * @param data - Event data (same for all users)
   * @returns Array of created events
   */
  async publishToUsers(
    userIds: string[],
    type: NotificationEvent['type'],
    data: unknown
  ): Promise<NotificationEvent[]> {
    const events = userIds.map((userId) => ({
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      type,
      data,
    } as NotificationEvent));

    await this.publishEvents(events);
    return events;
  }

  /**
   * Publish a pre-constructed event.
   * 
   * @param event - Notification event to publish
   */
  private async publishEvent(event: NotificationEvent): Promise<void> {
    if (this.redisAdapter) {
      // Multi-instance mode: publish via Redis
      await this.redisAdapter.publish(event);
    } else if (this.wsServer) {
      // Single-instance mode: deliver directly
      this.wsServer.deliverNotification(event);
    }
  }

  /**
   * Publish multiple events.
   * 
   * @param events - Array of notification events
   */
  private async publishEvents(events: NotificationEvent[]): Promise<void> {
    if (this.redisAdapter) {
      // Multi-instance mode: batch publish via Redis
      await this.redisAdapter.publishBatch(events);
    } else if (this.wsServer) {
      // Single-instance mode: deliver each directly
      events.forEach((event) => {
        this.wsServer!.deliverNotification(event);
      });
    }
  }

  /**
   * Generate a unique event ID.
   * 
   * @returns Event ID
   */
  private generateEventId(): string {
    return `evt_${crypto.randomBytes(16).toString('hex')}`;
  }
}

/**
 * Create a notification publisher instance.
 * 
 * @param config - Publisher configuration
 * @returns NotificationPublisher instance
 */
export function createNotificationPublisher(
  config: NotificationPublisherConfig
): NotificationPublisher {
  return new NotificationPublisher(config);
}
