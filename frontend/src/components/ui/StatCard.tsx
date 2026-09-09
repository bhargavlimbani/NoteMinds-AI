import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { TiltCard } from './TiltCard';

interface Props {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  gradient?: string;
  delay?: number;
}

/** Dashboard statistic card with a floating gradient icon. */
export function StatCard({ title, value, icon, hint, gradient = 'from-primary-500 to-accent-500', delay = 0 }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}>
      <TiltCard className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
            {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
          </div>
          <div className={cn('card-3d-layer flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', gradient)}>
            {icon}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
