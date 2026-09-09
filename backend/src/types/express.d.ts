import type { JwtPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user, set by the auth middleware. */
      user?: { id: string; email: string };
      /** Raw JWT payload */
      auth?: JwtPayload;
    }
  }
}

export {};
