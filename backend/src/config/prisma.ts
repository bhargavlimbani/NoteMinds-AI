import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Single Prisma client for the whole process. Only warnings and errors are
// logged (they go to stderr) so the MCP stdio transport is never corrupted.
declare global {
  // eslint-disable-next-line no-var
  var __studymcpPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__studymcpPrisma ??
  new PrismaClient({
    log: env.isProd ? ['error'] : ['warn', 'error'],
  });

if (!env.isProd) {
  global.__studymcpPrisma = prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
