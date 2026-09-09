import { Router } from 'express';
import { z } from 'zod';
import * as notes from '../controllers/note.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadNote } from '../middleware/upload.middleware.js';

const uploadSchema = z.object({
  subjectId: z.string().min(1, 'Select a subject'),
  unitId: z.string().optional().nullable(),
  title: z.string().trim().max(150).optional().nullable(),
});

const listQuery = z.object({
  subjectId: z.string().optional(),
  unitId: z.string().optional(),
});

const searchQuery = z.object({
  q: z.string().trim().min(1, 'Search text is required'),
  subjectId: z.string().optional(),
  unitId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.post('/upload', uploadNote.single('file'), validate({ body: uploadSchema }), notes.upload);
router.get('/', validate({ query: listQuery }), notes.list);
router.get('/search', validate({ query: searchQuery }), notes.search);
router.get('/:id', validate({ params: idParam }), notes.get);
router.delete('/:id', validate({ params: idParam }), notes.remove);

export default router;
