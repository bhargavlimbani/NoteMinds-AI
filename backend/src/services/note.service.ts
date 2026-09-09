import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { createLogger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { chunkText, cleanText, countWords, extractTerms, truncate } from '../utils/text.js';
import { extractPdfText } from '../utils/pdf.js';
import { fileTypeFromName } from '../middleware/upload.middleware.js';
import { assertSubjectOwner } from './subject.service.js';
import { assertUnitOwner } from './unit.service.js';
import { buildStoragePath, deleteFileFromStorage, uploadFileToStorage } from './storage.service.js';
import { logActivity } from './activity.service.js';
import { touchUnitStudied } from './progress.service.js';

const log = createLogger('notes');

const noteSummarySelect = {
  id: true,
  title: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  fileUrl: true,
  wordCount: true,
  createdAt: true,
  subject: { select: { id: true, name: true, code: true, color: true } },
  unit: { select: { id: true, name: true } },
  _count: { select: { chunks: true } },
} satisfies Prisma.NoteSelect;

type NoteSummaryRow = Prisma.NoteGetPayload<{ select: typeof noteSummarySelect }>;

function toSummary(note: NoteSummaryRow) {
  const { _count, ...rest } = note;
  return { ...rest, chunkCount: _count.chunks };
}

export interface UploadNoteInput {
  file: Express.Multer.File;
  subjectId: string;
  unitId?: string | null;
  title?: string | null;
}

/**
 * Upload pipeline: validate file -> extract text (PDF/TXT) -> clean -> chunk ->
 * store in PostgreSQL (and optionally the original file in Supabase Storage).
 */
export async function createNoteFromUpload(userId: string, input: UploadNoteInput) {
  const subject = await assertSubjectOwner(userId, input.subjectId);
  const unit = input.unitId ? await assertUnitOwner(userId, input.unitId) : null;
  if (unit && unit.subjectId !== subject.id) {
    throw AppError.badRequest('The selected unit does not belong to this subject');
  }

  const file = input.file;
  if (!file || !file.buffer || file.size === 0) throw AppError.badRequest('The uploaded file is empty');

  const fileType = fileTypeFromName(file.originalname);
  let text = '';
  if (fileType === 'pdf') {
    if (!file.buffer.subarray(0, 8).toString('latin1').includes('%PDF')) {
      throw AppError.badRequest('This file is not a valid PDF');
    }
    text = (await extractPdfText(file.buffer)).text;
  } else {
    if (file.buffer.subarray(0, 4096).includes(0)) {
      throw AppError.badRequest('This file does not look like a plain text file');
    }
    text = cleanText(file.buffer.toString('utf8'));
  }

  const wordCount = countWords(text);
  if (wordCount < 5) {
    throw AppError.badRequest(
      'No readable text was found in this file. Scanned or image-only PDFs are not supported yet.',
    );
  }

  const chunks = chunkText(text);
  const title = input.title?.trim() || file.originalname.replace(/\.(pdf|txt)$/i, '');

  const note = await prisma.note.create({
    data: {
      userId,
      subjectId: subject.id,
      unitId: unit?.id ?? null,
      title,
      fileName: file.originalname,
      fileType,
      fileSize: file.size,
      content: text,
      wordCount,
      chunks: { create: chunks.map((content, index) => ({ index, content })) },
    },
    select: noteSummarySelect,
  });

  const fileUrl = await uploadFileToStorage({
    path: buildStoragePath(userId, note.id, file.originalname),
    buffer: file.buffer,
    contentType: fileType === 'pdf' ? 'application/pdf' : 'text/plain',
  });
  if (fileUrl) await prisma.note.update({ where: { id: note.id }, data: { fileUrl } });

  if (unit) await touchUnitStudied(userId, unit.id);
  await logActivity(userId, {
    type: 'NOTE_UPLOAD',
    title: `Uploaded notes "${title}" to ${subject.name}${unit ? ` / ${unit.name}` : ''}`,
    subjectId: subject.id,
    unitId: unit?.id,
    meta: { noteId: note.id, wordCount },
  });
  log.info(`Stored note ${note.id} (${fileType}, ${wordCount} words, ${chunks.length} chunks)`);

  return { ...toSummary(note), fileUrl: fileUrl ?? note.fileUrl, preview: truncate(text, 300) };
}

export async function listNotes(userId: string, filters: { subjectId?: string; unitId?: string } = {}) {
  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: noteSummarySelect,
  });
  return notes.map(toSummary);
}

export async function getNote(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
    select: { ...noteSummarySelect, content: true },
  });
  if (!note) throw AppError.notFound('Note not found');
  const { _count, ...rest } = note;
  return { ...rest, chunkCount: _count.chunks };
}

export async function deleteNote(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw AppError.notFound('Note not found');
  await prisma.note.delete({ where: { id: noteId } });
  if (note.fileUrl) await deleteFileFromStorage(buildStoragePath(userId, note.id, note.fileName));
  return { deleted: true };
}

// ---------------------------------------------------------------
// Search (used by the MCP search_notes tool)
// ---------------------------------------------------------------

