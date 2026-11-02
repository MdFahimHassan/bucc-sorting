import { useMemo } from 'react';
import { isCompactDevice } from '../lib/motion';

/**
 * The Great Hall at night, built only from transform/opacity animations:
 * star layers (box-shadow dots, one element each), a moon with slow light shafts and
 * drifting dust, an owl that crosses the moon now and then, mist and a castle silhouette.
 * No canvas, no blur filters, no images.
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

interface Mote {
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  peak: number;
}

/** Tiny dust specks that drift up through the moonlight. */
function makeMotes(n: number): Mote[] {
  const r = mulberry(5);
  const list: Mote[] = [];
  for (let i = 0; i < n; i++) {
    list.push({
      left: 28 + r() * 44, // inside the soft middle of the shaft
      top: 8 + r() * 78,
      size: 1.5 + r() * 2,
      dur: 14 + r() * 14,
      delay: -r() * 28,
      dx: (r() - 0.5) * 60,
      peak: 0.35 + r() * 0.5,
    });
  }
  return list;
}

export function EnchantedBackdrop() {
  const compact = isCompactDevice();
  const motes = useMemo(() => makeMotes(compact ? 8 : 16), [compact]);
  const shafts = compact ? ['bd-shaft-a'] : ['bd-shaft-a', 'bd-shaft-b', 'bd-shaft-c'];
  const starsA = useMemo(() => starField(compact ? 38 : 70, 11, 62, 'rgb(236 230 214 / .8)'), [compact]);
  const starsB = useMemo(() => starField(compact ? 26 : 50, 29, 60, 'rgb(243 217 140 / .75)'), [compact]);

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bd-sky" />
      <div className="bd-stars bd-stars-a" style={{ boxShadow: starsA }} />
      <div className="bd-stars bd-stars-b" style={{ boxShadow: starsB }} />
      <div className="bd-mist bd-mist-a" />
      {!compact && <div className="bd-mist bd-mist-b" />}

      {/* Moon, with a faint halo. */}
      <div className="bd-moon">
        <div className="bd-moon-halo" />
        <div className="bd-moon-disc" />
      </div>

      {/* Moonlight shafts falling toward the castle, with dust drifting inside them. */}
      <div className="bd-shafts">
        {shafts.map((cls, si) => (
          <div key={cls} className={`bd-shaft ${cls}`}>
            {motes
              .filter((_, mi) => mi % shafts.length === si)
              .map((m, i) => (
                <span
                  key={i}
                  className="bd-mote"
                  style={{
                    left: `${m.left}%`,
                    top: `${m.top}%`,
                    width: `${m.size}px`,
                    height: `${m.size}px`,
                    animationDuration: `${m.dur}s`,
                    animationDelay: `${m.delay}s`,
                    ['--dx' as string]: `${m.dx}px`,
                    ['--peak' as string]: m.peak,
                  }}
                />
              ))}
          </div>
        ))}
      </div>

      {/* An owl crosses the moon every so often. */}
      <div className="bd-owl">
        <div className="bd-owl-bob">
          <svg viewBox="0 0 64 44" width="100%" height="100%">
            <g fill="#04050c">
              {/* rounded, feathered wings; they flap by scaling Y from the shoulder */}
              <g className="bd-wing">
                <path d="M27 22C20 12 10 9 2 15c3 1 5 3 5 6 3 0 5 2 5 5 3 0 5 1 6 4 4 0 7-1 9-3z" />
              </g>
              <g className="bd-wing">
                <path d="M37 22c7-10 17-13 25-7-3 1-5 3-5 6-3 0-5 2-5 5-3 0-5 1-6 4-4 0-7-1-9-3z" />
              </g>
              {/* short tail, plump body, round head, ear tufts */}
              <path d="M28 36h8l-1 7h-6z" />
              <ellipse cx="32" cy="27" rx="8.5" ry="11.5" />
              <circle cx="32" cy="15" r="8" />
              <path d="M25.5 11 24 3.5l7 4zM38.5 11 40 3.5l-7 4z" />
            </g>
            <circle cx="28.6" cy="15" r="2.6" fill="#ffd27a" opacity=".9" />
            <circle cx="35.4" cy="15" r="2.6" fill="#ffd27a" opacity=".9" />
            <circle cx="28.6" cy="15" r="1.1" fill="#04050c" />
            <circle cx="35.4" cy="15" r="1.1" fill="#04050c" />
          </svg>
        </div>
      </div>

      <div className="bd-ground" />
      <svg className="bd-castle" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax meet">
        <g fill="#080b19">
          {/* far hills */}
          <path d="M-700 120V94L0 92c40-10 80-6 120-12s90-14 140-6 90 4 140-6L1100 88V140H-700z" opacity=".7" />
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
          <path d="M-700 108H0c60-6 110-2 200-4s150 2 200 6h700v20H-700z" />
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