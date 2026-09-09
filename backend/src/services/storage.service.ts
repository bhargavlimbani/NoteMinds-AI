import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('storage');
let client: SupabaseClient | null = null;

/** Persistent object storage (Supabase Storage) is optional; text is always kept in PostgreSQL. */
export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
  return client;
}

export function buildStoragePath(userId: string, noteId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return `${userId}/${noteId}-${safe}`;
}

export async function uploadFileToStorage(params: { path: string; buffer: Buffer; contentType: string }): Promise<string | null> {
  if (!isStorageConfigured()) return null;
  try {
    const bucket = getClient().storage.from(env.SUPABASE_STORAGE_BUCKET);
    const { error } = await bucket.upload(params.path, params.buffer, { contentType: params.contentType, upsert: true });
    if (error) {
      log.warn('Upload to Supabase Storage failed', error.message);
      return null;
    }
    return bucket.getPublicUrl(params.path).data.publicUrl;
  } catch (error) {
    log.warn('Upload to Supabase Storage failed', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function deleteFileFromStorage(path: string): Promise<void> {
  if (!isStorageConfigured()) return;
  try {
    await getClient().storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
  } catch (error) {
    log.warn('Delete from Supabase Storage failed', error instanceof Error ? error.message : error);
  }
}
