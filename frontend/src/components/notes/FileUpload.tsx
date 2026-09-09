import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, FileUp, UploadCloud, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { noteApi } from '../../services/note.service';
import { subjectApi } from '../../services/subject.service';
import { errorMessage } from '../../services/api';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { formatBytes } from '../../utils/format';
import type { NoteSummary, SubjectSummary, Unit } from '../../types';

interface Props {
  subjects: SubjectSummary[];
  defaultSubjectId?: string;
  onUploaded: (note: NoteSummary) => void;
}

const MAX_MB = 10;

export function FileUpload({ subjects, defaultSubjectId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.id ?? '');
  const [unitId, setUnitId] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(defaultSubjectId ?? subjects[0].id);
  }, [subjects, subjectId, defaultSubjectId]);

  useEffect(() => {
    if (!subjectId) return;
    setUnitId('');
    subjectApi
      .listUnits(subjectId)
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [subjectId]);

  const pick = (candidate: File | undefined) => {
    if (!candidate) return;
    const ext = candidate.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') return toast.error('Only PDF and TXT files are supported');
    if (candidate.size > MAX_MB * 1024 * 1024) return toast.error(`File is larger than ${MAX_MB} MB`);
    if (candidate.size === 0) return toast.error('This file is empty');
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.(pdf|txt)$/i, ''));
    setStage('idle');
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !subjectId) return toast.error('Choose a file and a subject');
    setStage('uploading');
    setProgress(0);
    try {
      const note = await noteApi.upload({ file, subjectId, unitId: unitId || null, title: title || undefined }, (p) => {
        setProgress(p);
        if (p >= 100) setStage('processing');
      });
      setStage('done');
      toast.success(`"${note.title}" processed: ${note.wordCount} words, ${note.chunkCount} searchable chunks`);
      onUploaded(note);
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setStage('idle');
        setProgress(0);
      }, 1200);
    } catch (err) {
      setStage('idle');
      toast.error(errorMessage(err));
    }
  };

  const busy = stage === 'uploading' || stage === 'processing';

  return (
    <form onSubmit={submit} className="glass-strong gradient-border p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Upload study notes</h3>
          <p className="text-xs text-slate-400">PDF or TXT · text is extracted and made searchable for the AI</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          dragging ? 'border-primary-400 bg-primary-500/10' : 'border-white/15 hover:border-primary-400/50 hover:bg-white/[0.03]',
        )}
      >
        <input ref={inputRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        {file ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex w-full items-center gap-3 text-left">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', file.name.endsWith('.pdf') ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300')}>
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              {busy && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all" style={{ width: `${stage === 'processing' ? 100 : progress}%` }} />
                </div>
              )}
              {stage === 'processing' && <p className="mt-1 text-xs text-primary-300">Extracting text and building search chunks…</p>}
              {stage === 'done' && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Processed
                </p>
              )}
            </div>
            {!busy && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Remove file">
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <FileUp className="mb-3 h-8 w-8 text-primary-300" />
            <p className="text-sm font-medium text-white">Drag &amp; drop your notes here</p>
            <p className="mt-1 text-xs text-slate-400">or click to browse · PDF / TXT up to {MAX_MB} MB</p>
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Subject" name="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
          {subjects.length === 0 && <option value="">Create a subject first</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Unit (optional)" name="unitId" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">Whole subject</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Title (optional)" name="title" placeholder="e.g. DBMS Unit 3 - Normalization" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={busy} disabled={!file || !subjectId} icon={<UploadCloud className="h-4 w-4" />}>
          {stage === 'processing' ? 'Processing…' : 'Upload & process'}
        </Button>
      </div>
    </form>
  );
}
