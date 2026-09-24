import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import api from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

/** Builds the Express application (exported separately so tests can use it without listening). */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs behind Render's proxy
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow tools without an Origin header (curl, tests) and configured frontends.
        if (!origin || env.allowedOrigins.includes(origin) || (!env.isProd && /^http:\/\/localhost:\d+$/.test(origin))) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.isDev) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => logger.debug(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`));
      next();
    });
  }

  app.use('/api', apiLimiter, api);
  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'NoteMinds AI API', docs: '/api/health' } }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
