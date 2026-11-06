import { useMemo } from 'react';
import { mulberry } from './EnchantedBackdrop';

const WALL = 'url(#cs-wall)';
const ROOF = 'url(#cs-roof)';
const RIM = '#8aa0e6';
const BASE_Y = 112;

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
}

const lancet = ({ x, y, w, h }: Win) =>
  `M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z`;

function Spire({ x, w, y, h, flag = false }: { x: number; w: number; y: number; h: number; flag?: boolean }) {
  const cx = x + w / 2;
  const o = 1.8;
  return (
    <g>
      <path
        d={`M${x - o} ${y}Q${cx - w * 0.12} ${y - h * 0.55} ${cx} ${y - h}Q${cx + w * 0.12} ${y - h * 0.55} ${x + w + o} ${y}z`}
        fill={ROOF}
      />
      <path
        d={`M${cx} ${y - h}Q${cx + w * 0.12} ${y - h * 0.55} ${x + w + o} ${y}`}
        stroke={RIM}
        strokeWidth=".55"
        opacity=".55"
        fill="none"
      />
      <path d={`M${cx} ${y - h}V${y - h - 4}`} stroke="#0a0e20" strokeWidth=".8" />
      {flag && <path d={`M${cx} ${y - h - 4}l5 1.2-5 1.4z`} fill="#0a0e20" />}
    </g>
  );
}

