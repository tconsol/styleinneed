import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import axios from 'axios';
import redis from '../config/redis';
import { bucket } from '../config/gcs';
import { sendSuccess } from '../utils/apiResponse';
import { verifyEmailConnection } from '../services/email.service';
import { isWhatsAppConfigured, canListTemplates, listMetaTemplates } from '../services/whatsapp.service';
import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';
import logger from '../utils/logger';

/**
 * Production readiness at a glance.
 *
 * Every check actually exercises the dependency — a ping, a HEAD, a real API
 * call — rather than just reporting whether an environment variable happens to
 * be non-empty. A key that is present but rejected is the failure mode that
 * matters, and only a live call finds it.
 */

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'off';

interface Check {
  key: string;
  label: string;
  group: string;
  status: CheckStatus;
  detail: string;
  /** Round-trip time of the probe, when one was made. */
  ms?: number;
  /** What to do about it, when it isn't ok. */
  fix?: string;
}

const has = (name: string): boolean => Boolean((process.env[name] || '').trim());

/** Which env vars are set, without ever revealing their values. */
const envReport = (names: string[]): { name: string; set: boolean }[] =>
  names.map((name) => ({ name, set: has(name) }));

const timed = async <T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; ms: number }> => {
  const start = Date.now();
  try {
    return { value: await fn(), ms: Date.now() - start };
  } catch (err) {
    return { error: (err as Error).message?.slice(0, 200) || 'failed', ms: Date.now() - start };
  }
};

/* ─────────────────────────── individual probes ─────────────────────────── */

const checkMongo = async (): Promise<Check> => {
  const base = { key: 'mongodb', label: 'MongoDB', group: 'Data' };
  if (mongoose.connection.readyState !== 1) {
    return { ...base, status: 'fail', detail: 'Not connected', fix: 'Check MONGODB_URI and network access.' };
  }
  const r = await timed(() => mongoose.connection.db!.admin().ping());
  if (r.error) return { ...base, status: 'fail', detail: r.error, ms: r.ms, fix: 'Database unreachable.' };
  return {
    ...base,
    status: r.ms > 500 ? 'warn' : 'ok',
    detail: `Connected to ${mongoose.connection.name}`,
    ms: r.ms,
    fix: r.ms > 500 ? 'Ping is slow — check the cluster region against the server region.' : undefined,
  };
};

const checkRedis = async (): Promise<Check> => {
  const base = { key: 'redis', label: 'Redis cache', group: 'Data' };
  if (!redis) {
    return { ...base, status: 'off', detail: 'Not configured — caching and rate-limit stores fall back to memory', fix: 'Set REDIS_URL to enable shared caching.' };
  }
  const r = await timed(() => redis!.ping());
  if (r.error) return { ...base, status: 'warn', detail: r.error, ms: r.ms, fix: 'Cache is down; the app still works but is slower.' };
  return { ...base, status: r.ms > 400 ? 'warn' : 'ok', detail: 'PONG', ms: r.ms };
};

const checkStorage = async (): Promise<Check> => {
  const base = { key: 'gcs', label: 'Image storage (GCS)', group: 'Infrastructure' };
  if (!has('GCS_BUCKET')) {
    return { ...base, status: 'fail', detail: 'GCS_BUCKET is not set', fix: 'Image upload will fail without it.' };
  }
  const r = await timed(() => bucket.exists());
  if (r.error) return { ...base, status: 'fail', detail: r.error, ms: r.ms, fix: 'Check the service-account credentials and bucket name.' };
  const exists = Array.isArray(r.value) ? r.value[0] : false;
  return exists
    ? { ...base, status: 'ok', detail: `Bucket "${process.env.GCS_BUCKET}" reachable`, ms: r.ms }
    : { ...base, status: 'fail', detail: 'Bucket not found', ms: r.ms, fix: 'The bucket name is wrong or the account lacks access.' };
};

