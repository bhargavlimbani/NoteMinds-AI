import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Lets the AI refer to subjects/units by id OR by (partial) name, which makes
 * tool calls robust: "generate a quiz on DBMS unit 3" works without extra lookups.
 * Every lookup is scoped to the authenticated user.
 */
export async function resolveSubject(userId: string, input: { subjectId?: string | null; subjectName?: string | null }) {
  if (input.subjectId) {
    const byId = await prisma.subject.findFirst({ where: { id: input.subjectId, userId } });
    if (byId) return byId;
  }
  const name = input.subjectName?.trim();
  if (name) {
    const byName = await prisma.subject.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: name, mode: 'insensitive' } },
          { name: { contains: name, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (byName) return byName;
  }
  if (!input.subjectId && !name) throw AppError.badRequest('Provide subjectId or subjectName');
  const available = await prisma.subject.findMany({ where: { userId }, select: { name: true } });
  throw AppError.notFound(
    `Subject "${input.subjectName ?? input.subjectId}" was not found. Available subjects: ${available.map((s) => s.name).join(', ') || 'none'}`,
  );
}

export async function resolveUnit(
  userId: string,
  subjectId: string,
  input: { unitId?: string | null; unitName?: string | null },
) {
  if (input.unitId) {
    const byId = await prisma.unit.findFirst({ where: { id: input.unitId, subjectId, subject: { userId } } });
    if (byId) return byId;
  }
  const name = input.unitName?.trim();
  if (name) {
    const units = await prisma.unit.findMany({ where: { subjectId, subject: { userId } }, orderBy: { order: 'asc' } });
    const lower = name.toLowerCase();
    const numberMatch = lower.match(/(\d+)/);
    const found =
      units.find((u) => u.name.toLowerCase() === lower) ??
      units.find((u) => u.name.toLowerCase().includes(lower)) ??
      units.find((u) => lower.includes(u.name.toLowerCase())) ??
      (numberMatch ? units.find((u) => u.order === Number(numberMatch[1]) || u.name.match(/\d+/)?.[0] === numberMatch[1]) : undefined);
    if (found) return found;
    throw AppError.notFound(`Unit "${name}" was not found. Available units: ${units.map((u) => u.name).join(', ') || 'none'}`);
  }
  if (input.unitId) throw AppError.notFound('Unit not found in this subject');
  return null;
}
