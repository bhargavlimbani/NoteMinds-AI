import type { Response } from 'express';

/** Consistent success envelope: { success: true, data, message? } */
export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({ success: true, ...(message ? { message } : {}), data });
}