function Battlements({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const n = Math.max(2, Math.round((x2 - x1) / 4.2));
  const step = (x2 - x1) / n;
  const d: string[] = [];
  for (let i = 0; i < n; i += 2) d.push(`M${(x1 + i * step).toFixed(2)} ${y}h${step.toFixed(2)}v-2.6h-${step.toFixed(2)}z`);
  return <path d={d.join('')} fill={WALL} />;
}

function Tower({
  x,
  w,
  top,
  roof,
  flag,
}: {
  x: number;
  w: number;
  top: number;
  roof?: number;
  flag?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={top} width={w} height={BASE_Y + 4 - top} fill={WALL} />
      <rect x={x - 1.4} y={top - 1} width={w + 2.8} height={2.6} fill={WALL} />
      {roof ? <Spire x={x} w={w} y={top - 1} h={roof} flag={flag} /> : <Battlements x1={x - 1.4} x2={x + w + 1.4} y={top - 1} />}
      <path d={`M${x + w} ${top}V${BASE_Y}`} stroke={RIM} strokeWidth=".6" opacity=".4" />
    </g>
  );
}

function Glow({ win, cls }: { win: Win; cls: string }) {
  const cx = win.x + win.w / 2;
  const cy = win.y + win.h / 2;
  return (
    <g className={`win ${cls}`}>
      <circle cx={cx} cy={cy} r={Math.max(win.w, win.h) * 1.5} fill="url(#cs-halo)" />
      <path d={lancet(win)} fill="#ffcf75" />
      <path d={`M${cx} ${win.y + 1}V${win.y + win.h}`} stroke="#8a4a14" strokeWidth=".35" opacity=".7" />
    </g>
  );
}

function Pines({ from, to, seed, base, fill, hMin, hMax }: { from: number; to: number; seed: number; base: number; fill: string; hMin: number; hMax: number }) {
  const d = useMemo(() => {
    const r = mulberry(seed);
    const out: string[] = [];
    for (let x = from; x < to; x += 3 + r() * 4) {
      const h = hMin + r() * (hMax - hMin);
      const w = h * 0.34;
      out.push(
        `M${(x - w).toFixed(1)} ${base}L${x.toFixed(1)} ${(base - h).toFixed(1)}L${(x + w).toFixed(1)} ${base}z`,
        `M${(x - w * 0.78).toFixed(1)} ${(base - h * 0.35).toFixed(1)}h${(w * 1.56).toFixed(1)}`,
      );
    }
    return out.filter((s) => s.endsWith('z')).join('');
  }, [from, to, seed, base, hMin, hMax]);
  return <path d={d} fill={fill} />;
}

const WINDOWS: Array<{ win: Win; cls: string }> = [
  { win: { x: 198.6, y: 50, w: 3.2, h: 7 }, cls: '' },
  { win: { x: 198.6, y: 62, w: 2.6, h: 5.5 }, cls: 'w3' },
  { win: { x: 126.4, y: 62, w: 3, h: 6.5 }, cls: 'w2' },
  { win: { x: 126.4, y: 78, w: 3, h: 6.5 }, cls: '' },
  { win: { x: 98.6, y: 80, w: 2.8, h: 6 }, cls: 'w3' },
  { win: { x: 70.5, y: 90, w: 2.8, h: 6 }, cls: '' },
  { win: { x: 163, y: 72, w: 3.6, h: 12 }, cls: 'w2' },
  { win: { x: 172, y: 72, w: 3.6, h: 12 }, cls: '' },
  { win: { x: 181, y: 72, w: 3.6, h: 12 }, cls: 'w3' },
  { win: { x: 207, y: 74, w: 3, h: 7 }, cls: 'w2' },
  { win: { x: 217, y: 74, w: 3, h: 7 }, cls: '' },
  { win: { x: 227, y: 74, w: 3, h: 7 }, cls: 'w3' },
  { win: { x: 237, y: 74, w: 3, h: 7 }, cls: 'w2' },
  { win: { x: 207, y: 90, w: 3, h: 7 }, cls: 'w3' },
  { win: { x: 227, y: 90, w: 3, h: 7 }, cls: '' },
  { win: { x: 195, y: 92, w: 3, h: 7 }, cls: 'w2' },
  { win: { x: 270.4, y: 58, w: 3, h: 6.5 }, cls: '' },
  { win: { x: 270.4, y: 76, w: 3, h: 6.5 }, cls: 'w3' },
  { win: { x: 298.6, y: 80, w: 2.8, h: 6 }, cls: 'w2' },
  { win: { x: 328.2, y: 92, w: 2.8, h: 6 }, cls: '' },
  { win: { x: 150, y: 70, w: 2.8, h: 6 }, cls: 'w3' },
  { win: { x: 150, y: 90, w: 2.8, h: 6 }, cls: '' },
];

export function CastleScene({ compact }: { compact: boolean }) {
  const streaks = useMemo(() => {
    const r = mulberry(77);
    return Array.from({ length: compact ? 5 : 9 }, (_, i) => ({
      x: 150 + r() * 150,
      y: BASE_Y + 5 + r() * 28,
      w: 8 + r() * 26,
      dur: 5 + r() * 5,
      delay: -r() * 8,
      cls: i % 2 ? 'cs-sh-a' : 'cs-sh-b',
    }));
  }, [compact]);

  const castle = (
    <g>
      <rect x="54" y="84" width="76" height={BASE_Y + 4 - 84} fill={WALL} />
      <Battlements x1={54} x2={130} y={84} />
      <path
        d="M20 98H66V116H20zM26 116V108a5 5 0 0 1 10 0V116M40 116V108a5 5 0 0 1 10 0V116M54 116V108a5 5 0 0 1 10 0V116"
        fill={WALL}
        fillRule="evenodd"
      />
      <rect x="20" y="95" width="46" height="3.2" fill={WALL} />
      <Tower x={58} w={26} top={86} />
      <Tower x={90} w={18} top={72} roof={22} />
      <Tower x={118} w={20} top={52} roof={30} flag />
      <Tower x={146} w={16} top={62} roof={20} />

      <rect x="160" y="64" width="30" height={BASE_Y + 4 - 64} fill={WALL} />
      <path d="M160 64L175 52L190 64z" fill={ROOF} />
      <path d="M175 52L190 64" stroke={RIM} strokeWidth=".55" opacity=".5" />
      {[161, 170, 179, 188].map((bx) => (
        <path key={bx} d={`M${bx} 70L${bx + 1.6} 70L${bx + 2.6} ${BASE_Y}H${bx - 1}z`} fill={WALL} />
      ))}

      <rect x="192" y="60" width="62" height={BASE_Y + 4 - 60} fill={WALL} />
      <Battlements x1={192} x2={254} y={60} />
      <rect x="200" y="50" width="42" height="11" fill={WALL} />
      <Battlements x1={200} x2={242} y={50} />
      <Tower x={196} w={26} top={42} roof={30} flag />
      <Tower x={236} w={14} top={44} roof={18} />
      <Tower x={252} w={10} top={66} roof={12} />

      <rect x="262" y="82" width="66" height={BASE_Y + 4 - 82} fill={WALL} />
      <Battlements x1={262} x2={328} y={82} />
      <Tower x={264} w={20} top={46} roof={30} />
      <Tower x={292} w={16} top={70} roof={20} flag />
      <Tower x={316} w={24} top={90} />
      <rect x="338" y="100" width="40" height="16" fill={WALL} />
      <Battlements x1={338} x2={378} y={100} />

      {WINDOWS.map((w, i) => (
        <Glow key={i} win={w.win} cls={w.cls} />
      ))}
    </g>
  );

  return (
    <svg className="bd-castle" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="cs-wall" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2={BASE_Y}>
          <stop offset="0" stopColor="#1b2548" />
          <stop offset="0.55" stopColor="#0f1530" />
          <stop offset="1" stopColor="#070a18" />
        </linearGradient>
        <linearGradient id="cs-roof" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="80">
          <stop offset="0" stopColor="#222c54" />
          <stop offset="1" stopColor="#0d1230" />
        </linearGradient>
        <linearGradient id="cs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2347" />
          <stop offset="1" stopColor="#0a0e22" />
        </linearGradient>
        <radialGradient id="cs-halo">
          <stop offset="0" stopColor="#ffbf5e" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffbf5e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10173a" />
          <stop offset="1" stopColor="#04050d" />
        </linearGradient>
        <linearGradient id="cs-reflect-fade" gradientUnits="userSpaceOnUse" x1="0" y1={BASE_Y} x2="0" y2="150">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="cs-reflect-mask">
          <rect x="-700" y={BASE_Y} width="1800" height="40" fill="url(#cs-reflect-fade)" />
        </mask>
        <linearGradient id="cs-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d8fcf" stopOpacity="0" />
          <stop offset="1" stopColor="#7d8fcf" stopOpacity=".22" />
        </linearGradient>
        <pattern id="cs-bricks" width="6" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 3.6H6" stroke="#000" strokeWidth=".35" opacity=".5" />
          <path d="M3 0V3.6" stroke="#000" strokeWidth=".25" opacity=".35" />
        </pattern>
      </defs>

      <path
        d="M-700 130V98C-560 90-430 100-300 92S-120 86 0 94C60 80 100 84 140 78S250 72 300 80C350 70 400 82 470 90C600 82 800 98 1100 92V130z"
        fill="url(#cs-far)"
        opacity=".85"
      />
      <path
        d="M-700 130V98C-560 90-430 100-300 92S-120 86 0 94C60 80 100 84 140 78S250 72 300 80C350 70 400 82 470 90C600 82 800 98 1100 92V130z"
        fill="url(#cs-haze)"
      />
      <Pines from={-60} to={70} seed={3} base={BASE_Y} fill="#070a17" hMin={10} hMax={22} />
      <Pines from={350} to={470} seed={9} base={BASE_Y} fill="#070a17" hMin={10} hMax={22} />

      {castle}

      <path
        d="M-700 118V108L20 106l12-4 10 3 14-5 16 4 18-3 20 2 20-1 24 1 30-2 28 2 26-1 22 2 24-3 16 3 20-4 14 4 22-2 18 3 24 1H1100V124z"
        fill="#06080f"
      />
      <rect x="-700" y={BASE_Y - 10} width="1800" height="14" fill="url(#cs-haze)" />

      <rect x="-700" y={BASE_Y + 1} width="1800" height="40" fill="url(#cs-water)" />
      <g mask="url(#cs-reflect-mask)" opacity=".85">
        <g transform={`translate(0 ${BASE_Y * 2 + 2}) scale(1 -1)`} opacity=".55">
          {castle}
        </g>
      </g>
      {streaks.map((s, i) => (
        <rect key={i} className={`cs-sh ${s.cls}`} x={s.x} y={s.y} width={s.w} height=".5" fill="#c7d4ff" style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
      ))}
    </svg>
  );
}