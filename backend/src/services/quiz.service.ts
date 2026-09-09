import { Type, type Schema } from '@google/genai';
import { Prisma, type Difficulty, type QuestionType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { createLogger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { assertAIConfigured, generateJSON } from '../ai/gemini.js';
import { QUIZ_SYSTEM_PROMPT, buildQuizPrompt } from '../ai/prompts.js';
import { assertSubjectOwner } from './subject.service.js';
import { assertUnitOwner } from './unit.service.js';
import { getNoteContext } from './note.service.js';
import { bumpProgressFromQuiz } from './progress.service.js';
import { logActivity } from './activity.service.js';

const log = createLogger('quiz');

export interface GenerateQuizInput {
  subjectId: string;
  unitId?: string | null;
  numberOfQuestions: number;
  difficulty: Difficulty;
}

/** Response schema given to Gemini so it returns strictly structured questions. */
const quizResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short quiz title' },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['MCQ', 'TRUE_FALSE'], format: 'enum' },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: '4 options for MCQ, ["True","False"] for TRUE_FALSE' },
          correctAnswer: { type: Type.STRING, description: 'Must exactly match one of the options' },
          explanation: { type: Type.STRING },
        },
        required: ['type', 'question', 'options', 'correctAnswer', 'explanation'],
      },
    },
  },
  required: ['title', 'questions'],
};

const rawQuizSchema = z.object({
  title: z.string().optional(),
  questions: z.array(
    z.object({
      type: z.string(),
      question: z.string().min(3),
      options: z.array(z.string()).min(2),
      correctAnswer: z.string(),
      explanation: z.string().optional(),
    }),
  ),
});

interface NormalisedQuestion {
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
}

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Cleans AI output: fixes option/answer mismatches and drops broken questions. */
function normaliseQuestions(raw: unknown, wanted: number): NormalisedQuestion[] {
  const parsed = rawQuizSchema.safeParse(raw);
  if (!parsed.success) return [];
  const out: NormalisedQuestion[] = [];
  const seen = new Set<string>();

  for (const q of parsed.data.questions) {
    const isTrueFalse = q.type.toUpperCase().replace(/[^A-Z]/g, '') === 'TRUEFALSE' || q.options.length === 2;
    const options = isTrueFalse ? ['True', 'False'] : q.options.map((o) => o.trim()).filter(Boolean).slice(0, 4);
    if (!isTrueFalse && options.length !== 4) continue;

    let correct = options.find((o) => normalise(o) === normalise(q.correctAnswer));
    if (!correct) {
      // Model sometimes answers with a letter ("B") or an index ("2").
      const letter = q.correctAnswer.trim().toUpperCase();
      const index = /^[A-D]$/.test(letter) ? letter.charCodeAt(0) - 65 : /^[1-4]$/.test(letter) ? Number(letter) - 1 : -1;
      if (index >= 0 && index < options.length) correct = options[index];
      else if (isTrueFalse && /^(t|true)$/i.test(q.correctAnswer.trim())) correct = 'True';
      else if (isTrueFalse && /^(f|false)$/i.test(q.correctAnswer.trim())) correct = 'False';
    }
    if (!correct) continue;

    const key = normalise(q.question);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      type: isTrueFalse ? 'TRUE_FALSE' : 'MCQ',
      question: q.question.trim(),
      options,
      correctAnswer: correct,
      explanation: q.explanation?.trim() || null,
    });
    if (out.length >= wanted) break;
  }
  return out;
}

type QuizWithQuestions = Prisma.QuizGetPayload<{
  include: { questions: true; subject: { select: { id: true; name: true; color: true } }; unit: { select: { id: true; name: true } } };
}>;

/** Public quiz shape - never includes correct answers or explanations. */
function toQuizDTO(quiz: QuizWithQuestions, attempts = 0) {
  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    numberOfQuestions: quiz.numberOfQuestions,
    subject: quiz.subject,
    unit: quiz.unit,
    createdAt: quiz.createdAt,
    attempts,
    questions: [...quiz.questions]
      .sort((a, b) => a.order - b.order)
      .map((q) => ({ id: q.id, order: q.order, type: q.type, question: q.question, options: q.options })),
  };
}

/**
 * Quiz generation pipeline (called by the MCP generate_quiz tool):
 * subject/unit -> topics + note passages -> Gemini (JSON schema) -> validate -> save.
 */
export async function generateQuiz(userId: string, input: GenerateQuizInput) {
  assertAIConfigured();
  const subject = await assertSubjectOwner(userId, input.subjectId);
  const unit = input.unitId ? await assertUnitOwner(userId, input.unitId) : null;
  if (unit && unit.subjectId !== subject.id) throw AppError.badRequest('The unit does not belong to this subject');

  const numberOfQuestions = Math.min(Math.max(Math.round(input.numberOfQuestions), 1), 20);
  const topics = await prisma.topic.findMany({
    where: unit ? { unitId: unit.id } : { unit: { subjectId: subject.id } },
    orderBy: { order: 'asc' },
    select: { name: true },
  });
  const context = await getNoteContext(userId, { subjectId: subject.id, unitId: unit?.id, maxChars: 14_000 });

  const prompt = buildQuizPrompt({
    subject: subject.name,
    subjectCode: subject.code,
    unit: unit?.name,
    unitDescription: unit?.description,
    topics: topics.map((t) => t.name),
    notesText: context.text,
    numberOfQuestions,
    difficulty: input.difficulty,
  });

  log.info(`Generating ${numberOfQuestions} ${input.difficulty} questions for ${subject.name}${unit ? ` / ${unit.name}` : ''} (notes: ${context.totalNotes})`);
  const raw = await generateJSON<unknown>({ prompt, systemInstruction: QUIZ_SYSTEM_PROMPT, schema: quizResponseSchema, temperature: 0.7 });
  const questions = normaliseQuestions(raw, numberOfQuestions);
  if (questions.length === 0) {
    throw AppError.serviceUnavailable('The AI could not generate valid questions. Please try again.');
  }

  const title =
    (raw as { title?: string })?.title?.trim() || `${subject.name}${unit ? ` - ${unit.name}` : ''} quiz`;
  const quiz = await prisma.quiz.create({
    data: {
      userId,
      subjectId: subject.id,
      unitId: unit?.id ?? null,
      title,
      difficulty: input.difficulty,
      numberOfQuestions: questions.length,
      questions: { create: questions.map((q, i) => ({ order: i + 1, ...q })) },
    },
    include: { questions: true, subject: { select: { id: true, name: true, color: true } }, unit: { select: { id: true, name: true } } },
  });

  return { ...toQuizDTO(quiz), basedOnNotes: context.totalNotes > 0, noteTitles: context.noteTitles };
}

