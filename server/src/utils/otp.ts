import crypto from 'crypto';

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const generateSecureToken = (): string =>
  crypto.randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
