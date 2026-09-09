import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const ALLOWED = new Map<string, string>([
  ['.pdf', 'pdf'],
  ['.txt', 'txt'],
]);

/**
 * Files are kept in memory only (never written to the server disk), then the
 * extracted text is stored in PostgreSQL and the original optionally in
 * Supabase Storage. This keeps the app safe for hosts with ephemeral disks.
 */
export const uploadNote = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ['application/pdf', 'text/plain', 'application/octet-stream'].includes(file.mimetype);
    if (!ALLOWED.has(ext) || !mimeOk) {
      return cb(AppError.badRequest('Only PDF and TXT files are allowed'));
    }
    cb(null, true);
  },
});

export function fileTypeFromName(name: string): 'pdf' | 'txt' {
  return (ALLOWED.get(path.extname(name).toLowerCase()) ?? 'txt') as 'pdf' | 'txt';
}