const checkEmail = async (): Promise<Check> => {
  const base = { key: 'smtp', label: 'Email (SMTP)', group: 'Messaging' };
  if (!has('SMTP_HOST') || !has('SMTP_USER')) {
    return { ...base, status: 'fail', detail: 'SMTP is not configured', fix: 'OTPs, order confirmations and campaigns cannot send.' };
  }
  const r = await timed(() => verifyEmailConnection());
  return r.error
    ? { ...base, status: 'fail', detail: r.error, ms: r.ms, fix: 'Check host, port and credentials.' }
    : { ...base, status: 'ok', detail: `Authenticated with ${process.env.SMTP_HOST}`, ms: r.ms };
};

const checkWhatsApp = async (): Promise<Check> => {
  const base = { key: 'whatsapp', label: 'WhatsApp (Meta Cloud API)', group: 'Messaging' };
  if (!isWhatsAppConfigured()) {
    return { ...base, status: 'off', detail: 'Not configured', fix: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.' };
  }
  if (!canListTemplates()) {
    return { ...base, status: 'warn', detail: 'Token set, but templates cannot be listed', fix: 'Set WHATSAPP_BUSINESS_ACCOUNT_ID to verify the token and list templates.' };
  }
  const r = await timed(() => listMetaTemplates());
  if (r.error || !r.value?.ok) {
    return { ...base, status: 'fail', detail: r.value?.error || r.error || 'Rejected', ms: r.ms, fix: 'Token may be expired — regenerate a System User token.' };
  }
  const approved = r.value.templates.filter((t) => t.status === 'APPROVED').length;
  return approved > 0
    ? { ...base, status: 'ok', detail: `${approved} approved template(s) of ${r.value.templates.length}`, ms: r.ms }
    : { ...base, status: 'warn', detail: 'Connected, but no approved templates', ms: r.ms, fix: 'Submit a template in Meta Business Manager.' };
};

/** A gateway is only "ok" if its key is present AND its API answers. */
const checkRazorpay = async (): Promise<Check> => {
  const base = { key: 'razorpay', label: 'Razorpay', group: 'Payments' };
  if (!has('RAZORPAY_KEY_ID') || !has('RAZORPAY_KEY_SECRET')) {
    return { ...base, status: 'off', detail: 'Not configured', fix: 'INR card/UPI checkout is unavailable.' };
  }
  const r = await timed(() => axios.get('https://api.razorpay.com/v1/payments?count=1', {
    auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! },
    timeout: 10_000,
  }));
  return r.error
    ? { ...base, status: 'fail', detail: r.error.includes('401') ? 'Credentials rejected' : r.error, ms: r.ms, fix: 'Check the key id and secret.' }
    : { ...base, status: 'ok', detail: 'API authenticated', ms: r.ms };
};

const checkStripe = async (): Promise<Check> => {
  const base = { key: 'stripe', label: 'Stripe', group: 'Payments' };
  if (!has('STRIPE_SECRET_KEY')) {
    return { ...base, status: 'off', detail: 'Not configured', fix: 'USD checkout is unavailable.' };
  }
  const r = await timed(() => axios.get('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    timeout: 10_000,
  }));
  const live = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live');
  return r.error
    ? { ...base, status: 'fail', detail: 'Credentials rejected', ms: r.ms, fix: 'Check STRIPE_SECRET_KEY.' }
    : { ...base, status: 'ok', detail: `API authenticated (${live ? 'live' : 'test'} mode)`, ms: r.ms };
};

const checkShiprocket = async (): Promise<Check> => {
  const base = { key: 'shiprocket', label: 'Shiprocket', group: 'Logistics' };
  if (!has('SHIPROCKET_EMAIL') || !has('SHIPROCKET_PASSWORD')) {
    return { ...base, status: 'off', detail: 'Not configured', fix: 'Shipments must be booked manually.' };
  }
  const r = await timed(() => axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
    email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD,
  }, { timeout: 12_000 }));
  return r.error
    ? { ...base, status: 'fail', detail: 'Login rejected', ms: r.ms, fix: 'Check the Shiprocket credentials.' }
    : { ...base, status: 'ok', detail: 'Authenticated', ms: r.ms };
};

