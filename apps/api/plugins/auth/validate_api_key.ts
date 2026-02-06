import { authInstance } from 'apps/api/src/routes/auth/create_auth';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function validate_api_key(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
  } else {
    return reply.status(401).send({
      code: 'API_KEY_NOT_FOUND',
      error: 'Not Found',
      message: 'API key missing',
    });
  }
}
