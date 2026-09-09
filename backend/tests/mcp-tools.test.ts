/**
 * Tests every MCP tool independently through a real MCP client <-> server
 * connection (in-memory transport, same JSON-RPC protocol as stdio).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createStudyMcpServer } from '../src/mcp/server/createServer.js';
import { parseToolResult } from '../src/mcp/client/client.js';
import { mcpToolToFunctionDeclaration } from '../src/ai/schema.js';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/utils/password.js';
import { createSubject } from '../src/services/subject.service.js';
import { createUnit } from '../src/services/unit.service.js';
import { cleanupUsers, uniqueEmail } from './helpers.js';

const client = new Client({ name: 'test-client', version: '1.0.0' });
const users: string[] = [];
let userId = '';
let otherUserId = '';
let subjectId = '';
let unitId = '';
let topicId = '';

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  return parseToolResult(result);
}

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createStudyMcpServer();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const user = await prisma.user.create({ data: { name: 'MCP Tester', email: uniqueEmail('mcp'), password: await hashPassword('secret123') } });
  const other = await prisma.user.create({ data: { name: 'Other', email: uniqueEmail('other'), password: await hashPassword('secret123') } });
  userId = user.id;
  otherUserId = other.id;
  users.push(userId, otherUserId);

  const subject = await createSubject(userId, { name: 'DBMS', code: 'CS301' });
  subjectId = subject.id;
  const unit = await createUnit(userId, subjectId, { name: 'Unit 3: Normalization', topics: ['1NF', '2NF', '3NF'] });
  unitId = unit.id;
  topicId = unit.topics[0].id;

  const content =
    'Third Normal Form (3NF) removes transitive dependencies: no non-key attribute may depend on another non-key attribute.\n\n' +
    'Boyce-Codd Normal Form (BCNF) requires every determinant to be a candidate key.';
  await prisma.note.create({
    data: {
      userId,
      subjectId,
      unitId,
      title: 'Normalization notes',
      fileName: 'normalization.txt',
      fileType: 'txt',
      fileSize: content.length,
      content,
      wordCount: 30,
      chunks: { create: content.split('\n\n').map((c, index) => ({ index, content: c })) },
    },
  });
});

afterAll(async () => {
  await client.close();
  await cleanupUsers(users);
  await prisma.$disconnect();
});

describe('MCP server', () => {
  it('lists the six StudyMCP tools with JSON schemas', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['generate_quiz', 'get_progress', 'get_subjects', 'get_topics', 'save_progress', 'search_notes']);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect((tool.inputSchema.properties as Record<string, unknown>).userId).toBeDefined();
    }
  });

  it('converts MCP tools to Gemini function declarations without the userId parameter', async () => {
    const { tools } = await client.listTools();
    const search = tools.find((t) => t.name === 'search_notes')!;
    const declaration = mcpToolToFunctionDeclaration(search);
    expect(declaration.name).toBe('search_notes');
    expect(declaration.parameters?.properties?.userId).toBeUndefined();
    expect(declaration.parameters?.properties?.query).toBeDefined();
    expect(declaration.parameters?.required).toEqual(['query']);

    const subjects = tools.find((t) => t.name === 'get_subjects')!;
    expect(mcpToolToFunctionDeclaration(subjects).parameters).toBeUndefined();
  });
});

describe('MCP tools', () => {
  it('search_notes returns relevant passages only for the owner', async () => {
    const mine = await call('search_notes', { userId, query: 'transitive dependency 3NF' });
    expect(mine.isError).toBe(false);
    const data = mine.data as { results: { content: string; noteTitle: string; unit: { name: string } | null }[]; totalNotes: number };
    expect(data.totalNotes).toBe(1);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].content).toContain('3NF');
    expect(data.results[0].noteTitle).toBe('Normalization notes');

    const byName = await call('search_notes', { userId, query: 'BCNF', subjectName: 'dbms', unitName: 'unit 3' });
    expect((byName.data as { results: unknown[] }).results.length).toBeGreaterThan(0);

    const theirs = await call('search_notes', { userId: otherUserId, query: 'transitive dependency 3NF' });
    expect((theirs.data as { totalNotes: number; results: unknown[] }).totalNotes).toBe(0);
    expect((theirs.data as { results: unknown[] }).results).toHaveLength(0);
  });

  it('get_subjects returns the subjects of the student', async () => {
    const res = await call('get_subjects', { userId });
    const data = res.data as { total: number; subjects: { name: string; unitCount: number }[] };
    expect(data.total).toBe(1);
    expect(data.subjects[0].name).toBe('DBMS');
    expect(data.subjects[0].unitCount).toBe(1);

    const other = await call('get_subjects', { userId: otherUserId });
    expect((other.data as { total: number }).total).toBe(0);
  });

  it('get_topics returns units and topics by subject id or name', async () => {
    const res = await call('get_topics', { userId, subjectName: 'DBMS' });
    const data = res.data as { units: { name: string; topics: { name: string; completed: boolean }[] }[] };
    expect(data.units[0].name).toBe('Unit 3: Normalization');
    expect(data.units[0].topics.map((t) => t.name)).toEqual(['1NF', '2NF', '3NF']);

    const missing = await call('get_topics', { userId, subjectName: 'Astrophysics' });
    expect(missing.isError).toBe(true);
    expect((missing.data as { error: string }).error).toContain('not found');
  });

  it('save_progress updates topics/units and get_progress reflects it', async () => {
    const topic = await call('save_progress', { userId, topicId, completion: 100 });
    expect(topic.isError).toBe(false);
    expect((topic.data as { completion: number }).completion).toBe(33);

    const unit = await call('save_progress', { userId, unitName: 'unit 3', subjectName: 'DBMS', completion: 80 });
    expect(unit.isError).toBe(false);
    expect((unit.data as { completion: number }).completion).toBe(80);

    const progress = await call('get_progress', { userId });
    const data = progress.data as { overall: number; subjects: { units: { completion: number; topics: { completed: number } }[] }[] };
    expect(data.overall).toBe(80);
    expect(data.subjects[0].units[0].topics.completed).toBe(1);

    const forbidden = await call('save_progress', { userId: otherUserId, unitId, completion: 10 });
    expect(forbidden.isError).toBe(true);
  });

  it('generate_quiz validates ownership and needs the AI configuration', async () => {
    const forbidden = await call('generate_quiz', { userId: otherUserId, subjectId, numberOfQuestions: 3 });
    expect(forbidden.isError).toBe(true);

    const res = await call('generate_quiz', { userId, subjectName: 'DBMS', unitName: 'Normalization', numberOfQuestions: 3, difficulty: 'easy' });
    if (!env.isAIConfigured) {
      expect(res.isError).toBe(true);
      expect((res.data as { error: string }).error).toContain('not configured');
      return;
    }
    if (res.isError) {
      // A configured key can still hit the free-tier quota; the tool must report it cleanly.
      const message = (res.data as { error: string }).error;
      expect(message).toMatch(/quota|busy|overloaded|try again/i);
      console.warn(`generate_quiz skipped: ${message}`);
      return;
    }
    const quiz = res.data as { id: string; questions: { question: string; options: string[] }[] };
    expect(quiz.questions.length).toBeGreaterThan(0);
    expect((quiz.questions[0] as { correctAnswer?: string }).correctAnswer).toBeUndefined();
  });
});
