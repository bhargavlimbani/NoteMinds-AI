import { Eye, FileText, Trash2 } from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { colorOf, formatBytes, timeAgo } from '../../utils/format';
import type { NoteSummary } from '../../types';

interface Props {
  note: NoteSummary;
  onPreview: (note: NoteSummary) => void;
  onDelete: (note: NoteSummary) => void;
}

export function NoteCard({ note, onPreview, onDelete }: Props) {
  const color = colorOf(note.subject.color);
  const isPdf = note.fileType === 'pdf';
  return (
    <TiltCard className="group h-full" intensity={6}>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <div className={cn('card-3d-layer flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', isPdf ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300')}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{note.title}</h3>
            <p className="truncate text-xs text-slate-500">{note.fileName}</p>
          </div>
          <Badge tone={isPdf ? 'rose' : 'cyan'} className="uppercase">{note.fileType}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={cn('chip border-transparent', color.bg, color.text)}>{note.subject.name}</span>
          {note.unit && <span className="chip border-white/10 bg-white/5 text-slate-300">{note.unit.name}</span>}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/[0.04] py-1.5">
            <p className="font-semibold text-white">{note.wordCount.toLocaleString()}</p>
            <p className="text-slate-500">words</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] py-1.5">
            <p className="font-semibold text-white">{note.chunkCount}</p>
            <p className="text-slate-500">chunks</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] py-1.5">
            <p className="font-semibold text-white">{formatBytes(note.fileSize)}</p>
            <p className="text-slate-500">size</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[11px] text-slate-500">Uploaded {timeAgo(note.createdAt)}</span>
          <div className="flex gap-1">
            <button onClick={() => onPreview(note)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Preview">
              <Eye className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(note)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
