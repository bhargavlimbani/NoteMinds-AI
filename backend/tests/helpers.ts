import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

export const app = createApp();

export function uniqueEmail(prefix = 'student') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@studymcp.test`;
}

/** Registers a fresh user and returns its token + id. */
export async function registerUser(name = 'Test Student') {
  const email = uniqueEmail();
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'secret123' });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, id: res.body.data.user.id as string, email };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function cleanupUsers(ids: string[]) {
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