export interface NoteSearchResult {
  noteId: string;
  noteTitle: string;
  fileName: string;
  subject: { id: string; name: string };
  unit: { id: string; name: string } | null;
  chunkIndex: number;
  content: string;
  score: number;
}

interface RawHit {
  id: string;
  noteId: string;
  chunkIndex: number;
  content: string;
  rank: number;
}

/** PostgreSQL full-text search over note chunks that belong to the user. */
async function fullTextSearch(
  userId: string,
  query: string,
  subjectId: string | null,
  unitId: string | null,
  limit: number,
): Promise<RawHit[]> {
  return prisma.$queryRaw<RawHit[]>(Prisma.sql`
    SELECT c.id, c."noteId", c."index" AS "chunkIndex", c.content,
           ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${query})) AS rank
    FROM "NoteChunk" c
    JOIN "Note" n ON n.id = c."noteId"
    WHERE n."userId" = ${userId}
      AND (${subjectId}::text IS NULL OR n."subjectId" = ${subjectId}::text)
      AND (${unitId}::text IS NULL OR n."unitId" = ${unitId}::text)
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
}

/** Fallback keyword search (case-insensitive substring match, scored by term frequency). */
async function keywordSearch(
  userId: string,
  query: string,
  subjectId: string | null,
  unitId: string | null,
  limit: number,
): Promise<RawHit[]> {
  const terms = extractTerms(query);
  if (terms.length === 0) return [];
  const chunks = await prisma.noteChunk.findMany({
    where: {
      note: { userId, ...(subjectId ? { subjectId } : {}), ...(unitId ? { unitId } : {}) },
      OR: terms.map((t) => ({ content: { contains: t, mode: 'insensitive' as const } })),
    },
    select: { id: true, noteId: true, index: true, content: true },
    take: 300,
  });
  return chunks
    .map((c) => {
      const lower = c.content.toLowerCase();
      const rank = terms.reduce((acc, t) => acc + lower.split(t).length - 1, 0);
      return { id: c.id, noteId: c.noteId, chunkIndex: c.index, content: c.content, rank };
    })
    .filter((c) => c.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

export async function searchNotes(
  userId: string,
  input: { query: string; subjectId?: string | null; unitId?: string | null; limit?: number },
) {
  const query = input.query.trim();
  if (!query) throw AppError.badRequest('Search query is required');
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 10);
  const subjectId = input.subjectId ?? null;
  const unitId = input.unitId ?? null;

  const totalNotes = await prisma.note.count({
    where: { userId, ...(subjectId ? { subjectId } : {}), ...(unitId ? { unitId } : {}) },
  });
  if (totalNotes === 0) return { query, totalNotes: 0, matches: 0, results: [] as NoteSearchResult[] };

  let hits = await fullTextSearch(userId, query, subjectId, unitId, limit);
  let method: 'full-text' | 'keyword' = 'full-text';
  if (hits.length === 0) {
    hits = await keywordSearch(userId, query, subjectId, unitId, limit);
    method = 'keyword';
  }

  const notes = await prisma.note.findMany({
    where: { id: { in: Array.from(new Set(hits.map((h) => h.noteId))) }, userId },
    select: { id: true, title: true, fileName: true, subject: { select: { id: true, name: true } }, unit: { select: { id: true, name: true } } },
  });
  const noteMap = new Map(notes.map((n) => [n.id, n]));

  const results: NoteSearchResult[] = hits
    .filter((h) => noteMap.has(h.noteId))
    .map((h) => {
      const n = noteMap.get(h.noteId)!;
      return {
        noteId: n.id,
        noteTitle: n.title,
        fileName: n.fileName,
        subject: n.subject,
        unit: n.unit,
        chunkIndex: h.chunkIndex,
        content: truncate(h.content, 1500),
        score: Number(Number(h.rank).toFixed(4)),
      };
    });

  log.debug(`search_notes "${query}" -> ${results.length} results (${method})`);
  return { query, totalNotes, matches: results.length, method, results };
}

/** Concatenated note text for a subject/unit, used as context for quiz generation. */
export async function getNoteContext(
  userId: string,
  input: { subjectId: string; unitId?: string | null; maxChars?: number },
) {
  const maxChars = input.maxChars ?? 12_000;
  const notes = await prisma.note.findMany({
    where: { userId, subjectId: input.subjectId, ...(input.unitId ? { unitId: input.unitId } : {}) },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, chunks: { orderBy: { index: 'asc' }, select: { content: true } } },
  });
  if (notes.length === 0) return { text: '', noteTitles: [] as string[], totalNotes: 0 };

  const perNote = Math.max(2_000, Math.floor(maxChars / notes.length));
  const parts: string[] = [];
  let used = 0;
  for (const note of notes) {
    let noteText = '';
    for (const chunk of note.chunks) {
      if (noteText.length + chunk.content.length > perNote) break;
      noteText += `${chunk.content}\n\n`;
    }
    if (!noteText) continue;
    if (used + noteText.length > maxChars) break;
    parts.push(`### Note: ${note.title}\n${noteText.trim()}`);
    used += noteText.length;
  }
  return { text: parts.join('\n\n'), noteTitles: notes.map((n) => n.title), totalNotes: notes.length };
}
