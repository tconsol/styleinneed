import multer from 'multer';

// In-memory storage — files are buffered then streamed to GCS by the
// controller via uploadToGCS(). Keeps the request fast and avoids temp files.
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
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
  else cb(new Error('Only Excel/CSV files are allowed'));
};
export const sheetUpload = multer({ storage, fileFilter: sheetFilter, limits: { fileSize: 8 * 1024 * 1024 } });
