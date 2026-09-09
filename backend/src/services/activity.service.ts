import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export type ActivityType = 'NOTE_UPLOAD' | 'QUIZ_COMPLETED' | 'PROGRESS_UPDATED' | 'TOPIC_COMPLETED' | 'CHAT';

interface ActivityInput {
  type: ActivityType;
  title: string;
  subjectId?: string | null;
  unitId?: string | null;
  meta?: Record<string, unknown>;
}

/** Records a study activity. Failures are logged and never break the main flow. */
export async function logActivity(userId: string, input: ActivityInput) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        subjectId: input.subjectId ?? null,
        unitId: input.unitId ?? null,
        meta: (input.meta as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (error) {
    logger.warn('Could not record activity', error instanceof Error ? error.message : error);
  }
}

export async function getRecentActivities(userId: string, limit = 8) {
  return prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
