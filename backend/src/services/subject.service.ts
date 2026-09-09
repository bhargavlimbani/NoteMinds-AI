import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export interface SubjectInput {
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string;
}

/** Throws 404 unless the subject belongs to the user. */
export async function assertSubjectOwner(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) throw AppError.notFound('Subject not found');
  return subject;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function listSubjects(userId: string) {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      units: { select: { id: true, progress: { where: { userId }, select: { completion: true } } } },
      _count: { select: { notes: true, quizzes: true } },
    },
  });

  return subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    description: s.description,
    color: s.color,
    createdAt: s.createdAt,
    unitCount: s.units.length,
    noteCount: s._count.notes,
    quizCount: s._count.quizzes,
    progress: average(s.units.map((u) => u.progress[0]?.completion ?? 0)),
  }));
}

export async function createSubject(userId: string, input: SubjectInput) {
  return prisma.subject.create({
    data: {
      userId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      description: input.description?.trim() || null,
      color: input.color ?? 'violet',
    },
  });
}

export async function getSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    include: {
      units: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          topics: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          progress: { where: { userId } },
          _count: { select: { notes: true } },
        },
      },
      _count: { select: { notes: true, quizzes: true } },
    },
  });
  if (!subject) throw AppError.notFound('Subject not found');

  const units = subject.units.map((u) => ({
    id: u.id,
    name: u.name,
    description: u.description,
    order: u.order,
    completion: u.progress[0]?.completion ?? 0,
    lastStudiedAt: u.progress[0]?.lastStudiedAt ?? null,
    noteCount: u._count.notes,
    topics: u.topics.map((t) => ({ id: t.id, name: t.name, completed: t.completed, order: t.order })),
  }));

  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    description: subject.description,
    color: subject.color,
    createdAt: subject.createdAt,
    noteCount: subject._count.notes,
    quizCount: subject._count.quizzes,
    progress: average(units.map((u) => u.completion)),
    units,
  };
}

export async function updateSubject(userId: string, subjectId: string, input: Partial<SubjectInput>) {
  await assertSubjectOwner(userId, subjectId);
  return prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

export async function deleteSubject(userId: string, subjectId: string) {
  await assertSubjectOwner(userId, subjectId);
  await prisma.subject.delete({ where: { id: subjectId } });
  return { deleted: true };
}
