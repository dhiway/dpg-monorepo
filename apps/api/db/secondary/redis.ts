import { databasesConfig } from 'apps/api/src/config';
import Redis from 'ioredis';
export const redis = new Redis(
  `redis://:${databasesConfig.redis_password}@redis:6379`
);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