/** Config that is checked by inspection rather than a network call. */
const staticChecks = (): Check[] => {
  const out: Check[] = [];

  const jwtSecret = process.env.JWT_SECRET || '';
  out.push({
    key: 'jwt', label: 'JWT secret', group: 'Security',
    status: !jwtSecret ? 'fail' : jwtSecret.length < 32 ? 'warn' : 'ok',
    detail: !jwtSecret ? 'Not set' : `${jwtSecret.length} characters`,
    fix: jwtSecret && jwtSecret.length < 32 ? 'Use at least 32 random characters.' : undefined,
  });

  out.push({
    key: 'encryption', label: 'Encryption key', group: 'Security',
    status: has('ENCRYPTION_KEY') ? 'ok' : 'warn',
    detail: has('ENCRYPTION_KEY') ? 'Dedicated key set' : 'Falling back to JWT_SECRET',
    fix: has('ENCRYPTION_KEY') ? undefined
      : 'Set ENCRYPTION_KEY — rotating JWT_SECRET would otherwise break stored gift-card PINs and provider passwords.',
  });

  const isProd = process.env.NODE_ENV === 'production';
  out.push({
    key: 'node_env', label: 'Environment', group: 'Runtime',
    status: isProd ? 'ok' : 'warn',
    detail: process.env.NODE_ENV || 'development',
    fix: isProd ? undefined : 'Set NODE_ENV=production before going live.',
  });

  out.push({
    key: 'client_url', label: 'Client / CORS origins', group: 'Runtime',
    status: has('CLIENT_URL') ? 'ok' : 'fail',
    detail: has('CLIENT_URL') ? String(process.env.CLIENT_URL) : 'CLIENT_URL not set',
    fix: has('CLIENT_URL') ? undefined : 'Links in emails and CORS both depend on it.',
  });

  out.push({
    key: 'google_oauth', label: 'Google sign-in', group: 'Security',
    status: has('GOOGLE_CLIENT_ID') ? 'ok' : 'off',
    detail: has('GOOGLE_CLIENT_ID') ? 'Configured' : 'Not configured',
  });

  out.push({
    key: 'firebase', label: 'Push notifications', group: 'Messaging',
    status: has('FIREBASE_PROJECT_ID') ? 'ok' : 'off',
    detail: has('FIREBASE_PROJECT_ID') ? 'Configured' : 'Not configured',
  });

  return out;
};

/**
 * How long the event loop is blocked.
 *
 * A real saturation signal that CPU percentage misses: a Node process pegged by
 * synchronous work still looks idle on CPU graphs while every request queues.
 */
const eventLoopLag = (): Promise<number> => new Promise((resolve) => {
  const start = process.hrtime.bigint();
  setImmediate(() => {
    resolve(Number(process.hrtime.bigint() - start) / 1e6);
  });
});

/** Storage footprint and the biggest collections. */
const databaseStats = async () => {
  const db = mongoose.connection.db;
  if (!db) return null;

  const stats = await db.command({ dbStats: 1, scale: 1 }).catch(() => null);
  const names = (await db.listCollections().toArray().catch(() => []))
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'));

  // estimatedDocumentCount reads collection metadata rather than scanning, so
  // this stays fast even on large collections.
  const counts = await Promise.all(
    names.map(async (name) => ({
      name,
      count: await db.collection(name).estimatedDocumentCount().catch(() => 0),
    }))
  );

  return {
    collections: names.length,
    dataSizeMb: stats ? Math.round((stats.dataSize / 1048576) * 10) / 10 : null,
    storageSizeMb: stats ? Math.round((stats.storageSize / 1048576) * 10) / 10 : null,
    indexSizeMb: stats ? Math.round((stats.indexSize / 1048576) * 10) / 10 : null,
    indexes: stats?.indexes ?? null,
    objects: stats?.objects ?? null,
    topCollections: counts.sort((a, b) => b.count - a.count).slice(0, 8),
  };
};

