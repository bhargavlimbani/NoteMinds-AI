import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { assertUnitOwner } from './unit.service.js';
import { logActivity } from './activity.service.js';

export interface UnitProgress {
  unitId: string;
  unitName: string;
  order: number;
  completion: number;
  lastStudiedAt: string | null;
  topics: { total: number; completed: number; completedTopics: string[]; incompleteTopics: string[] };
  quiz: { attempts: number; averagePercentage: number | null; lastPercentage: number | null };
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  code: string | null;
  color: string;
  progress: number;
  quizAverage: number | null;
  units: UnitProgress[];
}

export interface ProgressOverview {
  overall: number;
  totals: {
    subjects: number;
    units: number;
    completedUnits: number;
    topics: number;
    completedTopics: number;
    quizAttempts: number;
    averageQuizScore: number | null;
  };
  subjects: SubjectProgress[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Full progress picture for a student (optionally one subject). Used by the REST API and the MCP get_progress tool. */
export async function getProgressOverview(userId: string, subjectId?: string): Promise<ProgressOverview> {
  const subjects = await prisma.subject.findMany({
    where: { userId, ...(subjectId ? { id: subjectId } : {}) },
    orderBy: { createdAt: 'asc' },
    include: {
      units: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: { topics: { orderBy: { order: 'asc' } }, progress: { where: { userId } } },
      },
    },
  });
  if (subjectId && subjects.length === 0) throw AppError.notFound('Subject not found');

  const results = await prisma.quizResult.findMany({
    where: { userId, ...(subjectId ? { quiz: { subjectId } } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { percentage: true, quiz: { select: { unitId: true, subjectId: true } } },
  });

  const byUnit = new Map<string, number[]>();
  const bySubject = new Map<string, number[]>();
  for (const r of results) {
    if (r.quiz.unitId) byUnit.set(r.quiz.unitId, [...(byUnit.get(r.quiz.unitId) ?? []), r.percentage]);
    bySubject.set(r.quiz.subjectId, [...(bySubject.get(r.quiz.subjectId) ?? []), r.percentage]);
  }

  let totalUnits = 0;
  let completedUnits = 0;
  let totalTopics = 0;
  let completedTopics = 0;

  const subjectProgress: SubjectProgress[] = subjects.map((s) => {
    const units: UnitProgress[] = s.units.map((u) => {
      const scores = byUnit.get(u.id) ?? [];
      const completion = u.progress[0]?.completion ?? 0;
      totalUnits += 1;
      if (completion >= 100) completedUnits += 1;
      totalTopics += u.topics.length;
      completedTopics += u.topics.filter((t) => t.completed).length;
      return {
        unitId: u.id,
        unitName: u.name,
        order: u.order,
        completion,
        lastStudiedAt: u.progress[0]?.lastStudiedAt?.toISOString() ?? null,
        topics: {
          total: u.topics.length,
          completed: u.topics.filter((t) => t.completed).length,
          completedTopics: u.topics.filter((t) => t.completed).map((t) => t.name),
          incompleteTopics: u.topics.filter((t) => !t.completed).map((t) => t.name),
        },
        quiz: {
          attempts: scores.length,
          averagePercentage: scores.length ? Math.round(avg(scores)!) : null,
          lastPercentage: scores.length ? Math.round(scores[scores.length - 1]) : null,
        },
      };
    });
    const subjectScores = bySubject.get(s.id) ?? [];
    return {
      subjectId: s.id,
      subjectName: s.name,
      code: s.code,
      color: s.color,
      progress: clamp(avg(units.map((u) => u.completion)) ?? 0),
      quizAverage: subjectScores.length ? Math.round(avg(subjectScores)!) : null,
      units,
    };
  });

  const allScores = results.map((r) => r.percentage);
  return {
    overall: clamp(avg(subjectProgress.map((s) => s.progress)) ?? 0),
    totals: {
      subjects: subjects.length,
      units: totalUnits,
      completedUnits,
      topics: totalTopics,
      completedTopics,
      quizAttempts: results.length,
      averageQuizScore: allScores.length ? Math.round(avg(allScores)!) : null,
    },
    subjects: subjectProgress,
  };
}

/** Unit progress = percentage of completed topics (when the unit has topics). */
export async function recomputeUnitProgressFromTopics(userId: string, unitId: string): Promise<number> {
  const topics = await prisma.topic.findMany({ where: { unitId }, select: { completed: true } });
  if (topics.length === 0) {
    const existing = await prisma.progress.findUnique({ where: { userId_unitId: { userId, unitId } } });
    return existing?.completion ?? 0;
  }
  const completion = clamp((topics.filter((t) => t.completed).length / topics.length) * 100);
  await prisma.progress.upsert({
    where: { userId_unitId: { userId, unitId } },
    create: { userId, unitId, completion },
    update: { completion, lastStudiedAt: new Date() },
  });
  return completion;
}

/** Sets progress for a unit (directly) or a topic (completed / not completed). */
export async function saveProgress(
  userId: string,
  input: { unitId?: string; topicId?: string; completion?: number },
) {
  if (!input.unitId && !input.topicId) throw AppError.badRequest('unitId or topicId is required');

  if (input.topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: input.topicId, unit: { subject: { userId } } },
      include: { unit: { select: { id: true, name: true, subjectId: true } } },
    });
    if (!topic) throw AppError.notFound('Topic not found');
    const completed = input.completion === undefined ? true : input.completion >= 50;
    await prisma.topic.update({ where: { id: topic.id }, data: { completed } });
    const completion = await recomputeUnitProgressFromTopics(userId, topic.unit.id);
    await logActivity(userId, {
      type: completed ? 'TOPIC_COMPLETED' : 'PROGRESS_UPDATED',
      title: completed ? `Completed topic "${topic.name}"` : `Reopened topic "${topic.name}"`,
      subjectId: topic.unit.subjectId,
      unitId: topic.unit.id,
    });
    return {
      unitId: topic.unit.id,
      unitName: topic.unit.name,
      subjectId: topic.unit.subjectId,
      completion,
      topic: { id: topic.id, name: topic.name, completed },
    };
  }

