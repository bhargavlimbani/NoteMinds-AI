import type { Request, Response } from 'express';
import * as chatService from '../services/chat.service.js';
import { sendSuccess } from '../utils/response.js';

export async function send(req: Request, res: Response) {
  const result = await chatService.sendChatMessage(req.user!.id, req.body);
  sendSuccess(res, result);
}
