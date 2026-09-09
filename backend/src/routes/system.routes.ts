import { Router } from 'express';
import * as system from '../controllers/system.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/health', system.health);
router.get('/mcp/status', authenticate, system.mcpStatus);

export default router;
