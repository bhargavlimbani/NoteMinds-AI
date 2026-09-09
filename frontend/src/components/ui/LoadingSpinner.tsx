import { cn } from '../../utils/cn';

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' };
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-white/10 border-t-primary-400 border-r-accent-400', sizes[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-slate-400">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary-500/20" />
        <LoadingSpinner size="lg" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
