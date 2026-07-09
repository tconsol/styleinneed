import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import crypto from 'crypto';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    // .env stores the key with literal \n — turn them into real newlines
    private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
});

export const bucket = storage.bucket(process.env.GCS_BUCKET as string);

const PUBLIC_BASE = `https://storage.googleapis.com/${bucket.name}`;

/**
 * Compress + convert an uploaded image to WebP, then upload to GCS.
 * Caps dimensions at 1600px and targets ~80 quality to shrink file size.
 * Returns the public URL.
 */
export const uploadToGCS = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const webp = await sharp(file.buffer)
    .rotate() // respect EXIF orientation
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  const blob = bucket.file(key);

  await blob.save(webp, {
    contentType: 'image/webp',
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  // Make the object public. On fine-grained buckets this grants per-object
  // public read; on uniform-access buckets it throws (public read comes from
  // the bucket IAM binding instead) so we ignore that error.
  try {
    await blob.makePublic();
  } catch {
    /* uniform bucket-level access — public read handled by bucket IAM */
  }

  // Canonical public URL straight from the bucket object (stored in DB).
  return blob.publicUrl();
};

/**
 * Delete an object from the bucket given its public URL. Best-effort —
 * never throws (missing objects are ignored), so it won't block deletes.
 */
export const deleteFromGCS = async (url?: string): Promise<void> => {
  if (!url || !url.startsWith(PUBLIC_BASE)) return;
  const key = decodeURIComponent(url.slice(PUBLIC_BASE.length + 1));
  if (!key) return;
  try {
    await bucket.file(key).delete({ ignoreNotFound: true });
  } catch {
    /* swallow — deletion is best-effort */
  }
};
