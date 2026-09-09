import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { env } from '../../config/env.js';
import { createLogger } from '../../config/logger.js';
import { createStudyMcpServer } from '../server/createServer.js';
import { AppError } from '../../utils/AppError.js';

const log = createLogger('mcp-client');

export interface ToolCallOutcome {
  data: unknown;
  text: string;
  isError: boolean;
  durationMs: number;
}

/** Extracts JSON data from an MCP tool result. */
export function parseToolResult(result: CallToolResult): { data: unknown; text: string; isError: boolean } {
  const text = (result.content ?? [])
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  let data: unknown = text;
  if (result.structuredContent) {
    data = result.structuredContent;
  } else {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { data, text, isError: Boolean(result.isError) };
}

/**
 * MCP client used by the backend (Gemini agent, REST quiz + recommendation
 * endpoints). It talks MCP (JSON-RPC) to the StudyMCP server either over
 * stdio (separate process - the default) or in-memory (same process).
 */
class StudyMcpClient {
  private client: Client | null = null;
  private connecting: Promise<Client> | null = null;
  private toolCache: Tool[] | null = null;
  private transportKind: 'stdio' | 'inmemory' = env.MCP_TRANSPORT;

  get transport() {
    return this.transportKind;
  }

  get isConnected() {
    return this.client !== null;
  }

  async getClient(): Promise<Client> {
    if (this.client) return this.client;
    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  private async connect(): Promise<Client> {
    const client = new Client({ name: 'studymcp-backend', version: '1.0.0' });
    const transport =
      this.transportKind === 'inmemory' ? await this.createInMemoryTransport() : this.createStdioTransport();

    client.onclose = () => {
      log.warn('MCP connection closed');
      this.client = null;
      this.toolCache = null;
    };
    client.onerror = (error) => log.error('MCP client error', error.message);

    try {
      await client.connect(transport);
    } catch (error) {
      if (this.transportKind === 'stdio') {
        log.warn('Could not start the MCP server process, falling back to in-memory transport', error instanceof Error ? error.message : error);
        this.transportKind = 'inmemory';
        return this.connect();
      }
      throw error;
    }

    this.client = client;
    const info = client.getServerVersion();
    log.info(`Connected to MCP server "${info?.name}" v${info?.version} via ${this.transportKind}`);
    return client;
  }

  /** Spawns `mcp/server/server.ts` (dev) or `mcp/server/server.js` (build) as a child process. */
  private createStdioTransport() {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const isCompiled = currentFile.endsWith('.js');
    const serverPath = path.resolve(currentDir, '..', 'server', isCompiled ? 'server.js' : 'server.ts');
    const args = isCompiled ? [serverPath] : ['--import', 'tsx', serverPath];
    const forwarded = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'NODE_ENV', 'LOG_LEVEL'];
    const childEnv: Record<string, string> = { ...getDefaultEnvironment(), MCP_STDIO: '1' };
    for (const key of forwarded) {
      if (process.env[key]) childEnv[key] = process.env[key] as string;
    }
    return new StdioClientTransport({
      command: process.execPath,
      args,
      cwd: path.resolve(currentDir, '..', '..', '..'),
      env: childEnv,
      stderr: 'inherit',
    });
  }

  /** Runs the same MCP server inside this process (useful for tests and restricted hosts). */
  private async createInMemoryTransport() {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createStudyMcpServer();
    await server.connect(serverTransport);
    return clientTransport;
  }

  async listTools(): Promise<Tool[]> {
    if (this.toolCache) return this.toolCache;
    const client = await this.getClient();
    const { tools } = await client.listTools();
    this.toolCache = tools;
    return tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallOutcome> {
    const client = await this.getClient();
    const started = Date.now();
    const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
    return { ...parseToolResult(result), durationMs: Date.now() - started };
  }

  async status() {
    try {
      const tools = await this.listTools();
      const info = (await this.getClient()).getServerVersion();
      return {
        connected: true,
        transport: this.transportKind,
        server: info ? { name: info.name, version: info.version } : null,
        tools: tools.map((t) => ({ name: t.name, description: t.description ?? '' })),
      };
    } catch (error) {
      return { connected: false, transport: this.transportKind, server: null, tools: [], error: error instanceof Error ? error.message : String(error) };
    }
  }

  async close() {
    if (this.client) {
      await this.client.close().catch(() => undefined);
      this.client = null;
      this.toolCache = null;
    }
  }
}

export const mcpClient = new StudyMcpClient();

/** Converts a tool outcome into data, or throws a user-friendly AppError. */
export function toolDataOrThrow<T = unknown>(outcome: ToolCallOutcome): T {
  if (!outcome.isError) return outcome.data as T;
  const message =
    (outcome.data && typeof outcome.data === 'object' && 'error' in outcome.data
      ? String((outcome.data as { error: unknown }).error)
      : outcome.text) || 'Tool failed';
  const status = /not configured|API key|overloaded|quota|AI service|AI returned/i.test(message)
    ? 503
    : /not found/i.test(message)
      ? 404
      : 400;
  throw new AppError(message, status);
}