export async function getQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: {
      questions: true,
      subject: { select: { id: true, name: true, color: true } },
      unit: { select: { id: true, name: true } },
      _count: { select: { results: true } },
    },
  });
  if (!quiz) throw AppError.notFound('Quiz not found');
  return toQuizDTO(quiz, quiz._count.results);
}

export interface SubmitQuizInput {
  answers: { questionId: string; selected: string | null }[];
  timeTakenSec?: number | null;
}

export async function submitQuiz(userId: string, quizId: string, input: SubmitQuizInput) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      subject: { select: { id: true, name: true, color: true } },
      unit: { select: { id: true, name: true } },
    },
  });
  if (!quiz) throw AppError.notFound('Quiz not found');

  const selectedById = new Map(input.answers.map((a) => [a.questionId, a.selected]));
  const graded = quiz.questions.map((q) => {
    const selected = selectedById.get(q.id) ?? null;
    const isCorrect = selected !== null && normalise(selected) === normalise(q.correctAnswer);
    return {
      questionId: q.id,
      order: q.order,
      type: q.type,
      question: q.question,
      options: q.options,
      selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = graded.filter((g) => g.isCorrect).length;
  const total = quiz.questions.length;
  const percentage = total ? Math.round((score / total) * 1000) / 10 : 0;

  const result = await prisma.quizResult.create({
    data: {
      quizId: quiz.id,
      userId,
      score,
      total,
      percentage,
      timeTakenSec: input.timeTakenSec ?? null,
      answers: graded.map((g) => ({ questionId: g.questionId, selected: g.selected, correct: g.correctAnswer, isCorrect: g.isCorrect })),
    },
  });

  let progressUpdated: number | null = null;
  if (quiz.unitId) progressUpdated = (await bumpProgressFromQuiz(userId, quiz.unitId, percentage)).completion;

  await logActivity(userId, {
    type: 'QUIZ_COMPLETED',
    title: `Scored ${score}/${total} (${percentage}%) in "${quiz.title}"`,
    subjectId: quiz.subjectId,
    unitId: quiz.unitId,
    meta: { resultId: result.id, percentage },
  });

  return {
    resultId: result.id,
    quizId: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    subject: quiz.subject,
    unit: quiz.unit,
    score,
    total,
    percentage,
    timeTakenSec: result.timeTakenSec,
    createdAt: result.createdAt,
    unitCompletion: progressUpdated,
    questions: graded,
  };
}

export async function getQuizHistory(userId: string, limit = 50) {
  const results = await prisma.quizResult.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          numberOfQuestions: true,
          subject: { select: { id: true, name: true, color: true } },
          unit: { select: { id: true, name: true } },
        },
      },
    },
  });
  return results.map((r) => ({
    id: r.id,
    quizId: r.quizId,
    title: r.quiz.title,
    difficulty: r.quiz.difficulty,
    subject: r.quiz.subject,
    unit: r.quiz.unit,
    score: r.score,
    total: r.total,
    percentage: r.percentage,
    timeTakenSec: r.timeTakenSec,
    createdAt: r.createdAt,
  }));
}

export async function getQuizResult(userId: string, resultId: string) {
  const result = await prisma.quizResult.findFirst({
    where: { id: resultId, userId },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { order: 'asc' } },
          subject: { select: { id: true, name: true, color: true } },
          unit: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!result) throw AppError.notFound('Quiz result not found');
  const stored = (result.answers as { questionId: string; selected: string | null }[]) ?? [];
  const selectedById = new Map(stored.map((a) => [a.questionId, a.selected]));
  return {
    resultId: result.id,
    quizId: result.quizId,
    title: result.quiz.title,
    difficulty: result.quiz.difficulty,
    subject: result.quiz.subject,
    unit: result.quiz.unit,
    score: result.score,
    total: result.total,
    percentage: result.percentage,
    timeTakenSec: result.timeTakenSec,
    createdAt: result.createdAt,
    unitCompletion: null,
    questions: result.quiz.questions.map((q) => {
      const selected = selectedById.get(q.id) ?? null;
      return {
        questionId: q.id,
        order: q.order,
        type: q.type,
        question: q.question,
        options: q.options,
        selected,
        correctAnswer: q.correctAnswer,
        isCorrect: selected !== null && normalise(selected) === normalise(q.correctAnswer),
        explanation: q.explanation,
      };
    }),
  };
}

export async function listQuizzes(userId: string, limit = 30) {
  const quizzes = await prisma.quiz.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      unit: { select: { id: true, name: true } },
      _count: { select: { results: true } },
    },
  });
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    numberOfQuestions: q.numberOfQuestions,
    subject: q.subject,
    unit: q.unit,
    attempts: q._count.results,
    createdAt: q.createdAt,
  }));
}
