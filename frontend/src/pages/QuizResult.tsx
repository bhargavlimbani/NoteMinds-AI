import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, MessageSquareText, RotateCcw, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { quizApi } from '../services/quiz.service';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Badge } from '../components/ui/Badge';
import { QuizQuestionCard } from '../components/quiz/QuizQuestionCard';
import { difficultyMeta, formatDateTime, formatDuration } from '../utils/format';

function verdict(percentage: number) {
  if (percentage >= 90) return { title: 'Outstanding!', text: 'You have mastered this unit. Keep the momentum going.' };
  if (percentage >= 70) return { title: 'Great work!', text: 'Solid understanding. Review the wrong answers to make it perfect.' };
  if (percentage >= 40) return { title: 'Good effort', text: 'You know the basics - revise the explanations below and retry.' };
  return { title: 'Keep going', text: 'This unit needs more attention. Read your notes and ask the AI to explain the tricky parts.' };
}

export default function QuizResultPage() {
  const { resultId = '' } = useParams();
  const { data: result, loading, error } = useFetch(() => quizApi.result(resultId), [resultId]);

  if (loading && !result) return <PageLoader label="Loading result…" />;
  if (error || !result) return <EmptyState title="Result not found" description={error ?? undefined} action={<Link to="/quiz" className="btn-primary">Back to quizzes</Link>} />;

  const v = verdict(result.percentage);
  const wrong = result.questions.filter((q) => !q.isCorrect);

  return (
    <div className="space-y-6">
      <Link to="/quiz" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Quizzes
      </Link>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong gradient-border relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <ProgressRing value={result.percentage} size={150} stroke={12} label="score" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">Quiz result</p>
              <Badge className={difficultyMeta[result.difficulty].className}>{difficultyMeta[result.difficulty].label}</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{v.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{v.text}</p>
            <p className="mt-3 text-sm text-slate-300">
              <span className="font-semibold text-white">{result.title}</span> · {result.subject.name}
              {result.unit ? ` · ${result.unit.name}` : ''} · {formatDateTime(result.createdAt)}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: CheckCircle2, label: 'Correct', value: result.score, className: 'text-emerald-300' },
                { icon: XCircle, label: 'Wrong', value: result.total - result.score, className: 'text-rose-300' },
                { icon: Clock3, label: 'Time', value: formatDuration(result.timeTakenSec), className: 'text-accent-300' },
                { icon: TrendingUp, label: 'Unit progress', value: result.unitCompletion !== null ? `${result.unitCompletion}%` : '—', className: 'text-primary-300' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <s.icon className={`h-4 w-4 ${s.className}`} />
                  <p className="mt-1 font-display text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/quiz/${result.quizId}`} className="btn-primary text-sm">
                <RotateCcw className="h-4 w-4" /> Retry quiz
              </Link>
              <Link to="/chat" className="btn-secondary text-sm">
                <MessageSquareText className="h-4 w-4" /> Ask AI to explain
              </Link>
              <Link to="/recommendations" className="btn-secondary text-sm">
                <Sparkles className="h-4 w-4" /> What next?
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {wrong.length > 0 && (
        <div className="glass flex items-start gap-3 border-amber-400/30 p-4">
          <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Focus areas:</span> review the {wrong.length} question{wrong.length === 1 ? '' : 's'} you missed below - each one includes an explanation.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {result.questions.map((q, i) => (
          <QuizQuestionCard key={q.questionId} question={q} index={i} selected={q.selected} graded={q} />
        ))}
      </div>
    </div>
  );
}
