import { Router } from 'express';
import { z } from 'zod';
import * as chat from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4000),
  conversationId: z.string().optional().nullable(),
});

const router = Router();
router.use(authenticate);

router.post('/', aiLimiter, validate({ body: chatSchema }), chat.send);

export default router;
