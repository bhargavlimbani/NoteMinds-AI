import { Link } from 'react-router-dom';
import { BookOpen, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { TiltCard } from '../ui/TiltCard';
import { ProgressBar } from '../ui/ProgressBar';
import { colorOf } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { SubjectSummary } from '../../types';

interface Props {
  subject: SubjectSummary;
  onEdit: (subject: SubjectSummary) => void;
  onDelete: (subject: SubjectSummary) => void;
}

export function SubjectCard({ subject, onEdit, onDelete }: Props) {
  const color = colorOf(subject.color);
  const [menu, setMenu] = useState(false);

  return (
    <TiltCard className="group h-full">
      <div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-30 blur-2xl transition group-hover:opacity-60', color.gradient)} />
      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/subjects/${subject.id}`} className="flex items-center gap-3">
            <div className={cn('card-3d-layer flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', color.gradient)}>
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white group-hover:text-primary-200">{subject.name}</h3>
              <p className={cn('text-xs font-medium', color.text)}>{subject.code || 'No code'}</p>
            </div>
          </Link>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100" aria-label="Subject menu">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menu && (
              <div className="glass-strong absolute right-0 z-20 mt-1 w-36 p-1" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { setMenu(false); onEdit(subject); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => { setMenu(false); onDelete(subject); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-400">{subject.description || 'No description yet.'}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {subject.unitCount} units</span>
          <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {subject.noteCount} notes</span>
        </div>

        <div className="mt-auto pt-4">
          <ProgressBar value={subject.progress} showLabel size="sm" />
        </div>
      </div>
    </TiltCard>
  );
}
