import type { Request, Response } from 'express';
import * as subjectService from '../services/subject.service.js';
import * as unitService from '../services/unit.service.js';
import { sendSuccess } from '../utils/response.js';

export async function list(req: Request, res: Response) {
  sendSuccess(res, await subjectService.listSubjects(req.user!.id));
}

export async function create(req: Request, res: Response) {
  sendSuccess(res, await subjectService.createSubject(req.user!.id, req.body), 201, 'Subject created');
}

export async function get(req: Request, res: Response) {
  sendSuccess(res, await subjectService.getSubject(req.user!.id, req.params.id as string));
}

export async function update(req: Request, res: Response) {
  sendSuccess(res, await subjectService.updateSubject(req.user!.id, req.params.id as string, req.body), 200, 'Subject updated');
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await subjectService.deleteSubject(req.user!.id, req.params.id as string), 200, 'Subject deleted');
}

export async function listUnits(req: Request, res: Response) {
  sendSuccess(res, await unitService.listUnits(req.user!.id, req.params.id as string));
}

export async function createUnit(req: Request, res: Response) {
  sendSuccess(res, await unitService.createUnit(req.user!.id, req.params.id as string, req.body), 201, 'Unit created');
}
