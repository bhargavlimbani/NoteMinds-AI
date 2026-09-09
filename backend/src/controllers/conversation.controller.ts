import type { Request, Response } from 'express';
import * as conversationService from '../services/conversation.service.js';
import { sendSuccess } from '../utils/response.js';

export async function list(req: Request, res: Response) {
  sendSuccess(res, await conversationService.listConversations(req.user!.id));
}

export async function get(req: Request, res: Response) {
  sendSuccess(res, await conversationService.getConversation(req.user!.id, req.params.id as string));
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await conversationService.deleteConversation(req.user!.id, req.params.id as string), 200, 'Conversation deleted');
}
