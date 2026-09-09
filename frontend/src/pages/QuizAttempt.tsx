import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock3, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch';
import { quizApi } from '../services/quiz.service';
import { errorMessage } from '../services/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Modal';
import { QuizQuestionCard } from '../components/quiz/QuizQuestionCard';
import { colorOf, difficultyMeta, formatDuration } from '../utils/format';
import { cn } from '../utils/cn';

export default function QuizAttemptPage() {
  const { quizId = '' } = useParams();
  const navigate = useNavigate();
  const { data: quiz, loading, error } = useFetch(() => quizApi.get(quizId), [quizId]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const total = quiz?.questions.length ?? 0;

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const result = await quizApi.submit(quiz.id, {
        answers: quiz.questions.map((q) => ({ questionId: q.id, selected: answers[q.id] ?? null })),
        timeTakenSec: elapsed,
      });
      toast.success(`Scored ${result.score}/${result.total}`);
      navigate(`/quiz/results/${result.resultId}`, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setSubmitting(false);
      setConfirm(false);
    }
  };

  if (loading && !quiz) return <PageLoader label="Loading quiz…" />;
  if (error || !quiz) return <EmptyState title="Quiz not found" description={error ?? undefined} action={<Link to="/quiz" className="btn-primary">Back to quizzes</Link>} />;

  return (
    <div className="space-y-6">
      <Link to="/quiz" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Quizzes
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong sticky top-20 z-10 flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white', colorOf(quiz.subject.color).gradient)}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{quiz.title}</h1>
          <p className="text-xs text-slate-400">
            {quiz.subject.name}
            {quiz.unit ? ` · ${quiz.unit.name}` : ''} · {total} questions
            {quiz.basedOnNotes && ' · generated from your notes'}
          </p>
        </div>
        <Badge className={difficultyMeta[quiz.difficulty].className}>{difficultyMeta[quiz.difficulty].label}</Badge>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
          <Clock3 className="h-4 w-4 text-accent-300" /> {formatDuration(elapsed)}
        </span>
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> {answered}/{total} answered
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10 sm:w-40">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <QuizQuestionCard key={q.id} question={q} index={i} selected={answers[q.id] ?? null} onSelect={(option) => setAnswers((a) => ({ ...a, [q.id]: option }))} />
        ))}
      </div>

      <div className="glass flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-slate-400">{answered < total ? `${total - answered} question${total - answered === 1 ? '' : 's'} left unanswered` : 'All questions answered. Ready to submit!'}</p>
        <Button size="lg" icon={<Send className="h-4 w-4" />} onClick={() => (answered < total ? setConfirm(true) : submit())} loading={submitting}>
          Submit quiz
        </Button>
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={submit} loading={submitting} title="Submit with unanswered questions?" description={`${total - answered} question(s) will be marked as wrong.`} confirmLabel="Submit anyway" />
    </div>
  );
}
