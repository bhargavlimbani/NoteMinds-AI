import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { mcpClient } from '../mcp/client/client.js';
import { getModelName, isAIConfigured } from '../ai/gemini.js';
import { isStorageConfigured } from '../services/storage.service.js';
import { sendSuccess } from '../utils/response.js';

export async function health(_req: Request, res: Response) {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unavailable';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    success: database === 'ok',
    data: { status: database === 'ok' ? 'ok' : 'degraded', database, environment: env.NODE_ENV, timestamp: new Date().toISOString() },
  });
}

/** Shows how the AI + MCP layer is wired (useful during the project demo). */
export async function mcpStatus(_req: Request, res: Response) {
  const status = await mcpClient.status();
  sendSuccess(res, {
    mcp: status,
    ai: { configured: isAIConfigured(), model: getModelName() },
    storage: { persistent: isStorageConfigured(), provider: isStorageConfigured() ? 'supabase' : 'database-only' },
  });
}
