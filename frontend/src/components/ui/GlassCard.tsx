import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  strong?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

export function GlassCard({ children, className, hover, strong, padding = 'md', ...rest }: Props) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', hover && 'glass-hover', paddings[padding], className)} {...rest}>
      {children}
    </div>
  );
}
