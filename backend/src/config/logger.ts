import { env } from './env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel: Level = env.LOG_LEVEL ?? (env.isProd ? 'info' : 'debug');

const SENSITIVE_KEYS = /pass(word)?|secret|token|api[-_]?key|authorization|database_url/i;

/** Recursively mask values that look sensitive before they reach the console. */
export function redact<T>(value: T, depth = 0): T {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out as T;
  }
  return value;
}

/** Shorten long strings (e.g. note content) for readable logs. */
export function preview(value: unknown, max = 300): string {
  const text = typeof value === 'string' ? value : JSON.stringify(redact(value));
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}… (+${text.length - max} chars)` : text;
}

function write(level: Level, scope: string, message: string, meta?: unknown) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const time = new Date().toISOString();
  const line = `${time} [${level.toUpperCase()}] [${scope}] ${message}`;
  const extra = meta === undefined ? '' : ` ${preview(meta, 600)}`;
  // The MCP stdio server must keep stdout clean (protocol messages only), so it
  // logs to stderr. The API server logs normally: info/debug -> stdout, warn/error -> stderr.
  const useStderr = process.env.MCP_STDIO === '1' || LEVELS[level] >= LEVELS.warn;
  (useStderr ? process.stderr : process.stdout).write(`${line}${extra}\n`);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: unknown) => write('debug', scope, message, meta),
    info: (message: string, meta?: unknown) => write('info', scope, message, meta),
    warn: (message: string, meta?: unknown) => write('warn', scope, message, meta),
    error: (message: string, meta?: unknown) => write('error', scope, message, meta),
  };
}

export const logger = createLogger('app');