/** Orders and sign-ups per hour for the last day — is the system doing work? */
const recentActivity = async () => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const bucket = { $dateToString: { format: '%H:00', date: '$createdAt' } };

  const [orders, signups] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: bucket, n: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since }, role: 'customer' } },
      { $group: { _id: bucket, n: { $sum: 1 } } },
    ]),
  ]);

  const orderBy = new Map(orders.map((o) => [o._id, o.n]));
  const signupBy = new Map(signups.map((u) => [u._id, u.n]));

  // Rolled forward from "now" so the chart reads left-to-right as elapsed time.
  const nowHour = new Date().getHours();
  return Array.from({ length: 24 }, (_, i) => {
    const h = (nowHour - 23 + i + 24) % 24;
    const label = `${String(h).padStart(2, '0')}:00`;
    return { hour: label, orders: orderBy.get(label) || 0, signups: signupBy.get(label) || 0 };
  });
};

/* ──────────────────────────────── endpoint ─────────────────────────────── */

export const getSystemHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Probes run together — serially this page would take many seconds.
    const [mongo, redisCheck, storage, email, whatsapp, razorpay, stripe, shiprocket] = await Promise.all([
      checkMongo(), checkRedis(), checkStorage(), checkEmail(),
      checkWhatsApp(), checkRazorpay(), checkStripe(), checkShiprocket(),
    ]);

    const checks: Check[] = [
      mongo, redisCheck, storage, email, whatsapp, razorpay, stripe, shiprocket,
      ...staticChecks(),
    ];

    const [lagMs, database, activity] = await Promise.all([
      eventLoopLag(), databaseStats(), recentActivity(),
    ]);

    const [products, activeProducts, outOfStock, orders, customers, staff] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ 'variants.stock': { $lte: 0 } }),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: { $in: ['admin', 'manager', 'provider'] } }),
    ]);

    const mem = process.memoryUsage();
    const counts = { ok: 0, warn: 0, fail: 0, off: 0 };
    checks.forEach((c) => { counts[c.status] += 1; });

    sendSuccess(res, 'System health', {
      // One headline: anything failing is a red banner, warnings are amber.
      overall: counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'ok',
      counts,
      checks,
      runtime: {
        node: process.version,
        platform: `${os.type()} ${os.release()}`,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: {
          heapUsed: Math.round(mem.heapUsed / 1048576),
          heapTotal: Math.round(mem.heapTotal / 1048576),
          rss: Math.round(mem.rss / 1048576),
        },
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg().map((n) => Math.round(n * 100) / 100),
        serverTime: new Date().toISOString(),
        eventLoopLagMs: Math.round(lagMs * 100) / 100,
        totalMemoryMb: Math.round(os.totalmem() / 1048576),
        freeMemoryMb: Math.round(os.freemem() / 1048576),
      },
      database,
      activity,
      data: { products, activeProducts, outOfStock, orders, customers, staff },
      // Names only — values are never returned, so this page is safe to open
      // in front of someone who should not see the secrets themselves.
      env: envReport([
        'NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN',
        'ENCRYPTION_KEY', 'CLIENT_URL', 'ADMIN_URL', 'REDIS_URL',
        'GCS_BUCKET', 'GCP_PROJECT_ID', 'GCP_CLIENT_EMAIL', 'GCP_PRIVATE_KEY',
        'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
        'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
        'SHIPROCKET_EMAIL', 'SHIPROCKET_PASSWORD',
        'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        'WHATSAPP_OTP_TEMPLATE', 'GOOGLE_CLIENT_ID', 'FIREBASE_PROJECT_ID', 'OTP_EXPIRES_IN',
      ]),
    });
  } catch (err) {
    logger.error('System health failed:', err);
    next(err);
  }
};
