import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

export async function register(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, password: await hashPassword(input.password) },
    select: publicUser,
  });
  const token = signToken({ sub: user.id, email: user.email });
  return { user, token };
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password (do not reveal which).
  if (!user || !(await verifyPassword(input.password, user.password))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  const token = signToken({ sub: user.id, email: user.email });
  const { password: _password, updatedAt: _updatedAt, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
  if (!user) throw AppError.unauthorized('Account not found');
  return user;
}

export async function updateProfile(userId: string, input: { name: string }) {
  return prisma.user.update({ where: { id: userId }, data: { name: input.name.trim() }, select: publicUser });
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(input.currentPassword, user.password))) {
    throw AppError.badRequest('Current password is incorrect');
  }
  await prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(input.newPassword) } });
  return { updated: true };
}
