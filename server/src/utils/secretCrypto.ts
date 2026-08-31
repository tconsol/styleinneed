import crypto from 'crypto';

// Reversible encryption for the admin-viewable provider password. Uses
// AES-256-GCM with a key derived from ENCRYPTION_KEY (falls back to JWT_SECRET
// so no new env is strictly required). Ciphertext format: enc:<iv>:<tag>:<data>
// (all base64). Legacy plaintext values (no "enc:" prefix) are returned as-is on
// decrypt so existing rows keep working until they're next saved.

const PREFIX = 'enc:';

const key = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set');
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
};

export const encryptSecret = (plain: string): string => {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
};

export const decryptSecret = (value?: string): string => {
  if (!value) return '';
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return ''; // tampered / undecryptable
  }
};
