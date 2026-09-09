import { del, get, post } from './api';
import type { ChatResponse, ConversationDetail, ConversationSummary } from '../types';

export const chatApi = {
  send: (message: string, conversationId?: string | null) => post<ChatResponse>('/chat', { message, conversationId: conversationId ?? undefined }),
  conversations: () => get<ConversationSummary[]>('/conversations'),
  conversation: (id: string) => get<ConversationDetail>(`/conversations/${id}`),
  remove: (id: string) => del<{ deleted: boolean }>(`/conversations/${id}`),
};
