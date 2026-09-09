import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

/**
 * Central error handler. Returns a structured body and never leaks stack
 * traces, database errors or secrets in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let message = 'Unable to process your request';
  let details: unknown;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      message = 'A record with the same value already exists';
    } else if (err.code === 'P2025') {
      status = 404;
      message = 'Resource not found';
    }
  } else if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = `File is too large. Maximum size is ${env.MAX_UPLOAD_MB} MB`;
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    message = 'Invalid JSON body';
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed`, err instanceof Error ? err.stack : err);
  } else {
    logger.debug(`${req.method} ${req.originalUrl} -> ${status} ${message}`);
  }

  const body: Record<string, unknown> = { success: false, message };
  if (details !== undefined && status < 500) body.details = details;
  if (!env.isProd && status >= 500 && err instanceof Error) body.debug = err.message;

  res.status(status).json(body);
}
