import type { Request, Response } from 'express';
import * as noteService from '../services/note.service.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { getQuery } from '../middleware/validate.middleware.js';

export async function upload(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('Please attach a PDF or TXT file in the "file" field');
  const note = await noteService.createNoteFromUpload(req.user!.id, {
    file: req.file,
    subjectId: req.body.subjectId,
    unitId: req.body.unitId || null,
    title: req.body.title || null,
  });
  sendSuccess(res, note, 201, 'Notes uploaded and processed');
}

export async function list(req: Request, res: Response) {
  const query = getQuery<{ subjectId?: string; unitId?: string }>(req);
  sendSuccess(res, await noteService.listNotes(req.user!.id, query));
}

export async function get(req: Request, res: Response) {
  sendSuccess(res, await noteService.getNote(req.user!.id, req.params.id as string));
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await noteService.deleteNote(req.user!.id, req.params.id as string), 200, 'Note deleted');
}

export async function search(req: Request, res: Response) {
  const query = getQuery<{ q: string; subjectId?: string; unitId?: string; limit?: number }>(req);
  sendSuccess(res, await noteService.searchNotes(req.user!.id, { query: query.q, subjectId: query.subjectId, unitId: query.unitId, limit: query.limit }));
}
