import { Router } from 'express';
import { z } from 'zod';
import * as progress from '../controllers/progress.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const querySchema = z.object({ subjectId: z.string().optional() });

const updateSchema = z
  .object({
    unitId: z.string().optional(),
    topicId: z.string().optional(),
    completion: z.number().min(0).max(100).optional(),
  })
  .refine((v) => v.unitId || v.topicId, { message: 'unitId or topicId is required' });

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: querySchema }), progress.get);
router.put('/', validate({ body: updateSchema }), progress.update);

export default router;
