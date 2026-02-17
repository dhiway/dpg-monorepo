import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  external: [
    'fastify',
    '@fastify/cors',
    '@fastify/swagger',
    '@scalar/fastify-api-reference',
    'fastify-qs',
    'fastify-type-provider-zod',
    'drizzle-orm',
    'drizzle-orm/*',
    'pg',
    'pg/*',
    'ioredis',
    'dotenv'
  ],
});
