import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load backend/.env (quiet so nothing is printed to stdout - important for the
// MCP stdio server, whose stdout is reserved for protocol messages).
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  MCP_TRANSPORT: z.enum(['stdio', 'inmemory']).default('stdio'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('notes'),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  const message = `Invalid environment configuration:\n${issues}\n`;
  process.stderr.write(message);
  if (process.env.MCP_STDIO !== '1') process.stdout.write(message);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isDev: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  allowedOrigins: parsed.data.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean),
  isAIConfigured: parsed.data.GEMINI_API_KEY.length > 0,
};

export type Env = typeof env;
