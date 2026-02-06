import { authInstance } from 'apps/api/src/routes/auth/create_auth';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function auth_middleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  /**
   * API KEY AUTH (highest priority)
   */
  const apiKey = request.headers['x-api-key'];

  if (typeof apiKey === 'string') {
    const verified = await authInstance.api.verifyApiKey({
      body: {
        key: apiKey,
        permissions: request.permissions || undefined,
      },
    });

    if (verified.error || !verified.valid) {
      return reply.status(403).send({
        code: 'INVALID_API_KEY',
        error: 'Forbidden',
        message: 'Invalid API key provided',
      });
    }

    return;
  }

  /**
   *  SESSION AUTH (fallback)
   */
  const session = await authInstance.api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });

  if (!session?.user) {
    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
      message: 'Missing or invalid authentication',
    });
  }

  request.user = session.user;
}
