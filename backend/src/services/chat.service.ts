import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { truncate } from '../utils/text.js';
import { assertAIConfigured } from '../ai/gemini.js';
import { runStudyAgent, type AgentMessage } from '../ai/agent.js';
import { logActivity } from './activity.service.js';

const HISTORY_LIMIT = 20;

function makeTitle(message: string): string {
  const clean = message.replace(/\s+/g, ' ').trim();
  return truncate(clean.charAt(0).toUpperCase() + clean.slice(1), 60);
}

/**
 * Chat entry point: loads history -> runs the Gemini + MCP agent -> stores
 * both messages (with the MCP tools that were used) in the conversation.
 */
export async function sendChatMessage(userId: string, input: { message: string; conversationId?: string | null }) {
  assertAIConfigured();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) throw AppError.unauthorized();

  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({ where: { id: input.conversationId, userId } })
    : null;
  if (input.conversationId && !conversation) throw AppError.notFound('Conversation not found');

  let history: AgentMessage[] = [];
  if (conversation) {
    const recent = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    history = recent.reverse().map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));
  }

  const result = await runStudyAgent({ userId, userName: user.name, message: input.message, history });

  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { userId, title: makeTitle(input.message) } });
  }

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, role: 'USER', content: input.message } }),
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: result.text,
        toolCalls: result.toolCalls.length ? (result.toolCalls as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    }),
    prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
  ]);

  await logActivity(userId, {
    type: 'CHAT',
    title: `Asked AI: ${truncate(input.message, 70)}`,
    meta: { conversationId: conversation.id, tools: result.toolCalls.map((t) => t.tool) },
  });

  return {
    conversation: { id: conversation.id, title: conversation.title },
    userMessage,
    assistantMessage,
    toolCalls: result.toolCalls,
  };
}
