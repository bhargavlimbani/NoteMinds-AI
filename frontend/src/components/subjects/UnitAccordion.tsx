import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { topicApi, unitApi } from '../../services/subject.service';
import { progressApi } from '../../services/progress.service';
import { errorMessage } from '../../services/api';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { timeAgo } from '../../utils/format';
import type { Topic, Unit } from '../../types';

interface Props {
  unit: Unit;
  defaultOpen?: boolean;
  onChange: (unit: Unit) => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}

export function UnitAccordion({ unit, defaultOpen = false, onChange, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [newTopic, setNewTopic] = useState('');
  const [adding, setAdding] = useState(false);
  const [slider, setSlider] = useState(unit.completion);
  const [busyTopic, setBusyTopic] = useState<string | null>(null);

  const completedCount = unit.topics.filter((t) => t.completed).length;

  const toggleTopic = async (topic: Topic) => {
    setBusyTopic(topic.id);
    try {
      const res = await topicApi.setCompleted(topic.id, !topic.completed);
      const topics = unit.topics.map((t) => (t.id === topic.id ? res.topic : t));
      onChange({ ...unit, topics, completion: res.unitCompletion, lastStudiedAt: new Date().toISOString() });
      setSlider(res.unitCompletion);
      if (!topic.completed) toast.success(`"${topic.name}" completed`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyTopic(null);
    }
  };

  const removeTopic = async (topic: Topic) => {
    try {
      const res = await topicApi.remove(topic.id);
      onChange({ ...unit, topics: unit.topics.filter((t) => t.id !== topic.id), completion: res.unitCompletion });
      setSlider(res.unitCompletion);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const addTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setAdding(true);
    try {
      const res = await unitApi.addTopic(unit.id, newTopic.trim());
      onChange({ ...unit, topics: [...unit.topics, res.topic], completion: res.unitCompletion });
      setSlider(res.unitCompletion);
      setNewTopic('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const saveSlider = async () => {
    if (slider === unit.completion) return;
    try {
      const res = await progressApi.update({ unitId: unit.id, completion: slider });
      onChange({ ...unit, completion: res.completion, lastStudiedAt: new Date().toISOString() });
      toast.success(`Progress set to ${res.completion}%`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className={cn('glass overflow-hidden transition', open && 'border-primary-400/30')}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 font-display text-sm font-bold text-white ring-1 ring-white/10">
          {unit.order || '•'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">{unit.name}</h3>
            {unit.completion >= 100 && <Badge tone="emerald">Completed</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {completedCount}/{unit.topics.length} topics · {unit.noteCount} notes · studied {timeAgo(unit.lastStudiedAt)}
          </p>
          <div className="mt-2 max-w-md">
            <ProgressBar value={unit.completion} size="sm" />
          </div>
        </div>
        <span className="hidden text-lg font-bold text-white sm:block">{unit.completion}%</span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
              {unit.description && <p className="mb-4 text-sm text-slate-400">{unit.description}</p>}

              <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                <div>
                  <p className="label">Topics checklist</p>
                  {unit.topics.length === 0 && <p className="mb-3 text-sm text-slate-500">No topics yet - add the syllabus points of this unit.</p>}
                  <ul className="space-y-1.5">
                    {unit.topics.map((topic) => (
                      <li key={topic.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5">
                        <button
                          onClick={() => toggleTopic(topic)}
                          disabled={busyTopic === topic.id}
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition',
                            topic.completed ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300' : 'border-white/20 text-transparent hover:border-primary-400/60',
                          )}
                          aria-label={topic.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <span className={cn('flex-1 text-sm', topic.completed ? 'text-slate-500 line-through' : 'text-slate-200')}>{topic.name}</span>
                        <button onClick={() => removeTopic(topic)} className="rounded-md p-1 text-slate-600 opacity-0 transition hover:text-rose-300 group-hover:opacity-100" aria-label="Delete topic">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={addTopic} className="mt-3 flex gap-2">
                    <input className="input" placeholder="Add a topic…" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} maxLength={120} />
                    <button type="submit" className="btn-secondary shrink-0" disabled={adding || !newTopic.trim()}>
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="label">Manual progress</p>
                    <input type="range" min={0} max={100} step={5} value={slider} onChange={(e) => setSlider(Number(e.target.value))} onMouseUp={saveSlider} onTouchEnd={saveSlider} onKeyUp={saveSlider} className="w-full accent-violet-500" />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>0%</span>
                      <span className="font-semibold text-white">{slider}%</span>
                      <span>100%</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Completing topics updates this automatically.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(unit)} className="btn-secondary text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => onDelete(unit)} className="btn-danger text-xs">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <FileText className="h-3.5 w-3.5" /> {unit.noteCount} notes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
