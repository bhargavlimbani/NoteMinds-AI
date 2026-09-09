/**
 * StudyMCP MCP server - stdio entry point.
 *
 * Started automatically by the backend (see mcp/client/client.ts) or manually:
 *   npm run mcp:server        (raw stdio - used by MCP clients)
 *   npm run mcp:inspect       (opens the MCP Inspector UI to try each tool)
 *
 * IMPORTANT: stdout is reserved for MCP protocol messages, so all logging in
 * this process goes to stderr (see config/logger.ts).
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStudyMcpServer } from './createServer.js';
import { TOOL_NAMES } from '../tools/index.js';
import { createLogger } from '../../config/logger.js';
import { disconnectPrisma } from '../../config/prisma.js';

const log = createLogger('mcp-server');

async function main() {
  const server = createStudyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info(`MCP server ready on stdio with tools: ${TOOL_NAMES.join(', ')}`);

  const shutdown = async () => {
    await server.close().catch(() => undefined);
    await disconnectPrisma().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.stdin.on('close', shutdown);
}

main().catch((error) => {
  log.error('MCP server failed to start', error instanceof Error ? error.message : error);
  process.exit(1);
});
