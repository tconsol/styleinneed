import multer from 'multer';
import { createError } from './errorHandler';

// In-memory storage — files are buffered then streamed to GCS by the
// controller via uploadToGCS(). Keeps the request fast and avoids temp files.
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
  else cb(createError('Only image files are allowed', 400));
};

const make = (limitMB: number) =>
  multer({ storage, fileFilter, limits: { fileSize: limitMB * 1024 * 1024 } });

export const productUpload = make(2);
export const avatarUpload = make(2);
export const blogUpload = make(2);
export const bannerUpload = make(2);

// Spreadsheet upload for bulk product import (.xlsx / .xls / .csv), memory-buffered.
const sheetFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/spreadsheet|excel|csv|officedocument|octet-stream/i.test(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname)) cb(null, true);
  else cb(createError('Only Excel/CSV files are allowed', 400));
};
export const sheetUpload = multer({ storage, fileFilter: sheetFilter, limits: { fileSize: 8 * 1024 * 1024 } });

/**
 * WhatsApp template media: image, video (an animated GIF must be an MP4 —
 * WhatsApp has no GIF header type) or a document. 16 MB matches WhatsApp's
 * own ceiling for video and document headers.
 */
const mediaFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/^(image\/(jpeg|jpg|png|webp)|video\/(mp4|3gpp)|application\/(pdf|msword|vnd\.))/i.test(file.mimetype)
    || /\.(jpe?g|png|webp|mp4|3gp|pdf|docx?|xlsx?)$/i.test(file.originalname)) cb(null, true);
  else cb(createError('Use an image (JPG/PNG), video (MP4) or document (PDF/DOC)', 400));
};
export const mediaUpload = multer({ storage, fileFilter: mediaFilter, limits: { fileSize: 16 * 1024 * 1024 } });
