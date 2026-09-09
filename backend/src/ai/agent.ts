import type { Content, FunctionCall, Part } from '@google/genai';
import { generateWithTools } from './gemini.js';
import { mcpToolToFunctionDeclaration } from './schema.js';
import { buildStudyAssistantPrompt } from './prompts.js';
import { mcpClient } from '../mcp/client/client.js';
import { createLogger, preview } from '../config/logger.js';

const log = createLogger('ai-agent');

/** Maximum number of model <-> tool rounds for a single question. */
const MAX_TOOL_ROUNDS = 6;

export interface ToolCallLog {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  ok: boolean;
  durationMs: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResult {
  text: string;
  toolCalls: ToolCallLog[];
  rounds: number;
}

/**
 * The StudyMCP agent loop:
 *
 *   student question
 *     -> Gemini (with MCP tool declarations)
 *     -> Gemini decides a tool is needed -> MCP client -> MCP server -> tool -> database
 *     -> tool result back to Gemini
 *     -> final personalised answer
 *
 * The authenticated userId is injected by the backend on every tool call so
 * the model can never read another student's data.
 */
export async function runStudyAgent(params: {
  userId: string;
  userName: string;
  message: string;
  history?: AgentMessage[];
}): Promise<AgentResult> {
  const tools = await mcpClient.listTools();
  const declarations = tools.map((tool) => mcpToolToFunctionDeclaration(tool));
  const systemInstruction = buildStudyAssistantPrompt(params.userName);

  const contents: Content[] = [
    ...(params.history ?? []).map<Content>((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: params.message }] },
  ];

  log.info('AI request', {
    userId: params.userId,
    message: preview(params.message, 200),
    availableTools: declarations.map((d) => d.name),
  });

  const toolCalls: ToolCallLog[] = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const response = await generateWithTools({ contents, systemInstruction, functionDeclarations: declarations });
    const modelContent = response.candidates?.[0]?.content;
    const calls = response.functionCalls ?? [];

    if (calls.length === 0 || !modelContent) {
      const text = response.text?.trim() || 'I could not generate an answer. Please try rephrasing your question.';
      log.info('AI final response', { rounds, toolsUsed: toolCalls.map((t) => t.tool), text: preview(text, 200) });
      return { text, toolCalls, rounds };
    }

    // Keep the model turn (including its function calls) in the conversation.
    contents.push(modelContent);

    const responseParts: Part[] = [];
    for (const call of calls) {
      const result = await executeToolCall(params.userId, call, toolCalls);
      responseParts.push({ functionResponse: { name: call.name ?? 'unknown', response: result } });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  // Safety net: too many rounds -> ask for a final answer without tools.
  log.warn(`Reached the maximum of ${MAX_TOOL_ROUNDS} tool rounds, asking for a final answer`);
  const final = await generateWithTools({
    contents: [...contents, { role: 'user', parts: [{ text: 'Give your final answer now using the information already gathered.' }] }],
    systemInstruction,
    functionDeclarations: [],
  });
  return {
    text: final.text?.trim() || 'I gathered your data but could not finish the answer. Please try again.',
    toolCalls,
    rounds,
  };
}

async function executeToolCall(userId: string, call: FunctionCall, logs: ToolCallLog[]): Promise<Record<string, unknown>> {
  const name = call.name ?? 'unknown';
  const args = { ...(call.args ?? {}) } as Record<string, unknown>;
  delete args.userId; // never trust a model-provided user id

  log.info(`MCP tool selected -> ${name}`, { input: args });
  const started = Date.now();
  try {
    const result = await mcpClient.callTool(name, { ...args, userId });
    const durationMs = Date.now() - started;
    log.info(`MCP tool result <- ${name}`, { ok: !result.isError, durationMs, output: preview(result.data, 400) });
    logs.push({ tool: name, input: args, output: compact(result.data), ok: !result.isError, durationMs });
    return result.isError ? { error: result.text } : { result: result.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`MCP tool failed <- ${name}`, message);
    logs.push({ tool: name, input: args, output: { error: message }, ok: false, durationMs: Date.now() - started });
    return { error: `Tool ${name} failed: ${message}` };
  }
}

/** Shrinks tool output before it is stored with the chat message (keeps the demo readable). */
function compact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[…]';
  if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}…` : value;
  if (Array.isArray(value)) {
    const items = value.slice(0, 8).map((v) => compact(v, depth + 1));
    return value.length > 8 ? [...items, `… ${value.length - 8} more`] : items;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = compact(v, depth + 1);
    return out;
  }
  return value;
}
