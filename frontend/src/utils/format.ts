import type { Difficulty, SubjectColor } from '../types';

export function formatDate(iso: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', options ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(iso);
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export const SUBJECT_COLORS: SubjectColor[] = ['violet', 'blue', 'cyan', 'emerald', 'amber', 'rose', 'orange', 'pink', 'indigo', 'teal'];

interface ColorStyle {
  gradient: string;
  text: string;
  bg: string;
  ring: string;
  hex: string;
}

export const colorStyles: Record<SubjectColor, ColorStyle> = {
  violet: { gradient: 'from-violet-500 to-fuchsia-500', text: 'text-violet-300', bg: 'bg-violet-500/15', ring: 'ring-violet-400/40', hex: '#8b5cf6' },
  blue: { gradient: 'from-blue-500 to-indigo-500', text: 'text-blue-300', bg: 'bg-blue-500/15', ring: 'ring-blue-400/40', hex: '#3b82f6' },
  cyan: { gradient: 'from-cyan-400 to-sky-500', text: 'text-cyan-300', bg: 'bg-cyan-500/15', ring: 'ring-cyan-400/40', hex: '#06b6d4' },
  emerald: { gradient: 'from-emerald-400 to-teal-500', text: 'text-emerald-300', bg: 'bg-emerald-500/15', ring: 'ring-emerald-400/40', hex: '#10b981' },
  amber: { gradient: 'from-amber-400 to-orange-500', text: 'text-amber-300', bg: 'bg-amber-500/15', ring: 'ring-amber-400/40', hex: '#f59e0b' },
  rose: { gradient: 'from-rose-400 to-pink-500', text: 'text-rose-300', bg: 'bg-rose-500/15', ring: 'ring-rose-400/40', hex: '#f43f5e' },
  orange: { gradient: 'from-orange-400 to-red-500', text: 'text-orange-300', bg: 'bg-orange-500/15', ring: 'ring-orange-400/40', hex: '#f97316' },
  pink: { gradient: 'from-pink-400 to-fuchsia-500', text: 'text-pink-300', bg: 'bg-pink-500/15', ring: 'ring-pink-400/40', hex: '#ec4899' },
  indigo: { gradient: 'from-indigo-400 to-violet-500', text: 'text-indigo-300', bg: 'bg-indigo-500/15', ring: 'ring-indigo-400/40', hex: '#6366f1' },
  teal: { gradient: 'from-teal-400 to-cyan-500', text: 'text-teal-300', bg: 'bg-teal-500/15', ring: 'ring-teal-400/40', hex: '#14b8a6' },
};

export function colorOf(color: string | undefined | null): ColorStyle {
  return colorStyles[(color as SubjectColor) ?? 'violet'] ?? colorStyles.violet;
}

export function progressTone(value: number): 'rose' | 'amber' | 'emerald' {
  if (value < 40) return 'rose';
  if (value < 75) return 'amber';
  return 'emerald';
}

export const difficultyMeta: Record<Difficulty, { label: string; className: string }> = {
  EASY: { label: 'Easy', className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  MEDIUM: { label: 'Medium', className: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
  HARD: { label: 'Hard', className: 'border-rose-400/30 bg-rose-500/10 text-rose-300' },
};

export const toolMeta: Record<string, { label: string; description: string }> = {
  search_notes: { label: 'search_notes', description: 'Searched your uploaded notes' },
  get_subjects: { label: 'get_subjects', description: 'Read your subjects' },
  get_topics: { label: 'get_topics', description: 'Read units and topics' },
  get_progress: { label: 'get_progress', description: 'Analysed your progress' },
  save_progress: { label: 'save_progress', description: 'Updated your progress' },
  generate_quiz: { label: 'generate_quiz', description: 'Generated a quiz' },
};
