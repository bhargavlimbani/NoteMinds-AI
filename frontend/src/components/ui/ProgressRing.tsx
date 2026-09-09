import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { progressTone } from '../../utils/format';

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
  tone?: 'auto' | 'gradient';
}

const toneHex = { rose: '#fb7185', amber: '#fbbf24', emerald: '#34d399' };

export function ProgressRing({ value, size = 112, stroke = 10, label, className, tone = 'auto' }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;
  const color = tone === 'gradient' ? 'url(#ringGradient)' : toneHex[progressTone(safe)];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-white">{safe}%</span>
        {label && <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
