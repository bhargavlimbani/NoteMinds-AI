import { get, post } from './api';
import type { Difficulty, Quiz, QuizHistoryItem, QuizListItem, QuizResult } from '../types';

export const quizApi = {
  generate: (data: { subjectId: string; unitId?: string | null; numberOfQuestions: number; difficulty: Difficulty }) =>
    post<Quiz>('/quizzes/generate', data),
  list: () => get<QuizListItem[]>('/quizzes'),
  get: (id: string) => get<Quiz>(`/quizzes/${id}`),
  submit: (id: string, data: { answers: { questionId: string; selected: string | null }[]; timeTakenSec?: number }) =>
    post<QuizResult>(`/quizzes/${id}/submit`, data),
  history: () => get<QuizHistoryItem[]>('/quizzes/history'),
  result: (id: string) => get<QuizResult>(`/quizzes/results/${id}`),
};
