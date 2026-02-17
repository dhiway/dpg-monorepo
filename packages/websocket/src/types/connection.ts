import type { WebSocket } from 'ws';

/**
 * User session data extracted from authentication.
 */
export interface UserSession {
  /** Authenticated user ID */
  userId: string;
  /** Optional session ID */
  sessionId?: string;
  /** Optional additional session data */
  [key: string]: unknown;
}

/**
 * WebSocket connection metadata.
 */
export interface Connection {
  /** Unique connection ID */
  id: string;
  /** User ID this connection belongs to */
  userId: string;
  /** WebSocket instance */
  ws: WebSocket;
  /** Connection timestamp */
  connectedAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}

/**
 * Message sent from server to client.
 */
export interface ServerMessage<T = unknown> {
  /** Message type */
  type: string;
  /** Message payload */
  data?: T;
  /** Optional error information */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Message received from client.
 */
export interface ClientMessage<T = unknown> {
  /** Message type */
  type: string;
  /** Message payload */
  data?: T;
}

/**
 * Ping message from client to keep connection alive.
 */
export interface PingMessage extends ClientMessage {
  type: 'ping';
}

/**
 * Pong response from server.
 */
export interface PongMessage extends ServerMessage {
  type: 'pong';
  data: {
    timestamp: number;
  };
}

/**
 * Connection acknowledgment message sent to client upon successful connection.
 */
export interface ConnectedMessage extends ServerMessage {
  type: 'connected';
  data: {
    userId: string;
    connectionId: string;
  };
}
