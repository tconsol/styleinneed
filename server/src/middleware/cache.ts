import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, cacheInvalidate } from '../config/redis';

const keyFor = (req: Request) => `cache:${req.originalUrl}`;

/**
 * Cache a GET response in Redis for `ttl` seconds. Serves cached JSON on hit
 * (X-Cache: HIT) and also sets a browser Cache-Control header so the client
 * doesn't even re-request within the window.
 */
export const cache = (ttl: number) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') return next();

    // Admin views ask for inactive rows (`includeInactive=true`). These MUST stay
    // live — a browser/Redis cache here makes deleted/edited items linger in the
    // admin after a mutation. Serve them uncached.
    if (req.query.includeInactive === 'true') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    const key = keyFor(req);

    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      res.type('application/json').send(cached);
      return;
    }

    // Wrap res.json to store the payload on the way out.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void cacheSet(key, JSON.stringify(body), ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      return originalJson(body);
    };
    next();
  };

/** Invalidate a cache namespace after a mutation, e.g. invalidate('/api/v1/catalog'). */
export const invalidateCache = (prefix: string) => cacheInvalidate(`cache:${prefix}`);

/**
 * Route middleware: flush a cache namespace BEFORE the route handler runs.
 * Pre-flushing ensures the subsequent client GET always gets fresh data,
 * eliminating the race condition of post-response async invalidation.
 */
export const flushCache = (prefix: string) =>
  async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await invalidateCache(prefix);
    next();
  };
