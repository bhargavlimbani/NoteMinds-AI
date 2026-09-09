import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerNotesTools } from './notes.tool.js';
import { registerSubjectsTools } from './subjects.tool.js';
import { registerTopicsTools } from './topics.tool.js';
import { registerProgressTools } from './progress.tool.js';
import { registerQuizTools } from './quiz.tool.js';

export const TOOL_NAMES = ['search_notes', 'get_subjects', 'get_topics', 'get_progress', 'save_progress', 'generate_quiz'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** Registers every StudyMCP tool on the given MCP server. */
export function registerAllTools(server: McpServer) {
  registerNotesTools(server);
  registerSubjectsTools(server);
  registerTopicsTools(server);
  registerProgressTools(server);
  registerQuizTools(server);
}
