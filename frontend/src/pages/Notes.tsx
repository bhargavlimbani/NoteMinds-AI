import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch';
import { noteApi } from '../services/note.service';
import { subjectApi } from '../services/subject.service';
import { errorMessage } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/notes/FileUpload';
import { NoteCard } from '../components/notes/NoteCard';
import { formatDateTime } from '../utils/format';
import type { NoteDetail, NoteSearchResponse, NoteSummary } from '../types';

export default function NotesPage() {
  const [params] = useSearchParams();
  const defaultSubjectId = params.get('subjectId') ?? undefined;
  const subjects = useFetch(() => subjectApi.list(), []);
  const notes = useFetch(() => noteApi.list(), []);
  const [filterSubject, setFilterSubject] = useState(defaultSubjectId ?? '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<NoteSearchResponse | null>(null);
  const [preview, setPreview] = useState<NoteDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleting, setDeleting] = useState<NoteSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => (notes.data ?? []).filter((n) => !filterSubject || n.subject.id === filterSubject), [notes.data, filterSubject]);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return setSearchResult(null);
    setSearching(true);
    try {
      setSearchResult(await noteApi.search(query.trim(), filterSubject ? { subjectId: filterSubject } : undefined));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const openPreview = async (note: NoteSummary) => {
    setPreviewLoading(true);
    try {
      setPreview(await noteApi.get(note.id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await noteApi.remove(deleting.id);
      toast.success('Note deleted');
      setDeleting(null);
      notes.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Knowledge base" title="Study notes" subtitle="Upload PDF or TXT notes. The text is extracted, chunked and searched by the AI through the MCP search_notes tool." />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <FileUpload subjects={subjects.data ?? []} defaultSubjectId={defaultSubjectId} onUploaded={() => notes.reload()} />

          <form onSubmit={runSearch} className="glass p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-semibold">Test the notes search</h3>
            </div>
            <p className="mb-3 text-xs text-slate-400">This runs the same PostgreSQL full-text search the MCP tool uses.</p>
            <div className="flex gap-2">
              <Input placeholder="e.g. third normal form" icon={<Search className="h-4 w-4" />} value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button type="submit" loading={searching} className="shrink-0">
                Search
              </Button>
            </div>
            {searchResult && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-400">
                  {searchResult.matches} passage{searchResult.matches === 1 ? '' : 's'} found in {searchResult.totalNotes} note{searchResult.totalNotes === 1 ? '' : 's'}
                  {searchResult.method ? ` · ${searchResult.method} search` : ''}
                </p>
                {searchResult.results.map((r) => (
                  <div key={`${r.noteId}-${r.chunkIndex}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-semibold text-primary-200">
                      {r.noteTitle} <span className="text-slate-500">· {r.subject.name}{r.unit ? ` / ${r.unit.name}` : ''}</span>
                    </p>
                    <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-slate-300">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Your notes <span className="text-sm font-normal text-slate-500">({visible.length})</span>
            </h2>
            <div className="w-56">
              <Select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {notes.loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} lines={4} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={<FileText className="h-7 w-7" />} title="No notes yet" description="Upload your first PDF or TXT file. The AI will be able to answer questions from it." />
          ) : (
            <motion.div className="grid gap-4 md:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {visible.map((note) => (
                <motion.div key={note.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                  <NoteCard note={note} onPreview={openPreview} onDelete={setDeleting} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Modal open={Boolean(preview) || previewLoading} onClose={() => setPreview(null)} title={preview?.title ?? 'Loading…'} description={preview ? `${preview.subject.name}${preview.unit ? ` / ${preview.unit.name}` : ''} · ${preview.wordCount} words · uploaded ${formatDateTime(preview.createdAt)}` : undefined} size="xl">
        {preview ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">{preview.content}</pre>
        ) : (
          <div className="space-y-2">
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-5/6 rounded" />
            <div className="shimmer h-4 w-2/3 rounded" />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} loading={busy} danger title={`Delete "${deleting?.title}"?`} description="The extracted text and search chunks will be removed. The AI will no longer use this note." confirmLabel="Delete note" />
    </div>
  );
}
