import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Schema,
} from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('gemini');
let client: GoogleGenAI | null = null;

export function isAIConfigured(): boolean {
  return env.isAIConfigured;
}

export function getModelName(): string {
  return env.GEMINI_MODEL;
}

export function assertAIConfigured(): void {
  if (!env.isAIConfigured) {
    throw AppError.serviceUnavailable(
      'AI features are not configured. Add GEMINI_API_KEY to backend/.env and restart the server.',
    );
  }
}

function getClient(): GoogleGenAI {
  assertAIConfigured();
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/** Map raw SDK errors to safe, user-friendly errors (no keys or internals leak). */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return AppError.serviceUnavailable('The Gemini API key is invalid. Check GEMINI_API_KEY in backend/.env.');
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new AppError('The AI service is busy (quota exceeded). Please try again in a minute.', 429);
  }
  if (/503|UNAVAILABLE|overloaded/i.test(message)) {
    return AppError.serviceUnavailable('The AI service is temporarily overloaded. Please try again.');
  }
  if (/model/i.test(message) && /not found|NOT_FOUND|not supported/i.test(message)) {
    return AppError.serviceUnavailable(`The model "${env.GEMINI_MODEL}" is not available. Change GEMINI_MODEL in backend/.env.`);
  }
  log.error('Gemini request failed', message);
  return AppError.serviceUnavailable('The AI service could not process the request right now.');
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const transient = /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message);
      if (!transient || attempt === attempts - 1) break;
      log.warn(`Gemini transient error, retrying (${attempt + 1}/${attempts - 1})`, message);
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
  }
  throw toAppError(lastError);
}

/** Chat completion with function (tool) declarations. Returns the raw response so the agent can inspect function calls. */
export async function generateWithTools(params: {
  contents: Content[];
  systemInstruction: string;
  functionDeclarations: FunctionDeclaration[];
  temperature?: number;
}): Promise<GenerateContentResponse> {
  const ai = getClient();
  return withRetry(() =>
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.4,
        tools: params.functionDeclarations.length ? [{ functionDeclarations: params.functionDeclarations }] : undefined,
      },
    }),
  );
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

/** Structured JSON generation (used for quizzes). */
export async function generateJSON<T>(params: {
  prompt: string;
  systemInstruction?: string;
  schema: Schema;
  temperature?: number;
}): Promise<T> {
  const ai = getClient();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.6,
        responseMimeType: 'application/json',
        responseSchema: params.schema,
      },
    }),
  );
  const text = response.text ?? '';
  try {
    return JSON.parse(stripCodeFences(text)) as T;
  } catch {
    log.error('Gemini returned invalid JSON', text.slice(0, 400));
    throw AppError.serviceUnavailable('The AI returned an unexpected response. Please try again.');
  }
}

/** Plain text generation (used for recommendation summaries). */
export async function generateText(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}): Promise<string> {
  const ai = getClient();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: params.prompt,
      config: { systemInstruction: params.systemInstruction, temperature: params.temperature ?? 0.5 },
    }),
  );
  return response.text?.trim() ?? '';
}
