import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools, TOOL_NAMES } from '../tools/index.js';

export const MCP_SERVER_INFO = { name: 'studymcp-server', version: '1.0.0' };

/**
 * Builds the StudyMCP MCP server with all tools registered.
 * The same factory is used by the stdio entry point (separate process), the
 * in-memory transport (same process) and the automated tests.
 */
export function createStudyMcpServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    capabilities: { tools: {} },
    instructions:
      `StudyMCP server exposes tools that read and update a single student's academic data: ${TOOL_NAMES.join(', ')}. ` +
      'Every tool requires the authenticated userId and only returns data owned by that user.',
  });
  registerAllTools(server);
  return server;
}
