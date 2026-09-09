import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, BrainCircuit, FileText, Layers, MessageSquareText, Sparkles, Trophy, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { dashboardApi } from '../services/progress.service';
import { StatCard } from '../components/ui/StatCard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { RecommendationCard } from '../components/dashboard/RecommendationCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { ActivityFeed, RecentChats, RecentQuizzes, RecentlyStudied, SubjectProgressList } from '../components/dashboard/DashboardLists';

const HeroScene = lazy(() => import('../components/three/HeroScene'));

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => dashboardApi.get(), []);

  if (error) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-rose-300">{error}</p>
        <Button className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-20 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">{greeting()}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {user?.name.split(' ')[0]}, <span className="gradient-text">let&apos;s make today count.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Your personalised study workspace: notes, quizzes and progress - all connected to Gemini through the Model Context Protocol.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/chat" className="btn-primary">
                <MessageSquareText className="h-4 w-4" /> Ask the AI
              </Link>
              <Link to="/notes" className="btn-secondary">
                <UploadCloud className="h-4 w-4" /> Upload notes
              </Link>
              <Link to="/quiz" className="btn-secondary">
                <BrainCircuit className="h-4 w-4" /> Take a quiz
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-5">
              {loading || !stats ? (
                <Skeleton className="h-28 w-28 rounded-full" />
              ) : (
                <ProgressRing value={stats.overallProgress} label="overall" tone="gradient" />
              )}
              <div className="space-y-1 text-sm text-slate-300">
                <p>
                  <span className="font-semibold text-white">{stats?.completedTopics ?? 0}</span> of {stats?.totalTopics ?? 0} topics completed
                </p>
                <p>
                  <span className="font-semibold text-white">{stats?.completedUnits ?? 0}</span> of {stats?.totalUnits ?? 0} units mastered
                </p>
                <p>
                  Average quiz score <span className="font-semibold text-white">{stats?.averageQuizScore ?? '—'}{stats?.averageQuizScore !== null && stats ? '%' : ''}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="hidden h-64 lg:block">
            <Suspense fallback={<div className="h-full w-full rounded-3xl bg-white/[0.03]" />}>
              <HeroScene compact />
            </Suspense>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={1} />)
        ) : (
          <>
            <StatCard title="Subjects" value={stats.totalSubjects} icon={<BookOpen className="h-5 w-5" />} hint={`${stats.totalUnits} units in total`} gradient="from-violet-500 to-fuchsia-500" />
            <StatCard title="Notes uploaded" value={stats.totalNotes} icon={<FileText className="h-5 w-5" />} hint="PDF / TXT notes searchable by AI" gradient="from-cyan-400 to-blue-500" delay={0.05} />
            <StatCard title="Quiz attempts" value={stats.quizAttempts} icon={<Trophy className="h-5 w-5" />} hint={stats.averageQuizScore !== null ? `Average ${stats.averageQuizScore}%` : 'No attempts yet'} gradient="from-amber-400 to-orange-500" delay={0.1} />
            <StatCard title="Overall progress" value={`${stats.overallProgress}%`} icon={<Layers className="h-5 w-5" />} hint={`${stats.completedUnits}/${stats.totalUnits} units complete`} gradient="from-emerald-400 to-teal-500" delay={0.15} />
          </>
        )}
      </section>

      {/* Recommendation + chart */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {loading || !data ? <CardSkeleton lines={4} /> : <RecommendationCard focus={data.recommendedNext} />}
        <div className="glass p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">This week&apos;s activity</h3>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" /> activities · quizzes
            </span>
          </div>
          {loading || !data ? <Skeleton className="h-56 w-full" /> : <ActivityChart data={data.weeklyActivity} />}
        </div>
      </section>

      {/* Lists */}
      <section className="grid gap-4 lg:grid-cols-3">
        {loading || !data ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} lines={4} />)
        ) : (
          <>
            <SubjectProgressList subjects={data.subjects} />
            <RecentQuizzes items={data.recentQuizzes} />
            <RecentChats items={data.recentConversations} />
          </>
        )}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {loading || !data ? (
          Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} lines={4} />)
        ) : (
          <>
            <RecentlyStudied items={data.recentlyStudied} />
            <ActivityFeed items={data.recentActivities} />
          </>
        )}
      </section>
    </div>
  );
}
