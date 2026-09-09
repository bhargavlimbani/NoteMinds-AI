import type { Request, Response } from 'express';
import * as quizService from '../services/quiz.service.js';
import { mcpClient, toolDataOrThrow } from '../mcp/client/client.js';
import { createLogger } from '../config/logger.js';
import { sendSuccess } from '../utils/response.js';

const log = createLogger('quiz-api');

/** Quiz generation goes through the MCP client -> MCP server -> generate_quiz tool. */
export async function generate(req: Request, res: Response) {
  const { subjectId, unitId, numberOfQuestions, difficulty } = req.body;
  log.info('generate_quiz via MCP', { subjectId, unitId, numberOfQuestions, difficulty });
  const outcome = await mcpClient.callTool('generate_quiz', {
    userId: req.user!.id,
    subjectId,
    unitId: unitId ?? undefined,
    numberOfQuestions,
    difficulty: String(difficulty).toLowerCase(),
  });
  const quiz = toolDataOrThrow<Record<string, unknown>>(outcome);
  sendSuccess(res, { ...quiz, mcp: { tool: 'generate_quiz', transport: mcpClient.transport, durationMs: outcome.durationMs } }, 201, 'Quiz generated');
}

export async function list(req: Request, res: Response) {
  sendSuccess(res, await quizService.listQuizzes(req.user!.id));
}

export async function get(req: Request, res: Response) {
  sendSuccess(res, await quizService.getQuiz(req.user!.id, req.params.id as string));
}

export async function submit(req: Request, res: Response) {
  sendSuccess(res, await quizService.submitQuiz(req.user!.id, req.params.id as string, req.body), 200, 'Quiz submitted');
}

export async function history(req: Request, res: Response) {
  sendSuccess(res, await quizService.getQuizHistory(req.user!.id));
}

export async function result(req: Request, res: Response) {
  sendSuccess(res, await quizService.getQuizResult(req.user!.id, req.params.id as string));
}
