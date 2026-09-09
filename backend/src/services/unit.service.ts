import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { assertSubjectOwner } from './subject.service.js';

export interface UnitInput {
  name: string;
  description?: string | null;
  order?: number;
  topics?: string[];
}

/** Throws 404 unless the unit belongs to one of the user's subjects. */
export async function assertUnitOwner(userId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, subject: { userId } },
    include: { subject: { select: { id: true, name: true, code: true } } },
  });
  if (!unit) throw AppError.notFound('Unit not found');
  return unit;
}

export async function listUnits(userId: string, subjectId: string) {
  await assertSubjectOwner(userId, subjectId);
  const units = await prisma.unit.findMany({
    where: { subjectId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      topics: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      progress: { where: { userId } },
      _count: { select: { notes: true } },
    },
  });
  return units.map((u) => ({
    id: u.id,
    name: u.name,
    description: u.description,
    order: u.order,
    subjectId: u.subjectId,
    completion: u.progress[0]?.completion ?? 0,
    lastStudiedAt: u.progress[0]?.lastStudiedAt ?? null,
    noteCount: u._count.notes,
    topics: u.topics.map((t) => ({ id: t.id, name: t.name, completed: t.completed, order: t.order })),
  }));
}

export async function createUnit(userId: string, subjectId: string, input: UnitInput) {
  await assertSubjectOwner(userId, subjectId);
  const count = await prisma.unit.count({ where: { subjectId } });
  const topics = (input.topics ?? []).map((t) => t.trim()).filter(Boolean);

  const unit = await prisma.unit.create({
    data: {
      subjectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      order: input.order ?? count + 1,
      topics: { create: topics.map((name, i) => ({ name, order: i + 1 })) },
      progress: { create: { userId, completion: 0 } },
    },
    include: { topics: { orderBy: { order: 'asc' } } },
  });
  return { ...unit, completion: 0 };
}

export async function updateUnit(userId: string, unitId: string, input: Partial<UnitInput>) {
  await assertUnitOwner(userId, unitId);
  return prisma.unit.update({
    where: { id: unitId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
    include: { topics: { orderBy: { order: 'asc' } } },
  });
}

export async function deleteUnit(userId: string, unitId: string) {
  await assertUnitOwner(userId, unitId);
  await prisma.unit.delete({ where: { id: unitId } });
  return { deleted: true };
}
