import { useMemo } from 'react';
import { isCompactDevice } from '../lib/motion';

/**
 * The Great Hall at night, built only from transform/opacity animations:
 * star layers (box-shadow dots, one element each), floating candles, drifting mist
 * and a castle silhouette. No canvas, no blur filters, no images.
 */

/** Small seeded PRNG so server/client and re-renders always agree. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starField(count: number, seed: number, maxY: number, color: string): string {
  const r = mulberry(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${(r() * 100).toFixed(1)}vw ${(r() * maxY).toFixed(1)}vh 0 0 ${color}`);
  }
  return out.join(',');
}

interface Candle {
  left: number;
  top: number;
  scale: number;
  delay: number;
  dur: number;
  dim: number;
}

function makeCandles(n: number): Candle[] {
  const r = mulberry(7);
  const list: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const depth = r(); // 0 far, 1 near
    list.push({
      left: ((i + 0.5) / n) * 100 + (r() - 0.5) * 6,
      top: 4 + r() * 34,
      scale: 0.55 + depth * 0.65,
      delay: -r() * 8,
      dur: 6 + r() * 4,
      dim: 0.45 + depth * 0.55,
    });
  }
  return list;
}

export function EnchantedBackdrop() {
  const compact = isCompactDevice();
  const candles = useMemo(() => makeCandles(compact ? 7 : 12), [compact]);
  const starsA = useMemo(() => starField(compact ? 38 : 70, 11, 62, 'rgb(236 230 214 / .8)'), [compact]);
  const starsB = useMemo(() => starField(compact ? 26 : 50, 29, 60, 'rgb(243 217 140 / .75)'), [compact]);

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bd-sky" />
      <div className="bd-stars bd-stars-a" style={{ boxShadow: starsA }} />
      <div className="bd-stars bd-stars-b" style={{ boxShadow: starsB }} />
      <div className="bd-mist bd-mist-a" />
      {!compact && <div className="bd-mist bd-mist-b" />}

      {candles.map((c, i) => (
        <div
          key={i}
          className="candle"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            ['--s' as string]: c.scale,
            ['--dim' as string]: c.dim,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <span className="candle-glow" style={{ animationDelay: `${c.delay}s` }} />
          <span className="candle-flame" style={{ animationDelay: `${c.delay * 0.7}s` }} />
          <span className="candle-wax" />
        </div>
      ))}

      <div className="bd-ground" />
      <svg className="bd-castle" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet">
        <g fill="#080b19">
          {/* far hills */}
          <path d="M0 120V92c40-10 80-6 120-12s90-14 140-6 90 4 140-6v52z" opacity=".7" />
          {/* main keep */}
          <rect x="150" y="62" width="104" height="58" />
          <rect x="164" y="54" width="76" height="10" />
          {/* great tower with spire */}
          <rect x="190" y="34" width="24" height="30" />
          <polygon points="188,34 202,2 216,34" />
          {/* left towers */}
          <rect x="118" y="52" width="22" height="68" />
          <polygon points="116,52 129,22 142,52" />
          <rect x="92" y="72" width="18" height="48" />
          <polygon points="90,72 101,50 112,72" />
          <rect x="60" y="86" width="26" height="34" />
          <rect x="58" y="82" width="30" height="4" />
          {/* right towers */}
          <rect x="262" y="48" width="22" height="72" />
          <polygon points="260,48 273,16 286,48" />
          <rect x="292" y="70" width="18" height="50" />
          <polygon points="290,70 301,46 312,70" />
          <rect x="318" y="84" width="28" height="36" />
          <rect x="316" y="80" width="32" height="4" />
          {/* ground */}
          <path d="M0 108c60-6 110-2 200-4s150 2 200 6v10H0z" />
        </g>
        <g fill="#ffcf75">
          <rect className="win" x="199" y="44" width="2.6" height="5" />
          <rect className="win w2" x="126" y="64" width="2.6" height="5" />
          <rect className="win w3" x="99" y="82" width="2.6" height="5" />
          <rect className="win" x="170" y="74" width="2.6" height="5" />
          <rect className="win w2" x="208" y="78" width="2.6" height="5" />
          <rect className="win w3" x="236" y="72" width="2.6" height="5" />
          <rect className="win" x="270" y="60" width="2.6" height="5" />
          <rect className="win w2" x="298" y="82" width="2.6" height="5" />
          <rect className="win w3" x="328" y="94" width="2.6" height="5" />
          <rect className="win" x="70" y="96" width="2.6" height="5" />
        </g>
      </svg>
    </div>
  );
}