  const unit = await assertUnitOwner(userId, input.unitId as string);
  const completion = clamp(input.completion ?? 0);
  const progress = await prisma.progress.upsert({
    where: { userId_unitId: { userId, unitId: unit.id } },
    create: { userId, unitId: unit.id, completion },
    update: { completion, lastStudiedAt: new Date() },
  });
  await logActivity(userId, {
    type: 'PROGRESS_UPDATED',
    title: `Updated ${unit.name} progress to ${completion}%`,
    subjectId: unit.subjectId,
    unitId: unit.id,
    meta: { completion },
  });
  return {
    unitId: unit.id,
    unitName: unit.name,
    subjectId: unit.subjectId,
    completion: progress.completion,
    lastStudiedAt: progress.lastStudiedAt,
  };
}

/** After a quiz, raise the unit progress to at least the score (never lower it). */
export async function bumpProgressFromQuiz(userId: string, unitId: string, percentage: number) {
  const existing = await prisma.progress.findUnique({ where: { userId_unitId: { userId, unitId } } });
  const completion = Math.max(existing?.completion ?? 0, clamp(percentage));
  return prisma.progress.upsert({
    where: { userId_unitId: { userId, unitId } },
    create: { userId, unitId, completion },
    update: { completion, lastStudiedAt: new Date() },
  });
}

/** Marks a unit as recently studied (e.g. after uploading notes for it). */
export async function touchUnitStudied(userId: string, unitId: string) {
  await prisma.progress.upsert({
    where: { userId_unitId: { userId, unitId } },
    create: { userId, unitId, completion: 0 },
    update: { lastStudiedAt: new Date() },
  });
}
