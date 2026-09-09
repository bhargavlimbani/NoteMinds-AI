import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runTool } from './helpers.js';
import { resolveSubject } from './resolve.js';
import { listUnits } from '../../services/unit.service.js';

/** Tool 3 - get_topics: units and topics of a subject with completion status. */
export function registerTopicsTools(server: McpServer) {
  server.registerTool(
    'get_topics',
    {
      title: 'Get units and topics of a subject',
      description:
        'Return the units of a subject, each with its topics, completion status and completion percentage. Provide subjectId or subjectName.',
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
        subjectId: z.string().optional().describe('Subject id (from get_subjects)'),
        subjectName: z.string().optional().describe('Subject name or code, e.g. "DBMS"'),
      },
    },
    async (args) =>
      runTool('get_topics', args, async () => {
        const subject = await resolveSubject(args.userId, args);
        const units = await listUnits(args.userId, subject.id);
        return {
          subject: { id: subject.id, name: subject.name, code: subject.code },
          totalUnits: units.length,
          units: units.map((u) => ({
            id: u.id,
            name: u.name,
            description: u.description,
            completion: u.completion,
            noteCount: u.noteCount,
            topics: u.topics.map((t) => ({ id: t.id, name: t.name, completed: t.completed })),
          })),
        };
      }),
  );
}
