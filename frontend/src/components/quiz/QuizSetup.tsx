import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { quizApi } from '../../services/quiz.service';
import { subjectApi } from '../../services/subject.service';
import { errorMessage } from '../../services/api';
import { Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Difficulty, Quiz, SubjectSummary, Unit } from '../../types';

interface Props {
  subjects: SubjectSummary[];
  defaultSubjectId?: string;
  onGenerated: (quiz: Quiz) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string; className: string }[] = [
  { value: 'EASY', label: 'Easy', hint: 'Definitions & recall', className: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Understanding & application', className: 'border-amber-400/50 bg-amber-500/15 text-amber-200' },
  { value: 'HARD', label: 'Hard', hint: 'Analysis & edge cases', className: 'border-rose-400/50 bg-rose-500/15 text-rose-200' },
];

const STEPS = ['Reading your topics', 'Searching your notes', 'Gemini is writing questions', 'Saving the quiz'];

export function QuizSetup({ subjects, defaultSubjectId, onGenerated }: Props) {
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.id ?? '');
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(defaultSubjectId ?? subjects[0].id);
  }, [subjects, subjectId, defaultSubjectId]);

  useEffect(() => {
    if (!subjectId) return;
    setUnitId('');
    subjectApi.listUnits(subjectId).then(setUnits).catch(() => setUnits([]));
  }, [subjectId]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(timer);
  }, [loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!subjectId) return toast.error('Select a subject first');
    setLoading(true);
    try {
      const quiz = await quizApi.generate({ subjectId, unitId: unitId || null, numberOfQuestions: count, difficulty });
      toast.success(`Quiz ready: ${quiz.questions.length} questions${quiz.basedOnNotes ? ' from your notes' : ''}`);
      onGenerated(quiz);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedUnit = units.find((u) => u.id === unitId);

  return (
    <form onSubmit={submit} className="glass-strong gradient-border relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI quiz generator</h3>
            <p className="text-xs text-slate-400">Gemini builds questions from your notes and topics through the MCP generate_quiz tool</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            {subjects.length === 0 && <option value="">Create a subject first</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Whole subject</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        {selectedUnit && (
          <p className="mt-2 text-xs text-slate-400">
            {selectedUnit.topics.length} topics · {selectedUnit.noteCount} notes · {selectedUnit.completion}% complete
          </p>
        )}

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Number of questions</span>
            <span className="font-display text-lg font-bold text-white">{count}</span>
          </div>
          <input type="range" min={3} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-amber-400" />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>3</span>
            <span>20</span>
          </div>
        </div>

        <div className="mt-5">
          <span className="label">Difficulty</span>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={cn('rounded-xl border px-3 py-2.5 text-left transition', difficulty === d.value ? d.className : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20')}
              >
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="text-[11px] opacity-80">{d.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
            {STEPS.map((s, i) => (
              <div key={s} className={cn('flex items-center gap-2 py-1 text-xs', i < step ? 'text-emerald-300' : i === step ? 'text-white' : 'text-slate-600')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', i < step ? 'bg-emerald-400' : i === step ? 'animate-pulse bg-primary-400' : 'bg-white/10')} />
                {s}
                {i === step && <Sparkles className="h-3 w-3 animate-pulse text-primary-300" />}
              </div>
            ))}
          </motion.div>
        )}

        <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} disabled={!subjectId} icon={<BrainCircuit className="h-5 w-5" />}>
          {loading ? 'Generating…' : `Generate ${count} questions`}
        </Button>
      </div>
    </form>
  );
}
