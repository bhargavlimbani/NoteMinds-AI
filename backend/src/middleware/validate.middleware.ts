import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/** Validates and sanitises request parts with zod before the controller runs. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        Object.assign(req.params, parsed);
      }
      if (schemas.query) {
        // Express 5 exposes `req.query` as a getter; store the parsed copy separately.
        (req as Request & { validatedQuery: unknown }).validatedQuery = schemas.query.parse(req.query);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getQuery<T>(req: Request): T {
  return ((req as Request & { validatedQuery?: T }).validatedQuery ?? (req.query as unknown)) as T;
}
