import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquareText, Sparkles, Target } from 'lucide-react';
import type { FocusArea } from '../../types';
import { colorOf } from '../../utils/format';
import { cn } from '../../utils/cn';
import { ProgressBar } from '../ui/ProgressBar';

export function RecommendationCard({ focus }: { focus: FocusArea | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-strong gradient-border relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">
          <Sparkles className="h-4 w-4" /> AI recommendation
        </div>

        {focus ? (
          <>
            <h3 className="mt-3 text-xl font-bold leading-snug">
              Study <span className="gradient-text">{focus.unitName}</span> next
            </h3>
            <p className={cn('mt-1 text-sm font-medium', colorOf(focus.subjectColor).text)}>{focus.subjectName}</p>
            <ul className="mt-4 space-y-1.5">
              {focus.reasons.slice(0, 3).map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-slate-300">
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
                  {reason}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <ProgressBar value={focus.completion} size="sm" showLabel />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/subjects/${focus.subjectId}`} className="btn-primary text-xs">
                {focus.action} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/chat" className="btn-secondary text-xs">
                <MessageSquareText className="h-3.5 w-3.5" /> Ask AI why
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-3 text-xl font-bold leading-snug">Let&apos;s build your study map</h3>
            <p className="mt-2 text-sm text-slate-400">Add a subject with units and topics, upload notes, and the AI will tell you exactly what to study next.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/subjects" className="btn-primary text-xs">
                Create a subject <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/notes" className="btn-secondary text-xs">
                Upload notes
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
