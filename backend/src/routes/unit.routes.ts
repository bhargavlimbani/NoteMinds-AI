import { Router } from 'express';
import { z } from 'zod';
import * as units from '../controllers/unit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const unitUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  order: z.number().int().min(0).max(999).optional(),
});

const topicSchema = z.object({ name: z.string().trim().min(1, 'Topic name is required').max(120) });
const idParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.put('/:id', validate({ params: idParam, body: unitUpdateSchema }), units.update);
router.delete('/:id', validate({ params: idParam }), units.remove);
router.post('/:id/topics', validate({ params: idParam, body: topicSchema }), units.addTopic);

export default router;
