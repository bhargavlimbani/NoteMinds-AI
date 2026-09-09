import { get, put } from './api';
import type { Dashboard, ProgressOverview, Recommendation, SystemStatus } from '../types';

export const progressApi = {
  overview: (subjectId?: string) => get<ProgressOverview>('/progress', subjectId ? { subjectId } : undefined),
  update: (data: { unitId?: string; topicId?: string; completion?: number }) => put<{ unitId: string; completion: number }>('/progress', data),
};

export const recommendationApi = {
  get: (useAI = true) => get<Recommendation>('/recommendations', { ai: useAI ? '1' : '0' }),
};

export const dashboardApi = {
  get: () => get<Dashboard>('/dashboard'),
};

export const systemApi = {
  status: () => get<SystemStatus>('/mcp/status'),
};
