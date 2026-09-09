import type { Request, Response } from 'express';
import * as unitService from '../services/unit.service.js';
import * as topicService from '../services/topic.service.js';
import { sendSuccess } from '../utils/response.js';

export async function update(req: Request, res: Response) {
  sendSuccess(res, await unitService.updateUnit(req.user!.id, req.params.id as string, req.body), 200, 'Unit updated');
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await unitService.deleteUnit(req.user!.id, req.params.id as string), 200, 'Unit deleted');
}

export async function addTopic(req: Request, res: Response) {
  sendSuccess(res, await topicService.addTopic(req.user!.id, req.params.id as string, req.body), 201, 'Topic added');
}
