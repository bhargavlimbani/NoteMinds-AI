import { Router } from 'express';
import { z } from 'zod';
import * as recommendations from '../controllers/recommendation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const querySchema = z.object({
  ai: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? true : v === '1' || v === 'true')),
});

const router = Router();
router.use(authenticate);

router.get('/', aiLimiter, validate({ query: querySchema }), recommendations.get);

export default router;
