import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, History, Play, Trophy } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { quizApi } from '../services/quiz.service';
import { subjectApi } from '../services/subject.service';
import { PageHeader } from '../components/ui/PageHeader';
import { QuizSetup } from '../components/quiz/QuizSetup';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { colorOf, difficultyMeta, formatDuration, timeAgo } from '../utils/format';
import { cn } from '../utils/cn';

export default function QuizPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const subjects = useFetch(() => subjectApi.list(), []);
  const quizzes = useFetch(() => quizApi.list(), []);
  const history = useFetch(() => quizApi.history(), []);

  const attempts = history.data ?? [];
  const average = attempts.length ? Math.round(attempts.reduce((n, a) => n + a.percentage, 0) / attempts.length) : null;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Practice" title="AI Quiz" subtitle="Generate a quiz from any subject or unit, attempt it, and let your progress update automatically." />

      <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
        <div className="space-y-4">
          <QuizSetup subjects={subjects.data ?? []} defaultSubjectId={params.get('subjectId') ?? undefined} onGenerated={(quiz) => navigate(`/quiz/${quiz.id}`)} />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attempts', value: attempts.length, tone: 'text-primary-300' },
              { label: 'Average', value: average !== null ? `${average}%` : '—', tone: 'text-accent-300' },
              { label: 'Best', value: best !== null ? `${best}%` : '—', tone: 'text-emerald-300' },
            ].map((s) => (
              <div key={s.label} className="glass p-4 text-center">
                <p className={cn('font-display text-2xl font-bold', s.tone)}>{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary-300" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Generated quizzes</h2>
            </div>
            {quizzes.loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <CardSkeleton key={i} lines={2} />
                ))}
              </div>
            ) : (quizzes.data ?? []).length === 0 ? (
              <div className="glass p-6 text-center text-sm text-slate-400">No quizzes yet. Generate your first one on the left.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {(quizzes.data ?? []).slice(0, 8).map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass glass-hover flex items-center gap-3 p-4">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', colorOf(q.subject.color).gradient)}>
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{q.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {q.subject.name}
                        {q.unit ? ` · ${q.unit.name}` : ''} · {q.numberOfQuestions} Qs · {q.attempts} attempt{q.attempts === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Badge className={difficultyMeta[q.difficulty].className}>{difficultyMeta[q.difficulty].label}</Badge>
                    <Link to={`/quiz/${q.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                      <Play className="h-3.5 w-3.5" /> {q.attempts ? 'Retry' : 'Start'}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-accent-300" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Quiz history</h2>
            </div>
            <div className="glass overflow-hidden">
              {history.loading ? (
                <div className="p-5">
                  <CardSkeleton lines={3} />
                </div>
              ) : attempts.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Your attempts and scores will appear here.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Quiz</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{a.title}</p>
                            <p className="text-xs text-slate-500">{a.unit?.name ?? 'Whole subject'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('chip border-transparent', colorOf(a.subject.color).bg, colorOf(a.subject.color).text)}>{a.subject.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 font-semibold', a.percentage >= 70 ? 'text-emerald-300' : a.percentage >= 40 ? 'text-amber-300' : 'text-rose-300')}>
                              <Trophy className="h-3.5 w-3.5" /> {a.score}/{a.total} · {a.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{formatDuration(a.timeTakenSec)}</td>
                          <td className="px-4 py-3 text-slate-400">{timeAgo(a.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/quiz/results/${a.id}`} className="text-xs font-medium text-primary-300 hover:text-primary-200">
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
