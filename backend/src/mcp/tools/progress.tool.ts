import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runTool } from './helpers.js';
import { resolveSubject, resolveUnit } from './resolve.js';
import { getProgressOverview, saveProgress } from '../../services/progress.service.js';
import { prisma } from '../../config/prisma.js';

/** Tool 4 - get_progress and Tool 5 - save_progress. */
export function registerProgressTools(server: McpServer) {
  server.registerTool(
    'get_progress',
    {
      title: 'Get study progress',
      description:
        "Return the student's academic progress: overall %, per-subject and per-unit completion, completed and pending topics, quiz attempts and average quiz scores, and when each unit was last studied. Use it for 'what should I study next', weak areas and progress questions.",
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
        subjectId: z.string().optional().describe('Limit to one subject id'),
        subjectName: z.string().optional().describe('Limit to one subject by name'),
      },
    },
    async (args) =>
      runTool('get_progress', args, async () => {
        let subjectId: string | undefined;
        if (args.subjectId || args.subjectName) subjectId = (await resolveSubject(args.userId, args)).id;
        return getProgressOverview(args.userId, subjectId);
      }),
  );

  server.registerTool(
    'save_progress',
    {
      title: 'Save study progress',
      description:
        'Update progress: mark a topic as completed/not completed (topicId or topicName + unit), or set the completion percentage (0-100) of a unit. Returns the updated unit progress.',
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
        topicId: z.string().optional().describe('Topic id to update'),
        topicName: z.string().optional().describe('Topic name (requires subjectName/unitName or unitId to locate it)'),
        unitId: z.string().optional().describe('Unit id to update'),
        unitName: z.string().optional().describe('Unit name, e.g. "Unit 3"'),
        subjectName: z.string().optional().describe('Subject name, used together with unitName'),
        completion: z.number().min(0).max(100).optional().describe('Completion percentage. For topics: >= 50 marks completed, < 50 marks not completed (default 100)'),
      },
    },
    async (args) =>
      runTool('save_progress', args, async () => {
        let unitId = args.unitId ?? undefined;
        if (!unitId && args.unitName) {
          const subject = await resolveSubject(args.userId, { subjectName: args.subjectName });
          unitId = (await resolveUnit(args.userId, subject.id, { unitName: args.unitName }))?.id;
        }
        let topicId = args.topicId ?? undefined;
        if (!topicId && args.topicName) {
          const topic = await prisma.topic.findFirst({
            where: {
              name: { contains: args.topicName, mode: 'insensitive' },
              unit: { subject: { userId: args.userId }, ...(unitId ? { id: unitId } : {}) },
            },
          });
          if (!topic) throw new Error(`Topic "${args.topicName}" was not found`);
          topicId = topic.id;
        }
        return saveProgress(args.userId, { unitId: topicId ? undefined : unitId, topicId, completion: args.completion });
      }),
  );
}
