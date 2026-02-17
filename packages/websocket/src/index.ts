// Server exports
export {
  NotificationWebSocketServer,
  type WebSocketServerConfig,
} from './server/websocket_server';

export {
  ConnectionManager,
} from './server/connection_manager';

export {
  RedisAdapter,
  type RedisAdapterConfig,
} from './server/redis_adapter';

export {
  authenticateSession,
  defaultSessionVerifier,
  type SessionAuthConfig,
} from './server/session_auth';

// Publisher exports
export {
  NotificationPublisher,
  createNotificationPublisher,
  type NotificationPublisherConfig,
} from './publisher/notification_publisher';

// Type exports
export type {
  BaseNotificationEvent,
  StatusChangeEvent,
  ConnectionRequestEvent,
  ItemUpdateEvent,
  CustomEvent,
  NotificationEvent,
  NotificationEventData,
  UserSession,
  Connection,
  ServerMessage,
  ClientMessage,
  PingMessage,
  PongMessage,
  ConnectedMessage,
} from './types';
