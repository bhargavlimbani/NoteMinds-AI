import { Router } from 'express';
import { z } from 'zod';
import * as quizzes from '../controllers/quiz.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const generateSchema = z.object({
  subjectId: z.string().min(1, 'Select a subject'),
  unitId: z.string().optional().nullable(),
  numberOfQuestions: z.coerce.number().int().min(1).max(20).default(5),
  difficulty: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(['EASY', 'MEDIUM', 'HARD']))
    .default('MEDIUM'),
});

const submitSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), selected: z.string().nullable() })).min(1),
  timeTakenSec: z.number().int().min(0).optional().nullable(),
});

const idParam = z.object({ id: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.post('/generate', aiLimiter, validate({ body: generateSchema }), quizzes.generate);
router.get('/', quizzes.list);
router.get('/history', quizzes.history);
router.get('/results/:id', validate({ params: idParam }), quizzes.result);
router.get('/:id', validate({ params: idParam }), quizzes.get);
router.post('/:id/submit', validate({ params: idParam, body: submitSchema }), quizzes.submit);

export default router;
