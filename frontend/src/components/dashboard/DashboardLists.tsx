import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpenCheck, BrainCircuit, Clock3, FileUp, MessageSquareText, Target, Trophy } from 'lucide-react';
import type { Activity, Dashboard, QuizHistoryItem } from '../../types';
import { colorOf, difficultyMeta, timeAgo } from '../../utils/format';
import { cn } from '../../utils/cn';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';

function SectionTitle({ title, to, cta = 'View all' }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary-300 hover:text-primary-200">
          {cta} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">{text}</p>;
}

export function SubjectProgressList({ subjects }: { subjects: Dashboard['subjects'] }) {
  return (
    <div className="glass p-5">
      <SectionTitle title="Subject progress" to="/progress" />
      {subjects.length === 0 ? (
        <Empty text="No subjects yet. Create your first subject to start tracking." />
      ) : (
        <div className="space-y-4">
          {subjects.slice(0, 6).map((s) => (
            <Link key={s.id} to={`/subjects/${s.id}`} className="block rounded-xl p-2 transition hover:bg-white/5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full bg-gradient-to-br', colorOf(s.color).gradient)} />
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <span className="text-xs text-slate-500">{s.unitCount} units</span>
                </div>
                <span className="text-sm font-semibold text-white">{s.progress}%</span>
              </div>
              <ProgressBar value={s.progress} size="sm" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecentQuizzes({ items }: { items: QuizHistoryItem[] }) {
  return (
    <div className="glass p-5">
      <SectionTitle title="Recent quiz results" to="/quiz" />
      {items.length === 0 ? (
        <Empty text="No quizzes attempted yet. Generate one from your notes!" />
      ) : (
        <ul className="space-y-2.5">
          {items.map((q) => (
            <li key={q.id}>
              <Link to={`/quiz/results/${q.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', q.percentage >= 70 ? 'bg-emerald-500/15 text-emerald-300' : q.percentage >= 40 ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300')}>
                  <Trophy className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{q.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {q.subject.name}
                    {q.unit ? ` · ${q.unit.name}` : ''} · {timeAgo(q.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">
                    {q.score}/{q.total}
                  </p>
                  <Badge tone={q.difficulty === 'EASY' ? 'emerald' : q.difficulty === 'MEDIUM' ? 'amber' : 'rose'} className="px-2 py-0 text-[10px]">
                    {difficultyMeta[q.difficulty].label}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RecentChats({ items }: { items: Dashboard['recentConversations'] }) {
  return (
    <div className="glass p-5">
      <SectionTitle title="Recent AI conversations" to="/chat" cta="Open chat" />
      {items.length === 0 ? (
        <Empty text="Ask the AI anything about your notes to start a conversation." />
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id}>
              <Link to={`/chat/${c.id}`} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-white/5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{c.title}</p>
                  <p className="truncate text-xs text-slate-500">{c.preview ?? 'No messages yet'}</p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] text-slate-500">{timeAgo(c.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RecentlyStudied({ items }: { items: Dashboard['recentlyStudied'] }) {
  return (
    <div className="glass p-5">
      <SectionTitle title="Recently studied" to="/progress" />
      {items.length === 0 ? (
        <Empty text="Your recently studied units will appear here." />
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <li key={u.unitId}>
              <Link to={`/subjects/${u.subjectId}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', colorOf(u.subjectColor).gradient)}>
                  <BookOpenCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{u.unitName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {u.subjectName} · <Clock3 className="inline h-3 w-3" /> {timeAgo(u.lastStudiedAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">{u.completion}%</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const activityIcon: Record<Activity['type'], { icon: typeof FileUp; className: string }> = {
  NOTE_UPLOAD: { icon: FileUp, className: 'bg-cyan-500/15 text-cyan-300' },
  QUIZ_COMPLETED: { icon: BrainCircuit, className: 'bg-amber-500/15 text-amber-300' },
  PROGRESS_UPDATED: { icon: Target, className: 'bg-violet-500/15 text-violet-300' },
  TOPIC_COMPLETED: { icon: BookOpenCheck, className: 'bg-emerald-500/15 text-emerald-300' },
  CHAT: { icon: MessageSquareText, className: 'bg-pink-500/15 text-pink-300' },
};

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <div className="glass p-5">
      <SectionTitle title="Activity" />
      {items.length === 0 ? (
        <Empty text="No activity yet." />
      ) : (
        <ol className="relative space-y-4 border-l border-white/10 pl-5">
          {items.map((a) => {
            const meta = activityIcon[a.type] ?? activityIcon.PROGRESS_UPDATED;
            const Icon = meta.icon;
            return (
              <li key={a.id} className="relative">
                <span className={cn('absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-bg', meta.className)}>
                  <Icon className="h-3 w-3" />
                </span>
                <p className="text-sm text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500">{timeAgo(a.createdAt)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
