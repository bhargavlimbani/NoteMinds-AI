import { Router } from 'express';
import { z } from 'zod';
import * as topics from '../controllers/topic.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const idParam = z.object({ id: z.string().min(1) });
const completedSchema = z.object({ completed: z.boolean() });

const router = Router();
router.use(authenticate);

router.patch('/:id', validate({ params: idParam, body: completedSchema }), topics.update);
router.delete('/:id', validate({ params: idParam }), topics.remove);

export default router;
