import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { truncate } from '../utils/text.js';

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { role: true, content: true, createdAt: true } },
      _count: { select: { messages: true } },
    },
  });
  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c._count.messages,
    lastMessage: c.messages[0]
      ? { role: c.messages[0].role, preview: truncate(c.messages[0].content, 120), createdAt: c.messages[0].createdAt }
      : null,
  }));
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) throw AppError.notFound('Conversation not found');
  return conversation;
}

export async function deleteConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw AppError.notFound('Conversation not found');
  await prisma.conversation.delete({ where: { id: conversationId } });
  return { deleted: true };
}
