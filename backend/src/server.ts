import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma, disconnectPrisma } from './config/prisma.js';
import { mcpClient } from './mcp/client/client.js';
import { isAIConfigured, getModelName } from './ai/gemini.js';

function describeDatabase(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return 'invalid DATABASE_URL';
  }
}

async function start() {
  logger.info('Starting NoteMinds AI backend', {
    node: process.version,
    env: env.NODE_ENV,
    port: env.PORT,
    database: describeDatabase(env.DATABASE_URL),
    mcpTransport: env.MCP_TRANSPORT,
  });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`NoteMinds AI backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Connect to PostgreSQL (with a timeout so a wrong DATABASE_URL is reported clearly).
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out after 15s')), 15_000));
  try {
    await Promise.race([prisma.$connect(), timeout]);
    logger.info('Connected to PostgreSQL');
  } catch (error) {
    logger.error('Could not connect to PostgreSQL - check DATABASE_URL', error instanceof Error ? error.message : error);
  }

  // Warm up the MCP connection so the first chat request is fast.
  mcpClient
    .listTools()
    .then((tools) => logger.info(`MCP ready (${mcpClient.transport}) with tools: ${tools.map((t) => t.name).join(', ')}`))
    .catch((error) => logger.error('MCP server could not be started', error instanceof Error ? error.message : error));

  if (!isAIConfigured()) {
    logger.warn('GEMINI_API_KEY is not set - AI chat, quiz generation and AI recommendations are disabled');
  } else {
    logger.info(`Gemini configured with model ${getModelName()}`);
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close();
    await mcpClient.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error) => {
  logger.error('Failed to start server', error instanceof Error ? error.stack : error);
  process.exit(1);
});
