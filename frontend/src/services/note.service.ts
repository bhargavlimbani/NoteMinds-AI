import { del, get, post } from './api';
import type { NoteDetail, NoteSearchResponse, NoteSummary } from '../types';

export const noteApi = {
  list: (params?: { subjectId?: string; unitId?: string }) => get<NoteSummary[]>('/notes', params),
  get: (id: string) => get<NoteDetail>(`/notes/${id}`),
  remove: (id: string) => del<{ deleted: boolean }>(`/notes/${id}`),
  search: (q: string, params?: { subjectId?: string; unitId?: string }) => get<NoteSearchResponse>('/notes/search', { q, ...params }),
  upload: (data: { file: File; subjectId: string; unitId?: string | null; title?: string }, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', data.file);
    form.append('subjectId', data.subjectId);
    if (data.unitId) form.append('unitId', data.unitId);
    if (data.title) form.append('title', data.title);
    return post<NoteSummary>('/notes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: { loaded: number; total?: number }) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
};
