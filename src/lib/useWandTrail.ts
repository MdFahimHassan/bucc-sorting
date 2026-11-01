import { useEffect } from 'react';
import { particles } from './particles';

/** Sparkle trail behind a dragging finger or moving mouse. The engine throttles and caps it. */
export function useWandTrail(): void {
  useEffect(() => {
    const onMove = (e: PointerEvent) => particles.trail(e.clientX, e.clientY);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
}
