import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import crypto from 'crypto';
import redis from '../config/redis';
import logger from '../utils/logger';

/**
 * On-the-fly thumbnail proxy.
 *
 * Product images are stored at up to 1600px (~200 KB each). A mega-menu tile or
 * a card thumbnail needs a fraction of that, and shipping the full-size file
 * made hover menus feel slow. This resizes on demand and caches the result, so
 * the 100+ images already in the bucket get fixed without re-uploading any of
 * them.
 *
 * SECURITY: only URLs inside our own bucket are fetched. An image proxy that
 * accepts arbitrary URLs is an SSRF hole — it would happily fetch
 * http://169.254.169.254/ (cloud metadata) or an internal service and hand the
 * bytes back to the caller.
 */

const ALLOWED_WIDTHS = [80, 160, 240, 320, 480, 640, 960];

/**
 * A small in-process cache in front of Redis.
 *
 * Redis here is Redis Cloud — a remote hop, so even a hit costs ~500ms for a
 * 15 KB blob. The hot set (mega-menu tiles, listing thumbnails) is tiny, so
 * keeping the most recent few hundred in memory turns repeat hits into
 * microseconds. Bounded so it can't grow without limit.
 */
const MEMORY_MAX = 250;
const memory = new Map<string, Buffer>();

const memoryGet = (key: string): Buffer | undefined => {
  const hit = memory.get(key);
  // Re-insert so the most recently used entry is evicted last.
  if (hit) { memory.delete(key); memory.set(key, hit); }
  return hit;
};

const memorySet = (key: string, buf: Buffer): void => {
  memory.set(key, buf);
  if (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
};
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** The one host+path prefix this proxy will fetch from. */
const allowedPrefix = (): string => {
  const bucket = process.env.GCS_BUCKET || '';
  return `https://storage.googleapis.com/${bucket}/`;
};

const isAllowedSource = (url: string): boolean => {
  const prefix = allowedPrefix();
  if (!process.env.GCS_BUCKET) return false;
  if (!url.startsWith(prefix)) return false;

  // Reject anything that could re-point the request elsewhere.
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && parsed.hostname === 'storage.googleapis.com'
      && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};

/** Nearest allowed width, so the cache can't be flooded with arbitrary sizes. */
const snapWidth = (raw: unknown): number => {
  const n = Number(raw) || 320;
  return ALLOWED_WIDTHS.reduce((best, w) => (Math.abs(w - n) < Math.abs(best - n) ? w : best), ALLOWED_WIDTHS[0]);
};

export const getThumbnail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const url = String(req.query.url || '');
    const width = snapWidth(req.query.w);

    if (!url) { res.status(400).json({ success: false, message: 'url is required' }); return; }
    if (!isAllowedSource(url)) {
      res.status(400).json({ success: false, message: 'That image is not from this store' });
      return;
    }

    const key = `thumb:${width}:${crypto.createHash('sha1').update(url).digest('hex')}`;

    // Immutable: a given URL+width always renders the same bytes.
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Content-Type', 'image/webp');
    // Helmet defaults every response to `same-origin`, which makes the browser
    // refuse to render this image on the storefront (a different origin from
    // the API). These are public product pictures, so opting this one route
    // into cross-origin loading is safe.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const inMemory = memoryGet(key);
    if (inMemory) {
      res.setHeader('X-Cache', 'MEMORY');
      res.end(inMemory);
      return;
    }

    // Redis is optional — without it the proxy still works, just uncached.
    const cached = redis ? await redis.getBuffer(key).catch(() => null) : null;
    if (cached) {
      memorySet(key, cached);
      res.setHeader('X-Cache', 'REDIS');
      res.end(cached);
      return;
    }

    const source = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 15_000,
      maxContentLength: MAX_SOURCE_BYTES,
      maxRedirects: 0, // a redirect could leave the allowlisted host
    });

    const out = await sharp(Buffer.from(source.data))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    memorySet(key, out);
    // Best-effort cache; a Redis outage must not break image serving.
    redis?.set(key, out, 'EX', CACHE_TTL_SECONDS).catch(() => {});

    res.setHeader('X-Cache', 'MISS');
    res.end(out);
  } catch (err) {
    // Never 500 on an <img> — a broken image is better than a console full of
    // server errors, and the client falls back to the original URL.
    logger.warn(`Thumbnail failed: ${(err as Error).message}`);
    res.status(404).end();
  }
};
