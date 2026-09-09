import { del, get, patch, post, put } from './api';
import type { SubjectDetail, SubjectInput, SubjectSummary, Topic, Unit, UnitInput } from '../types';

export const subjectApi = {
  list: () => get<SubjectSummary[]>('/subjects'),
  create: (data: SubjectInput) => post<SubjectSummary>('/subjects', data),
  get: (id: string) => get<SubjectDetail>(`/subjects/${id}`),
  update: (id: string, data: Partial<SubjectInput>) => put<SubjectSummary>(`/subjects/${id}`, data),
  remove: (id: string) => del<{ deleted: boolean }>(`/subjects/${id}`),
  listUnits: (id: string) => get<Unit[]>(`/subjects/${id}/units`),
  createUnit: (id: string, data: UnitInput) => post<Unit>(`/subjects/${id}/units`, data),
};

export const unitApi = {
  update: (id: string, data: Partial<UnitInput>) => put<Unit>(`/units/${id}`, data),
  remove: (id: string) => del<{ deleted: boolean }>(`/units/${id}`),
  addTopic: (id: string, name: string) => post<{ topic: Topic; unitCompletion: number }>(`/units/${id}/topics`, { name }),
};

export const topicApi = {
  setCompleted: (id: string, completed: boolean) =>
    patch<{ topic: Topic; unitId: string; unitCompletion: number }>(`/topics/${id}`, { completed }),
  remove: (id: string) => del<{ deleted: boolean; unitId: string; unitCompletion: number }>(`/topics/${id}`),
};
