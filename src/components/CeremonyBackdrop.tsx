import { useMemo } from 'react';
import { isCompactDevice } from '../lib/motion';
import { EnchantedBackdrop, mulberry } from './EnchantedBackdrop';

/**
 * Backdrop for the sorting + reveal screen. Same night sky as the landing scene (so the two feel
 * like one world) but without the moon, owl and castle, which would compete with the Patronus.
 *
 * Extra layers, all animated with transform/opacity only:
 * - floating candles at the left and right edges (the Great Hall's signature),
 * - `.cm-wash`: a soft wash in the department colour (--glow), faded in by the reveal,
 * - `.cm-vignette`: closes in while the Hat deliberates, eases off at the reveal,
 * - `.cm-scrim`: keeps the text at the bottom readable once the scene gets brighter.
 * CeremonyScreen drives wash/vignette with GSAP by class name.
 */

interface Candle {
  left: number;
  top: number;
  h: number;
  dur: number;
  delay: number;
  rise: number;
  flick: number;
}

function makeCandles(n: number): Candle[] {
  const r = mulberry(77);
  const list: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const rightSide = i % 2 === 1;
    list.push({
      // Edges only, so they never sit behind the name or the patronus.
      left: rightSide ? 76 + r() * 18 : 6 + r() * 18,
      top: 4 + r() * 46,
      h: 20 + r() * 14,
      dur: 6 + r() * 5,
      delay: -r() * 10,
      rise: 8 + r() * 10,
      flick: 0.9 + r() * 0.8,
    });
  }
  return list;
}

export function CeremonyBackdrop() {
  const compact = isCompactDevice();
  const candles = useMemo(() => makeCandles(compact ? 6 : 10), [compact]);

  return (
    <EnchantedBackdrop variant="ceremony">
      <div className="cm-wash" />
      {candles.map((c, i) => (
        <span
          key={i}
          className="cm-candle"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            height: `${c.h}px`,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
            ['--rise' as string]: `${c.rise}px`,
          }}
        >
          <i className="cm-flame" style={{ animationDuration: `${c.flick}s` }} />
        </span>
      ))}
      <div className="cm-vignette" />
      <div className="cm-scrim" />
    </EnchantedBackdrop>
  );
}