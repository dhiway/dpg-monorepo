import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HTTPServer } from 'http';
import { ConnectionManager } from './connection_manager';
import { RedisAdapter, RedisAdapterConfig } from './redis_adapter';
import { authenticateSession, SessionAuthConfig } from './session_auth';
import type { NotificationEvent } from '../types/events';
import type { ClientMessage, ConnectedMessage, PongMessage } from '../types/connection';

/**
 * WebSocket server configuration.
 */
export interface WebSocketServerConfig {
  /** Path for WebSocket endpoint (default: '/ws') */
  path?: string;
  /** Port for standalone server (optional if attaching to existing HTTP server) */
  port?: number;
  /** Session authentication configuration */
  sessionAuth: SessionAuthConfig;
  /** Redis configuration for multi-instance support (optional) */
  redis?: RedisAdapterConfig;
  /** Ping interval in milliseconds (default: 30000 - 30 seconds) */
  pingInterval?: number;
  /** Connection timeout in milliseconds (default: 60000 - 1 minute) */
  connectionTimeout?: number;
}

/**
 * WebSocket server for real-time notifications.
 * Handles connections, authentication, message routing, and scaling via Redis.
 */
export class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private connectionManager: ConnectionManager;
  private redisAdapter?: RedisAdapter;
  private config: Required<Omit<WebSocketServerConfig, 'redis' | 'port'>> & Pick<WebSocketServerConfig, 'redis'>;
  private pingIntervalId?: NodeJS.Timeout;

  constructor(server: HTTPServer, config: WebSocketServerConfig) {
    this.config = {
      path: config.path || '/ws',
      sessionAuth: config.sessionAuth,
      redis: config.redis,
      pingInterval: config.pingInterval || 30000,
      connectionTimeout: config.connectionTimeout || 60000,
    };

    // Initialize WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
    });

    // Initialize connection manager
    this.connectionManager = new ConnectionManager();

    // Initialize Redis adapter if configured
    if (this.config.redis) {
      this.redisAdapter = new RedisAdapter(this.config.redis);
      this.initializeRedis();
    }

    // Set up WebSocket event handlers
    this.setupEventHandlers();

    // Start ping interval
    this.startPingInterval();

    console.log(`WebSocket server initialized on path: ${this.config.path}`);
  }

  /**
   * Initialize Redis adapter and set up message handler.
   */
  private async initializeRedis(): Promise<void> {
    if (!this.redisAdapter) return;

    try {
      await this.redisAdapter.initialize((channel, message) => {
        this.handleRedisMessage(channel, message);
      });
      console.log('Redis adapter initialized');
    } catch (error) {
      console.error('Failed to initialize Redis adapter:', error);
    }
  }

  /**
   * Set up WebSocket server event handlers.
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      await this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle new WebSocket connection.
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      // Authenticate the connection
      const session = await authenticateSession(req, this.config.sessionAuth);

      if (!session?.userId) {
        console.warn('WebSocket connection rejected: authentication failed');
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Register the connection
      const connectionId = this.connectionManager.addConnection(session.userId, ws);

      console.log(`WebSocket connected: userId=${session.userId}, connectionId=${connectionId}`);

      // Send connection acknowledgment
      const connectedMsg: ConnectedMessage = {
        type: 'connected',
        data: {
          userId: session.userId,
          connectionId,
        },
      };
      this.sendToClient(ws, connectedMsg);

      // Set up message handler
      ws.on('message', (data) => {
        this.handleClientMessage(connectionId, session.userId, data);
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(connectionId, session.userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for connectionId=${connectionId}:`, error);
      });
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle message from client.
   */
  private handleClientMessage(connectionId: string, userId: string, data: unknown): void {
    try {
      // Update activity timestamp
      this.connectionManager.updateActivity(connectionId);

      // Parse message
      const message = JSON.parse(data.toString()) as ClientMessage;

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.handlePing(connectionId);
          break;
        
        default:
          console.warn(`Unknown message type from client: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
    }
  }

  /**
   * Handle ping message from client.
   */
  private handlePing(connectionId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const pongMsg: PongMessage = {
      type: 'pong',
      data: {
        timestamp: Date.now(),
      },
    };

    this.sendToClient(connection.ws, pongMsg);
  }

  /**
   * Handle client disconnection.
   */
  private handleDisconnection(connectionId: string, userId: string): void {
    this.connectionManager.removeConnection(connectionId);
    console.log(`WebSocket disconnected: userId=${userId}, connectionId=${connectionId}`);
  }

  /**
   * Handle message received from Redis pub/sub.
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const event = JSON.parse(message) as NotificationEvent;
      this.deliverNotification(event);
    } catch (error) {
      console.error('Error handling Redis message:', error);
    }
  }

  /**
   * Deliver a notification to the appropriate user(s).
   */
  public deliverNotification(event: NotificationEvent): void {
    const connections = this.connectionManager.getUserConnections(event.userId);

    if (connections.length === 0) {
      // User is not connected, notification can be stored for later retrieval
      console.log(`User ${event.userId} not connected, notification not delivered: ${event.id}`);
      return;
    }

    // Send to all user's connections
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, event);
      }
    });

    console.log(`Notification delivered to user ${event.userId}: ${event.type}`);
  }

  /**
   * Send a message to a client.
   */
  private sendToClient(ws: WebSocket, message: unknown): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }

  /**
   * Start periodic ping to keep connections alive.
   */
  private startPingInterval(): void {
    this.pingIntervalId = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, this.config.pingInterval);
  }

  /**
   * Get server statistics.
   */
  public getStats(): {
    connections: number;
    users: number;
    redisHealthy: boolean;
  } {
    return {
      connections: this.connectionManager.getConnectionCount(),
      users: this.connectionManager.getUserCount(),
      redisHealthy: this.redisAdapter?.isHealthy() ?? true,
    };
  }

  /**
   * Close the WebSocket server and clean up resources.
   */
  public async close(): Promise<void> {
    // Stop ping interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    // Close Redis adapter
    if (this.redisAdapter) {
      await this.redisAdapter.close();
    }

    // Close WebSocket server
    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('WebSocket server closed');
  }
}
