import axios, { AxiosError } from 'axios';
import type { ApiEnvelope } from '../types';

export const TOKEN_KEY = 'studymcp_token';
export const UNAUTHORIZED_EVENT = 'studymcp:unauthorized';

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];

  constructor(message: string, status: number, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 120_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; details?: { field: string; message: string }[] }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Is the backend running?');
    if (status === 401 && localStorage.getItem(TOKEN_KEY) && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(new ApiError(message, status, error.response?.data?.details));
  },
);

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, body?: unknown, config?: Record<string, unknown>): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(url, body, config);
  return res.data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await api.delete<ApiEnvelope<T>>(url);
  return res.data.data;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiError) {
    if (error.details?.length) return `${error.message}: ${error.details.map((d) => d.message).join(', ')}`;
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
