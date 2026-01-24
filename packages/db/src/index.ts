import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';
import Redis from 'ioredis';

// 1. SurrealDB Singleton must be connected before use.
export const surrealdb = new Surreal({
  engines: surrealdbNodeEngines(),
});

// 2. Redis Singleton ioredis connects lazily by default, acting as a singleton when exported.

export const redis = new Redis('redis://127.0.0.1:6379');

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

/**
 * Global initializer to be called at the start of Fastify server.
 * This ensures all DB connections are ready before the app accepts traffic.
 */

export async function initDB() {
  try {
    // Connect SurrealDB
    await surrealdb.connect('http://127.0.0.1:8000/rpc');
    await surrealdb.signin({ username: 'root', password: 'root' });

    await surrealdb.use({
      namespace: 'app',
      database: 'main',
    });
    console.log('Database connections established');
  } catch (err) {
    console.error('Database connection failed', err);
    process.exit(1);
  }
}
