import type { ReactNode } from 'react';
import { useTilt } from '../../hooks/useTilt';
import { cn } from '../../utils/cn';

interface Props {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  onClick?: () => void;
}

/** Glass card with a mouse-tracking 3D tilt and light glare. */
export function TiltCard({ children, className, intensity = 8, glare = true, onClick }: Props) {
  const tilt = useTilt<HTMLDivElement>({ max: intensity, scale: 1.015 });
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      onClick={onClick}
      className={cn('glass card-3d overflow-hidden', onClick && 'cursor-pointer', className)}
    >
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: tilt.glare.active ? 1 : 0,
            background: `radial-gradient(600px circle at ${tilt.glare.x}% ${tilt.glare.y}%, rgba(255,255,255,0.12), transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-0 h-full">{children}</div>
    </div>
  );
}
