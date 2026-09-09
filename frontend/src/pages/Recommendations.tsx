import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight, BrainCircuit, Clock3, Database, MessageSquareText, RefreshCw, Sparkles, Target, Trophy, Wrench } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { recommendationApi } from '../services/progress.service';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { TiltCard } from '../components/ui/TiltCard';
import { Badge } from '../components/ui/Badge';
import { colorOf, timeAgo } from '../utils/format';
import { cn } from '../utils/cn';

export default function RecommendationsPage() {
  const { data, loading, error, reload } = useFetch(() => recommendationApi.get(true), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personalised"
        title="What should I study next?"
        subtitle="The AI reads your progress through the MCP get_progress tool, ranks weak units and explains the plan."
        actions={
          <Button variant="secondary" icon={<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && <div className="glass p-4 text-sm text-rose-300">{error}</div>}

      {loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={6} />
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong gradient-border relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">
                    <Sparkles className="h-4 w-4" /> {data.generatedBy === 'gemini' ? 'Gemini recommendation' : 'Rule-based recommendation'}
                  </span>
                  <Badge tone={data.dataSource === 'mcp' ? 'cyan' : 'slate'}>
                    <Database className="h-3 w-3" /> data via {data.dataSource === 'mcp' ? 'MCP get_progress' : 'direct query'}
                  </Badge>
                </div>
                <div className="chat-markdown mt-4 text-[15px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.summary}</ReactMarkdown>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/chat" className="btn-primary text-sm">
                    <MessageSquareText className="h-4 w-4" /> Discuss with AI
                  </Link>
                  <Link to="/quiz" className="btn-secondary text-sm">
                    <BrainCircuit className="h-4 w-4" /> Take a quiz
                  </Link>
                </div>
                <p className="mt-4 text-[11px] text-slate-500">
                  Generated {timeAgo(data.generatedAt)} · overall progress {data.overall}% · {data.totals.quizAttempts} quiz attempts
                  {data.generatedBy === 'rules' && ' · add GEMINI_API_KEY for AI-written advice'}
                </p>
              </div>
            </motion.div>

            <div className="glass p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                <Wrench className="h-4 w-4 text-accent-300" /> How this was produced
              </h3>
              <ol className="space-y-3 text-sm">
                {[
                  { n: 1, title: 'Backend asks the MCP server', text: `Tool ${data.mcpTool.name} was called through the MCP client (${data.mcpTool.durationMs} ms).` },
                  { n: 2, title: 'PostgreSQL returns your data', text: `${data.totals.subjects} subjects, ${data.totals.units} units, ${data.totals.topics} topics and ${data.totals.quizAttempts} quiz results - only yours.` },
                  { n: 3, title: 'Weak areas are ranked', text: 'Low completion, weak or missing quiz scores, pending topics and stale units push a unit up the list.' },
                  { n: 4, title: data.generatedBy === 'gemini' ? 'Gemini writes the plan' : 'Rules write the plan', text: data.generatedBy === 'gemini' ? 'Gemini receives only the ranked analysis (no raw notes) and writes a personalised summary.' : 'Gemini was not available, so a rule-based summary was used instead.' },
                ].map((s) => (
                  <li key={s.n} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">{s.n}</span>
                    <div>
                      <p className="font-medium text-white">{s.title}</p>
                      <p className="text-xs text-slate-400">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Focus areas</h2>
            {data.focusAreas.length === 0 ? (
              <EmptyState icon={<Target className="h-7 w-7" />} title="Nothing to recommend yet" description="Create subjects with units and topics, upload notes and attempt a quiz to unlock personalised recommendations." action={<Link to="/subjects" className="btn-primary">Create a subject</Link>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.focusAreas.map((area, i) => {
                  const color = colorOf(area.subjectColor);
                  return (
                    <motion.div key={area.unitId} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <TiltCard className="h-full">
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={cn('card-3d-layer flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-bold text-white', color.gradient)}>#{area.priority}</div>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-xs font-semibold', color.text)}>{area.subjectName}</p>
                              <h3 className="truncate text-base font-semibold text-white">{area.unitName}</h3>
                            </div>
                            <span className="font-display text-xl font-bold text-white">{area.completion}%</span>
                          </div>
                          <ProgressBar value={area.completion} size="sm" className="mt-3" />
                          <ul className="mt-3 space-y-1">
                            {area.reasons.map((r) => (
                              <li key={r} className="flex items-start gap-2 text-xs text-slate-300">
                                <Target className="mt-0.5 h-3 w-3 shrink-0 text-rose-300" /> {r}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> {area.quizAverage !== null ? `quiz avg ${area.quizAverage}%` : 'no quiz yet'}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> studied {timeAgo(area.lastStudiedAt)}</span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-primary-200">{area.action}</p>
                            <Link to={`/subjects/${area.subjectId}`} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                              Open <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
