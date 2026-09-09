import { useCallback, useRef, useState, type MouseEvent } from 'react';

interface TiltOptions {
  max?: number; // max rotation in degrees
  scale?: number;
  perspective?: number;
}

/**
 * Mouse-driven 3D tilt effect. Attach `ref` and the handlers to an element
 * with the `card-3d` class; `glare` gives the position for a highlight overlay.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({ max = 10, scale = 1.02, perspective = 1000 }: TiltOptions = {}) {
  const ref = useRef<T | null>(null);
  const [glare, setGlare] = useState({ x: 50, y: 50, active: false });

  const onMouseMove = useCallback(
    (event: MouseEvent<T>) => {
      const el = ref.current;
      if (!el || window.matchMedia('(hover: none)').matches) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * max * 2;
      const rotateX = (0.5 - py) * max * 2;
      el.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      setGlare({ x: px * 100, y: py * 100, active: true });
    },
    [max, scale, perspective],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    setGlare((g) => ({ ...g, active: false }));
  }, [perspective]);

  return { ref, glare, onMouseMove, onMouseLeave };
}
