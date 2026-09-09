import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', authenticate, dashboard.get);

export default router;
