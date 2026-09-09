import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Tone = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';

const tones: Record<Tone, string> = {
  violet: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
  cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
  emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  blue: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  slate: 'border-white/10 bg-white/5 text-slate-300',
};

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}
