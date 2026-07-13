import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { Express } from 'express';

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

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many OTP requests, please wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
