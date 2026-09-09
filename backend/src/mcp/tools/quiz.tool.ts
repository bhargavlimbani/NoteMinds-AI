import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runTool } from './helpers.js';
import { resolveSubject, resolveUnit } from './resolve.js';
import { generateQuiz } from '../../services/quiz.service.js';

/** Tool 6 - generate_quiz: build a quiz from the student's notes/topics and save it. */
export function registerQuizTools(server: McpServer) {
  server.registerTool(
    'generate_quiz',
    {
      title: 'Generate a quiz',
      description:
        "Generate and save a quiz (MCQ and true/false questions) for a subject or a unit using the student's notes and topics. Returns the quiz id and questions (without answers). The student can attempt it on the Quiz page.",
      inputSchema: {
        userId: z.string().describe('Authenticated student id (injected by the backend)'),
        subjectId: z.string().optional().describe('Subject id'),
        subjectName: z.string().optional().describe('Subject name or code, e.g. "DBMS"'),
        unitId: z.string().optional().describe('Unit id (optional - whole subject when omitted)'),
        unitName: z.string().optional().describe('Unit name, e.g. "Unit 3" or "Normalization"'),
        numberOfQuestions: z.number().int().min(1).max(20).optional().describe('Number of questions (default 5, max 20)'),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty (default medium)'),
      },
    },
    async (args) =>
      runTool('generate_quiz', args, async () => {
        const subject = await resolveSubject(args.userId, args);
        const unit = await resolveUnit(args.userId, subject.id, args);
        return generateQuiz(args.userId, {
          subjectId: subject.id,
          unitId: unit?.id ?? null,
          numberOfQuestions: args.numberOfQuestions ?? 5,
          difficulty: (args.difficulty ?? 'medium').toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
        });
      }),
  );
}
