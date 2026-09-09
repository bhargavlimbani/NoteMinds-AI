import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';

/**
 * Validates the Bearer token and attaches `req.user`.
 * Every protected route uses `req.user.id` for ownership checks.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Please log in to continue');
    }
    const token = header.slice('Bearer '.length).trim();
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw AppError.unauthorized('Your session has expired. Please log in again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) throw AppError.unauthorized('Account no longer exists');

    req.user = user;
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}
