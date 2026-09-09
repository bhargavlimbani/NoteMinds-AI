import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export async function get(req: Request, res: Response) {
  sendSuccess(res, await dashboardService.getDashboard(req.user!.id));
}
