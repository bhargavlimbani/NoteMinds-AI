import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { assertUnitOwner } from './unit.service.js';
import { recomputeUnitProgressFromTopics } from './progress.service.js';
import { logActivity } from './activity.service.js';

export async function addTopic(userId: string, unitId: string, input: { name: string }) {
  await assertUnitOwner(userId, unitId);
  const count = await prisma.topic.count({ where: { unitId } });
  const topic = await prisma.topic.create({
    data: { unitId, name: input.name.trim(), order: count + 1 },
  });
  const completion = await recomputeUnitProgressFromTopics(userId, unitId);
  return { topic, unitCompletion: completion };
}

export async function setTopicCompleted(userId: string, topicId: string, completed: boolean) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, unit: { subject: { userId } } },
    include: { unit: { select: { id: true, name: true, subjectId: true } } },
  });
  if (!topic) throw AppError.notFound('Topic not found');

  const updated = await prisma.topic.update({ where: { id: topicId }, data: { completed } });
  const completion = await recomputeUnitProgressFromTopics(userId, topic.unit.id);

  if (completed) {
    await logActivity(userId, {
      type: 'TOPIC_COMPLETED',
      title: `Completed topic "${topic.name}" in ${topic.unit.name}`,
      subjectId: topic.unit.subjectId,
      unitId: topic.unit.id,
    });
  }
  return { topic: updated, unitId: topic.unit.id, unitCompletion: completion };
}

export async function deleteTopic(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, unit: { subject: { userId } } } });
  if (!topic) throw AppError.notFound('Topic not found');
  await prisma.topic.delete({ where: { id: topicId } });
  const completion = await recomputeUnitProgressFromTopics(userId, topic.unitId);
  return { deleted: true, unitId: topic.unitId, unitCompletion: completion };
}
