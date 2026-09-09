/**
 * Manual MCP tool test - talks to the real MCP server over stdio (separate
 * process) exactly like the backend does, and calls every tool.
 *
 *   npm run mcp:test                       (uses the demo user)
 *   npm run mcp:test -- student@email.com  (any registered user)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2] ?? 'demo@studymcp.ai';

function show(title: string, result: unknown) {
  const text = JSON.stringify(result, null, 2);
  console.log(`\n=== ${title} ===\n${text.length > 1800 ? `${text.slice(0, 1800)}\n... (truncated)` : text}`);
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email }, include: { subjects: { include: { units: true } } } });
  await prisma.$disconnect();
  if (!user) throw new Error(`User ${email} not found. Run "npm run prisma:seed" first or pass a registered email.`);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/mcp/server/server.ts')],
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    env: { ...getDefaultEnvironment(), MCP_STDIO: '1' },
    stderr: 'inherit',
  });
  const client = new Client({ name: 'mcp-test-script', version: '1.0.0' });
  await client.connect(transport);
  console.log(`Connected to ${client.getServerVersion()?.name} for user ${user.name} (${user.id})`);

  const { tools } = await client.listTools();
  show('tools/list', tools.map((t) => ({ name: t.name, description: t.description?.slice(0, 80) })));

  const call = async (name: string, args: Record<string, unknown>) => {
    const started = Date.now();
    const result = await client.callTool({ name, arguments: { userId: user.id, ...args } });
    const content = (result.content as { type: string; text?: string }[]).find((c) => c.type === 'text');
    let parsed: unknown = content?.text;
    try { parsed = JSON.parse(content?.text ?? ''); } catch { /* keep text */ }
    show(`${name} (${Date.now() - started}ms${result.isError ? ', error' : ''})`, parsed);
    return parsed as Record<string, unknown>;
  };

  await call('get_subjects', {});
  const subject = user.subjects[0];
  if (subject) {
    await call('get_topics', { subjectId: subject.id });
    await call('search_notes', { query: 'normalization 3NF', subjectName: subject.name });
    await call('get_progress', {});
    const unit = subject.units[0];
    if (unit) await call('save_progress', { unitId: unit.id, completion: 65 });
    await call('generate_quiz', { subjectId: subject.id, unitId: unit?.id, numberOfQuestions: 3, difficulty: 'easy' });
  } else {
    console.log('User has no subjects yet - create some in the app first.');
  }

  await client.close();
}

main().catch((error) => {
  console.error('MCP test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
