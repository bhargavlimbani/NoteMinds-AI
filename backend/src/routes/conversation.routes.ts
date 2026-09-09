import { Router } from 'express';
import { z } from 'zod';
import * as conversations from '../controllers/conversation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const idParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.get('/', conversations.list);
router.get('/:id', validate({ params: idParam }), conversations.get);
router.delete('/:id', validate({ params: idParam }), conversations.remove);

export default router;
