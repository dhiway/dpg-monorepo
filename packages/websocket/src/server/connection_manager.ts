import { WebSocket } from 'ws';
import crypto from 'crypto';
import type { Connection } from '../types/connection';

/**
 * Manages WebSocket connections and user-to-connection mappings.
 */
export class ConnectionManager {
  /** Map of connection ID to Connection object */
  private connections = new Map<string, Connection>();
  
  /** Map of user ID to Set of connection IDs (supports multiple connections per user) */
  private userConnections = new Map<string, Set<string>>();

  /**
   * Add a new WebSocket connection for a user.
   * 
   * @param userId - User ID who owns this connection
   * @param ws - WebSocket instance
   * @returns Connection ID
   */
  addConnection(userId: string, ws: WebSocket): string {
    const connectionId = this.generateConnectionId();
    const now = Date.now();

    const connection: Connection = {
      id: connectionId,
      userId,
      ws,
      connectedAt: now,
      lastActivityAt: now,
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Add to user's connection set
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    return connectionId;
  }

  /**
   * Remove a connection.
   * 
   * @param connectionId - Connection ID to remove
   * @returns true if connection was found and removed
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    const { userId } = connection;

    // Remove from connections map
    this.connections.delete(connectionId);

    // Remove from user's connection set
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      
      // Clean up empty sets
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    return true;
  }

  /**
   * Get a specific connection by ID.
   * 
   * @param connectionId - Connection ID
   * @returns Connection object or undefined
   */
  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all active WebSocket instances for a user.
   * 
   * @param userId - User ID
   * @returns Array of WebSocket instances
   */
  getUserConnections(userId: string): WebSocket[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((conn): conn is Connection => conn !== undefined)
      .map((conn) => conn.ws);
  }

  /**
   * Get all connection IDs for a user.
   * 
   * @param userId - User ID
   * @returns Array of connection IDs
   */
  getUserConnectionIds(userId: string): string[] {
    const connectionIds = this.userConnections.get(userId);
    return connectionIds ? Array.from(connectionIds) : [];
  }

  /**
   * Update last activity timestamp for a connection.
   * 
   * @param connectionId - Connection ID
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivityAt = Date.now();
    }
  }

  /**
   * Check if a user has any active connections.
   * 
   * @param userId - User ID
   * @returns true if user has at least one connection
   */
  isUserConnected(userId: string): boolean {
    const connectionIds = this.userConnections.get(userId);
    return connectionIds ? connectionIds.size > 0 : false;
  }

  /**
   * Get total number of active connections.
   * 
   * @returns Number of connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get total number of connected users.
   * 
   * @returns Number of unique users
   */
  getUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get all active connections.
   * Useful for debugging or monitoring.
   * 
   * @returns Array of all connections
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close and remove all connections for a user.
   * 
   * @param userId - User ID
   * @param code - WebSocket close code (default: 1000 - normal closure)
   * @param reason - Close reason
   */
  closeUserConnections(userId: string, code = 1000, reason?: string): void {
    const connectionIds = this.getUserConnectionIds(userId);
    
    connectionIds.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.ws.close(code, reason);
        this.removeConnection(connectionId);
      }
    });
  }

  /**
   * Generate a unique connection ID.
   * 
   * @returns Connection ID
   */
  private generateConnectionId(): string {
    return `conn_${crypto.randomBytes(16).toString('hex')}`;
  }
}
