import type { Request, Response } from 'express';
import * as progressService from '../services/progress.service.js';
import { sendSuccess } from '../utils/response.js';
import { getQuery } from '../middleware/validate.middleware.js';

export async function get(req: Request, res: Response) {
  const { subjectId } = getQuery<{ subjectId?: string }>(req);
  sendSuccess(res, await progressService.getProgressOverview(req.user!.id, subjectId));
}

export async function update(req: Request, res: Response) {
  sendSuccess(res, await progressService.saveProgress(req.user!.id, req.body), 200, 'Progress updated');
}
