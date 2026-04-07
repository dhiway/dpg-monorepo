import { authInstance } from '../../src/routes/auth/create_auth';
import { FastifyRequest, FastifyReply } from 'fastify';

export async function validate_session(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await authInstance.api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });

  if (!session?.user) {
    return reply.status(401).send({
      code: 'Session_Err',
      error: 'Unauthorized',
      message: 'Missing/invalid authentication',
    });
  }

  request.user = session.user;
}
