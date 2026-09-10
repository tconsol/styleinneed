import crypto from 'crypto';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import { encryptSecret, decryptSecret } from './secretCrypto';

/**
 * TOTP (RFC 6238) helpers for staff two-factor auth.
 *
 * The shared secret is stored AES-256-GCM encrypted (same key material as the
 * provider passwords) rather than in the clear, so a leaked database dump does
 * not hand out working authenticator seeds.
 *
 * Recovery codes are stored as SHA-256 digests. A fast hash is right here: the
 * codes are 40 bits of random from a 32-symbol alphabet, so there is no
 * low-entropy guess for an attacker to grind.
 */

// Codes are shown once. Crockford-ish alphabet: no I, O, 0, 1 to misread.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_CODE_COUNT = 10;

const issuer = (): string => process.env.TOTP_ISSUER || process.env.APP_NAME || 'Style In Need';

/** A fresh base32 secret, encrypted for storage. */
export const createSecret = (): { secret: string; encrypted: string } => {
  const secret = generateSecret();
  return { secret, encrypted: encryptSecret(secret) };
};

/** The otpauth:// URI an authenticator app scans. */
export const otpauthUri = (secret: string, accountEmail: string): string =>
  generateURI({ issuer: issuer(), label: accountEmail, secret });

/**
 * Check a 6-digit code against the stored secret. `epochTolerance` of 30s means
 * the previous and next step are accepted, which covers ordinary clock drift
 * without widening the window enough to matter.
 */
export const verifyToken = async (encryptedSecret: string | undefined, token: string): Promise<boolean> => {
  const secret = decryptSecret(encryptedSecret);
  if (!secret || !/^\d{6}$/.test(token || '')) return false;
  try {
    const result = await verifyOtp({ secret, token, epochTolerance: 30 });
    return !!result.valid;
  } catch {
    return false;
  }
};

const randomCode = (): string => {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
};

export const hashRecoveryCode = (code: string): string =>
  crypto.createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');

/** Plain codes go to the user once; only the hashes are persisted. */
export const createRecoveryCodes = (): { codes: string[]; hashes: string[] } => {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, randomCode);
  return { codes, hashes: codes.map(hashRecoveryCode) };
};

/**
 * Consume a recovery code. Returns the remaining hashes when it matched, or
 * null when it did not — the caller persists the shortened list so each code
 * works exactly once.
 */
export const consumeRecoveryCode = (hashes: string[] = [], code: string): string[] | null => {
  const target = hashRecoveryCode(code);
  const idx = hashes.findIndex((h) => h.length === target.length
    && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(target)));
  if (idx === -1) return null;
  return hashes.filter((_, i) => i !== idx);
};

export const looksLikeRecoveryCode = (value: string): boolean =>
  /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test((value || '').trim());
