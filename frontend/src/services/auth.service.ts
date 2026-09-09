import { get, post, put } from './api';
import type { AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) => post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) => post<AuthResponse>('/auth/login', data),
  logout: () => post<{ loggedOut: boolean }>('/auth/logout'),
  me: () => get<User>('/auth/me'),
  updateProfile: (data: { name: string }) => put<User>('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => put<{ updated: boolean }>('/auth/me/password', data),
};
