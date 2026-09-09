import { Router } from 'express';
import { z } from 'zod';
import * as subjects from '../controllers/subject.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

export const SUBJECT_COLORS = ['violet', 'blue', 'cyan', 'emerald', 'amber', 'rose', 'orange', 'pink', 'indigo', 'teal'] as const;

const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Subject name is required').max(100),
  code: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.enum(SUBJECT_COLORS).optional(),
});

const unitSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(120),
  description: z.string().trim().max(500).optional().nullable(),
  order: z.number().int().min(0).max(999).optional(),
  topics: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.get('/', subjects.list);
router.post('/', validate({ body: subjectSchema }), subjects.create);
router.get('/:id', validate({ params: idParam }), subjects.get);
router.put('/:id', validate({ params: idParam, body: subjectSchema.partial() }), subjects.update);
router.delete('/:id', validate({ params: idParam }), subjects.remove);
router.get('/:id/units', validate({ params: idParam }), subjects.listUnits);
router.post('/:id/units', validate({ params: idParam, body: unitSchema }), subjects.createUnit);

export default router;
