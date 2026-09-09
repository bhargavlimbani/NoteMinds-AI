import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpenCheck, ChevronDown, Clock3, Layers, Target, Trophy } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { progressApi } from '../services/progress.service';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressRing } from '../components/ui/ProgressRing';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { colorOf, timeAgo } from '../utils/format';
import { cn } from '../utils/cn';
import type { SubjectProgress } from '../types';

function SubjectPanel({ subject, index }: { subject: SubjectProgress; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const color = colorOf(subject.color);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-5 text-left">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', color.gradient)}>
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/subjects/${subject.subjectId}`} className="truncate text-base font-semibold text-white hover:text-primary-200" onClick={(e) => e.stopPropagation()}>
              {subject.subjectName}
            </Link>
            {subject.code && <span className={cn('text-xs', color.text)}>{subject.code}</span>}
          </div>
          <p className="text-xs text-slate-400">
            {subject.units.length} units · quiz average {subject.quizAverage !== null ? `${subject.quizAverage}%` : '—'}
          </p>
          <div className="mt-2 max-w-lg">
            <ProgressBar value={subject.progress} size="sm" />
          </div>
        </div>
        <span className="font-display text-xl font-bold text-white">{subject.progress}%</span>
        <ChevronDown className={cn('h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/10 p-5">
          {subject.units.length === 0 ? (
            <p className="text-sm text-slate-500">No units yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {subject.units.map((u) => (
                <div key={u.unitId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{u.unitName}</p>
                      <p className="text-[11px] text-slate-500">
                        <Clock3 className="inline h-3 w-3" /> studied {timeAgo(u.lastStudiedAt)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-white">{u.completion}%</span>
                  </div>
                  <ProgressBar value={u.completion} size="sm" className="mt-2" />
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <BookOpenCheck className="h-3.5 w-3.5 text-emerald-300" /> {u.topics.completed}/{u.topics.total} topics
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-300" /> {u.quiz.attempts} quiz{u.quiz.attempts === 1 ? '' : 'zes'}
                      {u.quiz.averagePercentage !== null && ` · avg ${u.quiz.averagePercentage}%`}
                    </span>
                  </div>
                  {u.topics.incompleteTopics.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      <Target className="inline h-3 w-3 text-rose-300" /> Pending: {u.topics.incompleteTopics.slice(0, 4).join(', ')}
                      {u.topics.incompleteTopics.length > 4 ? '…' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function ProgressPage() {
  const { data, loading, error } = useFetch(() => progressApi.overview(), []);

  const chartData = (data?.subjects ?? []).map((s) => ({ name: s.code || s.subjectName.slice(0, 12), progress: s.progress, quiz: s.quizAverage ?? 0, color: colorOf(s.color).hex }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analytics" title="Progress tracking" subtitle="Subject, unit and topic completion together with quiz performance - the same data the AI uses through the get_progress tool." />

      {error && <div className="glass p-4 text-sm text-rose-300">{error}</div>}

      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={1} />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="glass-strong flex flex-col items-center justify-center p-6 text-center">
              <ProgressRing value={data.overall} size={150} stroke={12} label="overall" tone="gradient" />
              <p className="mt-4 text-sm text-slate-300">
                <span className="font-semibold text-white">{data.totals.completedTopics}</span> of {data.totals.topics} topics completed
              </p>
              <p className="text-xs text-slate-500">
                {data.totals.completedUnits}/{data.totals.units} units mastered · {data.totals.quizAttempts} quiz attempts
              </p>
            </div>
            <div className="glass p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">Progress vs quiz average by subject</h3>
              {chartData.length === 0 ? (
                <EmptyState title="No subjects yet" description="Create subjects and units to see your analytics." className="border-0 bg-transparent shadow-none" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(13,18,34,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="progress" name="Progress %" radius={[8, 8, 0, 0]}>
                        {chartData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                      <Bar dataKey="quiz" name="Quiz avg %" radius={[8, 8, 0, 0]} fill="rgba(255,255,255,0.25)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Subjects" value={data.totals.subjects} icon={<Layers className="h-5 w-5" />} gradient="from-violet-500 to-fuchsia-500" />
            <StatCard title="Units complete" value={`${data.totals.completedUnits}/${data.totals.units}`} icon={<BookOpenCheck className="h-5 w-5" />} gradient="from-emerald-400 to-teal-500" delay={0.05} />
            <StatCard title="Topics complete" value={`${data.totals.completedTopics}/${data.totals.topics}`} icon={<Target className="h-5 w-5" />} gradient="from-cyan-400 to-blue-500" delay={0.1} />
            <StatCard title="Avg quiz score" value={data.totals.averageQuizScore !== null ? `${data.totals.averageQuizScore}%` : '—'} icon={<Trophy className="h-5 w-5" />} hint={`${data.totals.quizAttempts} attempts`} gradient="from-amber-400 to-orange-500" delay={0.15} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">By subject</h2>
            {data.subjects.length === 0 ? (
              <EmptyState icon={<Layers className="h-7 w-7" />} title="Nothing to track yet" description="Add subjects with units and topics to start tracking your progress." action={<Link to="/subjects" className="btn-primary">Go to subjects</Link>} />
            ) : (
              data.subjects.map((s, i) => <SubjectPanel key={s.subjectId} subject={s} index={i} />)
            )}
          </section>
        </>
      )}
    </div>
  );
}
