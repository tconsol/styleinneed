import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Move reversibly-encrypted secrets from one key to another.
 *
 * `secretCrypto` derives its AES key from ENCRYPTION_KEY, falling back to
 * JWT_SECRET when that is unset. Introducing a dedicated ENCRYPTION_KEY
 * therefore changes the key, and every existing ciphertext would stop
 * decrypting — silently, because `decryptSecret` returns '' on failure rather
 * than throwing.
 *
 * So: decrypt with the old key, re-encrypt with the new one, in a single pass.
 *
 *   OLD_SECRET=<current key> NEW_SECRET=<new key> npm run rekey:secrets
 *
 * Dry-run by default; pass --commit to write.
 */

const deriveKey = (secret: string): Buffer =>
  crypto.createHash('sha256').update(secret).digest();

const PREFIX = 'enc:';

const decryptWith = (key: Buffer, value?: string): string | null => {
  if (!value || !value.startsWith(PREFIX)) return null;
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

const encryptWith = (key: Buffer, plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
};

/** Every field that holds a reversibly-encrypted value. */
const TARGETS: { collection: string; field: string; label: string }[] = [
  { collection: 'users', field: 'plainPassword', label: 'Provider passwords' },
  { collection: 'users', field: 'twoFactorSecret', label: '2FA secrets' },
  { collection: 'giftcards', field: 'pin', label: 'Gift card PINs' },
];

(async () => {
  const oldSecret = process.env.OLD_SECRET;
  const newSecret = process.env.NEW_SECRET;
  const commit = process.argv.includes('--commit');

  if (!oldSecret || !newSecret) throw new Error('Set OLD_SECRET and NEW_SECRET');
  if (oldSecret === newSecret) throw new Error('OLD_SECRET and NEW_SECRET are identical — nothing to do');
  if (newSecret.length < 32) throw new Error('NEW_SECRET should be at least 32 characters');

  const oldKey = deriveKey(oldSecret);
  const newKey = deriveKey(newSecret);

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(commit ? '── RE-KEYING (writing) ──' : '── DRY RUN (pass --commit to write) ──');

  let migrated = 0;
  let failed = 0;

  for (const t of TARGETS) {
    const coll = mongoose.connection.collection(t.collection);
    const rows = await coll.find({ [t.field]: { $regex: `^${PREFIX}` } }).toArray();
    if (rows.length === 0) { console.log(`${t.label}: none`); continue; }

    let ok = 0;
    for (const row of rows) {
      const plain = decryptWith(oldKey, row[t.field] as string);
      if (plain === null) {
        // Already on the new key, or genuinely corrupt — never overwrite it.
        const onNewKey = decryptWith(newKey, row[t.field] as string) !== null;
        console.log(`  ${row._id}: ${onNewKey ? 'already re-keyed, skipped' : 'COULD NOT DECRYPT — left untouched'}`);
        if (!onNewKey) failed += 1;
        continue;
      }
      if (commit) {
        await coll.updateOne({ _id: row._id }, { $set: { [t.field]: encryptWith(newKey, plain) } });
      }
      ok += 1;
    }
    migrated += ok;
    console.log(`${t.label}: ${ok} of ${rows.length} ${commit ? 're-keyed' : 'would be re-keyed'}`);
  }

  console.log(`\nTotal: ${migrated} value(s) ${commit ? 're-keyed' : 'ready'}, ${failed} unreadable`);
  if (commit) console.log('Now set ENCRYPTION_KEY to NEW_SECRET in .env and restart the server.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
