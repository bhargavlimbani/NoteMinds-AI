import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const message = { success: false, message: 'Too many requests. Please slow down and try again shortly.' };

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10_000 : 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** Stricter limiter for login/register to slow down brute force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10_000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** AI endpoints are expensive - keep them within a sensible budget per user/IP. */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 10_000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
