import type { Request, Response } from 'express';
import * as recommendationService from '../services/recommendation.service.js';
import { sendSuccess } from '../utils/response.js';
import { getQuery } from '../middleware/validate.middleware.js';

export async function get(req: Request, res: Response) {
  const { ai } = getQuery<{ ai?: boolean }>(req);
  sendSuccess(res, await recommendationService.getRecommendations(req.user!.id, { useAI: ai !== false }));
}
