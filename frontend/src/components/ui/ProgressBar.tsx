import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { progressTone } from '../../utils/format';

interface Props {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  tone?: 'auto' | 'gradient' | 'rose' | 'amber' | 'emerald';
}

const toneClasses = {
  gradient: 'bg-gradient-to-r from-primary-500 via-indigo-400 to-accent-400',
  rose: 'bg-gradient-to-r from-rose-500 to-pink-400',
  amber: 'bg-gradient-to-r from-amber-500 to-orange-400',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400',
};

export function ProgressBar({ value, size = 'md', showLabel, className, tone = 'auto' }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const resolved = tone === 'auto' ? progressTone(safe) : tone;
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="font-semibold text-white">{safe}%</span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-white/10', heights[size])}>
        <motion.div
          className={cn('h-full rounded-full shadow-[0_0_12px_rgba(139,92,246,0.5)]', toneClasses[resolved])}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
