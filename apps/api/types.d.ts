import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      role?: string | null | undefined;
      [key: string]: any;
    };
    permissions?: Record<string, string[]>;
  }
}
