import type { Request, Response } from 'express';
import * as topicService from '../services/topic.service.js';
import { sendSuccess } from '../utils/response.js';

export async function update(req: Request, res: Response) {
  const result = await topicService.setTopicCompleted(req.user!.id, req.params.id as string, req.body.completed);
  sendSuccess(res, result, 200, req.body.completed ? 'Topic completed' : 'Topic reopened');
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await topicService.deleteTopic(req.user!.id, req.params.id as string), 200, 'Topic deleted');
}
