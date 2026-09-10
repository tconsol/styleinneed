import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { Express, RequestHandler } from 'express';

const requireEnv = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
};

// CLIENT_URL / ADMIN_URL may each hold one or more comma-separated origins
// (e.g. apex + www, or prod + a preview domain) — both are required, no fallback.
export const allowedOrigins = (): string[] => [
  ...requireEnv('CLIENT_URL').split(','),
  ...requireEnv('ADMIN_URL').split(','),
].map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

// First entry of CLIENT_URL — used wherever a single canonical link is built
// (password-reset emails, payment-return redirects), never the full CORS list.
export const primaryClientUrl = (): string =>
  requireEnv('CLIENT_URL').split(',')[0].trim().replace(/\/$/, '');

export const applySecurityMiddleware = (app: Express): void => {
  app.use(helmet());

  app.use(
    cors({
      origin: allowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    })
  );

  app.use(mongoSanitize());
  app.use(compression());
};

/**
 * Rate limiting is off by default and enabled with RATE_LIMIT_ENABLED=true.
 *
 * It was turned off because the limits were interrupting normal use — the
 * global 200/15min in particular was being consumed by ordinary page traffic.
 *
 * The trade-off is real and worth naming: with `authLimiter` inert there is
 * nothing throttling password guesses against /auth/login, nor OTP guesses
 * against /auth/verify-email (a 6-digit code is 10^6 tries). Turn this on
 * before the store is publicly reachable.
 */
const limitsEnabled = (): boolean =>
  String(process.env.RATE_LIMIT_ENABLED || '').toLowerCase() === 'true';

/** A limiter that does nothing while limiting is disabled. */
const optionalLimiter = (options: Parameters<typeof rateLimit>[0]): RequestHandler => {
  const limiter = rateLimit(options);
  return (req, res, next) => (limitsEnabled() ? limiter(req, res, next) : next());
};

export const globalLimiter = optionalLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = optionalLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 30,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = optionalLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_OTP_MAX) || 10,
  message: { success: false, message: 'Too many OTP requests, please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
