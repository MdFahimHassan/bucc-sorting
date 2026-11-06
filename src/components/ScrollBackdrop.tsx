import { useEffect, useMemo } from 'react';
import { isCompactDevice } from '../lib/motion';
import { mulberry } from './EnchantedBackdrop';

/** While mounted, the particle canvas is moved behind the parchment (see `.on-scroll` in index.css). */

interface Ember {
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  rise: number;
  peak: number;
}

function makeEmbers(n: number): Ember[] {
  const r = mulberry(404);
  return Array.from({ length: n }, () => ({
    left: r() * 100,
    top: 30 + r() * 75,
    size: 2 + r() * 3.5,
    dur: 14 + r() * 16,
    delay: -r() * 30,
    dx: (r() - 0.5) * 90,
    rise: 140 + r() * 260,
    peak: 0.3 + r() * 0.5,
  }));
}

export function ScrollBackdrop() {
  const compact = isCompactDevice();
  const embers = useMemo(() => makeEmbers(compact ? 14 : 30), [compact]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('on-scroll');
    return () => root.classList.remove('on-scroll');
  }, []);

  return (
    <div className="backdrop backdrop-fixed sc-atmo" aria-hidden="true">
      <div className="sc-glow" />
      <div className="sc-floor" />
      {embers.map((e, i) => (
        <span
          key={i}
          className="sc-ember"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            boxShadow: `0 0 ${(e.size * 4).toFixed(0)}px ${(e.size * 1.2).toFixed(0)}px rgb(255 170 70 / 0.4)`,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
            ['--dx' as string]: `${e.dx}px`,
            ['--rise' as string]: `${e.rise}px`,
            ['--peak' as string]: e.peak,
          }}
        />
      ))}
      <div className="sc-vignette" />
    </div>
  );
}