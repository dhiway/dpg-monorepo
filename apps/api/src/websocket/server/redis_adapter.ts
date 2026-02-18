import Redis from 'ioredis';
import type { NotificationEvent } from '../types/events';

/**
 * Redis adapter configuration.
 */
export interface RedisAdapterConfig {
  /** Redis connection URL or options */
  redisUrl: string;
  /** Channel name for pub/sub (default: 'websocket:notifications') */
  channel?: string;
}

/**
 * Redis adapter for multi-instance WebSocket scaling.
 * Enables communication between multiple WebSocket server instances.
 *
 * When one server instance publishes an event, all other instances
 * receive it via Redis pub/sub and can deliver to their connected clients.
 */
export class RedisAdapter {
  private pub: Redis;
  private sub: Redis;
  private channel: string;
  private messageHandler: ((channel: string, message: string) => void) | null = null;

  constructor(config: RedisAdapterConfig) {
    this.channel = config.channel || 'websocket:notifications';

    // Create separate Redis clients for pub and sub
    // (Redis requires separate connections for pub/sub)
    this.pub = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.sub = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Set up error handlers
    this.pub.on('error', (err) => {
      console.error('Redis pub client error:', err);
    });

    this.sub.on('error', (err) => {
      console.error('Redis sub client error:', err);
    });

    // Set up connection event handlers
    this.pub.on('connect', () => {
      console.log('Redis pub client connected');
    });

    this.sub.on('connect', () => {
      console.log('Redis sub client connected');
    });
  }

  /**
   * Initialize the adapter and start listening for messages.
   *
   * @param handler - Function to call when a message is received
   */
  async initialize(handler: (channel: string, message: string) => void): Promise<void> {
    this.messageHandler = handler;

    // Subscribe to the channel
    await this.sub.subscribe(this.channel);

    // Set up message handler
    this.sub.on('message', (channel, message) => {
      if (this.messageHandler) {
        this.messageHandler(channel, message);
      }
    });

    console.log(`Redis adapter subscribed to channel: ${this.channel}`);
  }

  /**
   * Publish a notification event to all server instances.
   *
   * @param event - Notification event to publish
   */
  async publish(event: NotificationEvent): Promise<void> {
    try {
      const message = JSON.stringify(event);
      await this.pub.publish(this.channel, message);
    } catch (error) {
      console.error('Error publishing to Redis:', error);
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch.
   *
   * @param events - Array of notification events
   */
  async publishBatch(events: NotificationEvent[]): Promise<void> {
    try {
      const pipeline = this.pub.pipeline();

      events.forEach((event) => {
        const message = JSON.stringify(event);
        pipeline.publish(this.channel, message);
      });

      await pipeline.exec();
    } catch (error) {
      console.error('Error publishing batch to Redis:', error);
      throw error;
    }
  }

  /**
   * Check if Redis connections are healthy.
   *
   * @returns true if both pub and sub clients are connected
   */
  isHealthy(): boolean {
    return (
      this.pub.status === 'ready' &&
      this.sub.status === 'ready'
    );
  }

  /**
   * Get connection status.
   *
   * @returns Status object with pub and sub client states
   */
  getStatus(): { pub: string; sub: string } {
    return {
      pub: this.pub.status,
      sub: this.sub.status,
    };
  }

  /**
   * Close all Redis connections gracefully.
   */
  async close(): Promise<void> {
    try {
      // Unsubscribe from channel
      await this.sub.unsubscribe(this.channel);

      // Close connections
      await Promise.all([
        this.pub.quit(),
        this.sub.quit(),
      ]);

      console.log('Redis adapter closed');
    } catch (error) {
      console.error('Error closing Redis adapter:', error);
      throw error;
    }
  }
}
