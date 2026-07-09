import Redis from 'ioredis';
import logger from '../utils/logger';

// Connect via REDIS_URL (e.g. redis://:pass@host:6379) or discrete host/port/pass.
// If Redis is unavailable, the app keeps working — caching simply no-ops.
let redis: Redis | null = null;

const url = process.env.REDIS_URL;
const host = process.env.REDIS_HOST;

if (url || host) {
  redis = url
    ? new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 })
    : new Redis({
        host,
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 2,
      });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (e) => logger.warn(`Redis error: ${e.message}`));
} else {
  logger.warn('Redis not configured (REDIS_URL/REDIS_HOST) — caching disabled');
}

export const cacheGet = async (key: string): Promise<string | null> => {
  if (!redis) return null;
  try { return await redis.get(key); } catch { return null; }
};

export const cacheSet = async (key: string, value: string, ttlSeconds: number): Promise<void> => {
  if (!redis) return;
  try { await redis.set(key, value, 'EX', ttlSeconds); } catch { /* ignore */ }
};

/** Delete all keys matching a prefix (e.g. "cache:/api/v1/catalog"). */
export const cacheInvalidate = async (prefix: string): Promise<void> => {
  if (!redis) return;
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    const keys: string[] = [];
    for await (const batch of stream) keys.push(...(batch as string[]));
    if (keys.length) await redis.del(...keys);
  } catch { /* ignore */ }
};

export default redis;
