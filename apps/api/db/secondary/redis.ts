import { databasesConfig } from 'apps/api/src/config';
import Redis from 'ioredis';
export const redis = new Redis(
  `redis://:${databasesConfig.redis_password}@localhost:${databasesConfig.redis_port}`
);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
