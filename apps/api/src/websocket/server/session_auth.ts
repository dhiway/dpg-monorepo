import { IncomingMessage } from 'http';
import type { UserSession } from '../types/connection';

/**
 * Session authentication configuration.
 */
export interface SessionAuthConfig {
  /**
   * Function to verify session and return user data.
   * This should integrate with your existing auth system.
   *
   * @param headers - Request headers containing session cookie
   * @returns User session data or null if invalid
   */
  verifySession: (headers: Record<string, string | string[] | undefined>) => Promise<UserSession | null>;
}

/**
 * Authenticate a WebSocket connection using session-based auth.
 * Extracts session cookie from request and verifies it.
 *
 * @param req - Incoming HTTP request (WebSocket upgrade request)
 * @param config - Session authentication configuration
 * @returns User session if authenticated, null otherwise
 */
export async function authenticateSession(
  req: IncomingMessage,
  config: SessionAuthConfig
): Promise<UserSession | null> {
  try {
    // Get headers from request
    const headers: Record<string, string | string[] | undefined> = {};

    // Copy all headers (they're already lowercase in IncomingMessage)
    Object.keys(req.headers).forEach((key) => {
      headers[key] = req.headers[key];
    });

    // Verify session using provided function
    const session = await config.verifySession(headers);

    return session;
  } catch (error) {
    console.error('Session authentication error:', error);
    return null;
  }
}

/**
 * Default session verifier that extracts userId from cookies.
 * This is a placeholder - replace with your actual auth integration.
 *
 * @param headers - Request headers
 * @returns User session or null
 */
export async function defaultSessionVerifier(
  headers: Record<string, string | string[] | undefined>
): Promise<UserSession | null> {
  // This is a placeholder implementation
  // In your actual implementation, you'll integrate with authInstance.api.getSession()
  // Example:
  // const session = await authInstance.api.getSession({ headers: new Headers(headers) });
  // if (session?.user) {
  //   return { userId: session.user.id };
  // }

  console.warn('Using default session verifier - replace with actual auth integration');
  return null;
}
