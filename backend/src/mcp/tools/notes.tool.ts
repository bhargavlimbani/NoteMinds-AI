import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runTool } from './helpers.js';
import { resolveSubject, resolveUnit } from './resolve.js';
import { searchNotes } from '../../services/note.service.js';

/** Tool 1 - search_notes: find relevant passages in the student's uploaded notes. */
export function registerNotesTools(server: McpServer) {
  server.registerTool(
    'search_notes',
    {
      title: 'Search student notes',
      description:
        "Search the student's own uploaded study notes (PDF/TXT) for a topic or keywords. Returns the most relevant passages with the note title, subject and unit. Use it whenever the student asks about something 'from my notes' or asks to explain a topic they may have notes on.",
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
        query: z.string().min(1).describe('Topic or keywords to search, e.g. "third normal form 3NF"'),
        subjectId: z.string().optional().describe('Restrict the search to this subject id'),
        subjectName: z.string().optional().describe('Restrict the search to a subject by name, e.g. "DBMS"'),
        unitId: z.string().optional().describe('Restrict the search to this unit id'),
        unitName: z.string().optional().describe('Restrict the search to a unit by name, e.g. "Unit 3" or "Normalization"'),
        limit: z.number().int().min(1).max(10).optional().describe('Maximum passages to return (default 6)'),
      },
    },
    async (args) =>
      runTool('search_notes', args, async () => {
        let subjectId = args.subjectId ?? null;
        let unitId = args.unitId ?? null;
        if (args.subjectName || subjectId) {
          const subject = await resolveSubject(args.userId, { subjectId, subjectName: args.subjectName });
          subjectId = subject.id;
          if (args.unitName || unitId) {
            const unit = await resolveUnit(args.userId, subject.id, { unitId, unitName: args.unitName });
            unitId = unit?.id ?? null;
          }
        }
        return searchNotes(args.userId, { query: args.query, subjectId, unitId, limit: args.limit });
      }),
  );
}
