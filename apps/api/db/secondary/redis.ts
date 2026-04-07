import { databasesConfig } from '../../src/config';
import Redis from 'ioredis';
export const redis = new Redis(databasesConfig.redis_url);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
