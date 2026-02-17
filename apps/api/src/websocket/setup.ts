import { Server as HTTPServer } from 'http';
import {
  NotificationWebSocketServer,
  createNotificationPublisher,
  NotificationPublisher,
  type SessionAuthConfig,
} from 'websocket';
import { authInstance } from '../routes/auth/create_auth';
import type { UserSession } from 'websocket';

// Global WebSocket server and publisher instances
let wsServer: NotificationWebSocketServer | null = null;
let notificationPublisher: NotificationPublisher | null = null;

/**
 * Session verifier that integrates with the existing auth system.
 */
const sessionVerifier: SessionAuthConfig['verifySession'] = async (headers) => {
  try {
    // Convert headers to Headers object for auth API
    const headersObj = new Headers(headers as Record<string, string>);
    
    // Use existing auth instance to get session
    const session = await authInstance.api.getSession({
      headers: headersObj,
    });

    // Return user session if authenticated
    if (session?.user) {
      return {
        userId: session.user.id,
        sessionId: session.session?.id,
      } as UserSession;
    }

    return null;
  } catch (error) {
    console.error('Error verifying WebSocket session:', error);
    return null;
  }
};

/**
 * Initialize WebSocket server.
 * Should be called after HTTP server is created.
 * 
 * @param httpServer - HTTP server instance
 */
export async function initializeWebSocket(httpServer: HTTPServer): Promise<void> {
  try {
    // Get Redis URL from environment (optional)
    const redisUrl = process.env.REDIS_URL;

    // Initialize WebSocket server
    wsServer = new NotificationWebSocketServer(httpServer, {
      path: process.env.WEBSOCKET_PATH || '/ws',
      sessionAuth: {
        verifySession: sessionVerifier,
      },
      redis: redisUrl ? {
        redisUrl,
        channel: 'websocket:notifications',
      } : undefined,
      pingInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 1 minute
    });

    // Initialize notification publisher
    if (redisUrl) {
      // Multi-instance mode: use Redis adapter
      const { RedisAdapter } = await import('websocket');
      const redisAdapter = new RedisAdapter({
        redisUrl,
        channel: 'websocket:notifications',
      });
      
      await redisAdapter.initialize((channel, message) => {
        // Message will be handled by WebSocket server
        const event = JSON.parse(message);
        wsServer?.deliverNotification(event);
      });

      notificationPublisher = createNotificationPublisher({
        redisAdapter,
      });
    } else {
      // Single-instance mode: direct delivery
      notificationPublisher = createNotificationPublisher({
        wsServer,
      });
    }

    console.log('WebSocket server initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
    throw error;
  }
}

/**
 * Get the notification publisher instance.
 * Throws if WebSocket server hasn't been initialized.
 * 
 * @returns NotificationPublisher instance
 */
export function getNotificationPublisher(): NotificationPublisher {
  if (!notificationPublisher) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket first.');
  }
  return notificationPublisher;
}

/**
 * Get WebSocket server statistics.
 * 
 * @returns Server stats or null if not initialized
 */
export function getWebSocketStats() {
  return wsServer?.getStats() ?? null;
}

/**
 * Shutdown WebSocket server gracefully.
 */
export async function shutdownWebSocket(): Promise<void> {
  if (wsServer) {
    await wsServer.close();
    wsServer = null;
    notificationPublisher = null;
    console.log('WebSocket server shut down');
  }
}
