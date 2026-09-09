import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runTool } from './helpers.js';
import { listSubjects } from '../../services/subject.service.js';

/** Tool 2 - get_subjects: list the student's subjects with progress summary. */
export function registerSubjectsTools(server: McpServer) {
  server.registerTool(
    'get_subjects',
    {
      title: 'Get student subjects',
      description:
        "Return the student's subjects (id, name, code, description, number of units/notes and overall progress %). Call this to discover subject ids/names before other tools.",
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
      },
    },
    async (args) =>
      runTool('get_subjects', args, async () => {
        const subjects = await listSubjects(args.userId);
        return { total: subjects.length, subjects };
      }),
  );
}
