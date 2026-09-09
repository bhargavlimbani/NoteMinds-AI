import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createLogger, preview } from '../../config/logger.js';

const log = createLogger('mcp-tool');

/** Successful tool result: JSON text content (parsed again by the client). */
export function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

/** Failed tool result (isError lets the model see and explain the failure). */
export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: message }) }] };
}

/** Wraps a tool body with logging and safe error handling. */
export async function runTool(name: string, args: unknown, body: () => Promise<unknown>): Promise<CallToolResult> {
  const started = Date.now();
  log.debug(`-> ${name}`, args);
  try {
    const data = await body();
    log.debug(`<- ${name} (${Date.now() - started}ms)`, preview(data, 300));
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool failed';
    log.warn(`x ${name}: ${message}`);
    return fail(message);
  }
}
