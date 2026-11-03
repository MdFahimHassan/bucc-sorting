import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { LOGO_BOX, LOGO_PATHS } from '../config/buccLogo';

/**
 * Press-and-hold wax seal that replaces the submit button.
 *
 * - Pointer (mouse / touch / pen): the button is a plain blob of wax on the paper. Hold for
 *   `holdMs` while a ring fills around it; when the ring closes, a seal die slams down, flattens
 *   the blob into the stamped club-logo seal and lifts away, then `onComplete` fires. Letting go early
 *   cancels. A quick tap nudges the hint instead.
 * - Keyboard (Enter / Space) and assistive tech (a click with no pointer): activates at once,
 *   because holding a key is a poor ask for people who rely on them. Enter inside the ID field
 *   still submits too (see the form in IdEntryScreen).
 * - `onBeforeHold` runs first and can veto (used to validate the ID so nobody holds for nothing).
 *
 * Progress is a CSS transition on an SVG ring, so no per-frame JS.
 */
type Phase = 'idle' | 'holding' | 'done';

interface Props {
  label: string;
  disabled?: boolean;
  holdMs?: number;
  /** Return false to refuse the hold (e.g. the ID is invalid and an error is now showing). */
  onBeforeHold?: () => boolean;
  onComplete: () => void;
}

/** Ring radius. The matching dash length (2 * PI * 54 = 339.3) lives in .stamp-ring in index.css. */
const RING_R = 54;

/**
 * The slam. Must match --slam in index.css (.stamp-wrap): the die lands at IMPACT of it, and the
 * screen only changes once it has lifted away again.
 */
const SLAM_MS = 1300;
const IMPACT = 0.37;

/** Closed smooth path (quadratic through edge midpoints) around a ring of points. */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % n]!;
    if (i === 0) {
      const pl = pts[n - 1]!;
      d += `M${f((pl[0] + p0[0]) / 2)} ${f((pl[1] + p0[1]) / 2)}`;
    }
    d += ` Q${f(p0[0])} ${f(p0[1])} ${f((p0[0] + p1[0]) / 2)} ${f((p0[1] + p1[1]) / 2)}`;
  }
  return `${d}Z`;
}

/** The pressed seal's edge: a ring of slightly uneven lobes, where the wax squeezed out. */
function waxSeal(cx: number, cy: number, r: number, lobes: number): string {
  const n = lobes * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (i % 2 === 0 ? 3.2 : -2.4) + Math.sin(i * 2.3) * 1.2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return smoothClosed(pts);
}

/** The unpressed drop of wax: smaller, lumpy and lopsided, the way a melted blob settles. */
function waxBlob(cx: number, cy: number, r: number): string {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - 0.4;
    const rr = r + 4.2 * Math.sin(i * 1.9 + 0.6) + 2.6 * Math.cos(i * 3.1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return smoothClosed(pts);
}
const SEAL_PATH = waxSeal(60, 60, 41, 9);
const BLOB_PATH = waxBlob(59, 61, 29);
const BLOB_DOME = waxBlob(58, 59, 22);

/** Logo height inside the seal's inner ring (r = 33), in seal units. */
const LOGO_H = 51;
const LOGO_SCALE = LOGO_H / LOGO_BOX.h;
const LOGO_TRANSFORM = `translate(60 60) scale(${LOGO_SCALE.toFixed(4)}) translate(${-(LOGO_BOX.x + LOGO_BOX.w / 2)} ${-(LOGO_BOX.y + LOGO_BOX.h / 2)})`;

/** The logo centred in the seal; the parent <g> sets the colour. */
function BuccMark() {
  return (
    <g transform={LOGO_TRANSFORM}>
      {LOGO_PATHS.map((p, i) => (
        <path key={i} d={p.d} fillRule={p.evenodd ? 'evenodd' : undefined} />
      ))}
    </g>
  );
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported (iOS Safari): the visuals carry it */
  }
}

export function WaxStamp({ label, disabled = false, holdMs = 850, onBeforeHold, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [nudge, setNudge] = useState(false);
  const phaseRef = useRef<Phase>('idle');
  const holdTimer = useRef<number | undefined>(undefined);
  const doneTimer = useRef<number | undefined>(undefined);
  const nudgeTimer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const cbs = useRef({ onBeforeHold, onComplete });

  useEffect(() => {
    cbs.current = { onBeforeHold, onComplete };
  });

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(doneTimer.current);
      window.clearTimeout(nudgeTimer.current);
    },
    [],
  );

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const finish = () => {
    window.clearTimeout(holdTimer.current);
    go('done');
    // The buzz belongs to the moment the die lands, not the moment the ring closes.
    window.setTimeout(() => vibrate([14, 40, 26]), SLAM_MS * IMPACT);
    // Let the die land and lift before the screen changes.
    doneTimer.current = window.setTimeout(() => cbs.current.onComplete(), SLAM_MS + 80);
  };

  const cancel = () => {
    if (phaseRef.current !== 'holding') return;
    window.clearTimeout(holdTimer.current);
    go('idle');
    if (performance.now() - startedAt.current < 280) {
      setNudge(true);
      window.clearTimeout(nudgeTimer.current);
      nudgeTimer.current = window.setTimeout(() => setNudge(false), 1800);
    }
  };

  const instant = () => {
    if (disabled || phaseRef.current !== 'idle') return;
    if (cbs.current.onBeforeHold?.() === false) return;
    finish();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || phaseRef.current !== 'idle') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (cbs.current.onBeforeHold?.() === false) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; the hold still works without it */
    }
    setNudge(false);
    startedAt.current = performance.now();
    go('holding');
    vibrate(8);
    holdTimer.current = window.setTimeout(finish, holdMs);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); // no synthetic click afterwards
    if (e.repeat) return;
    instant();
  };

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ') e.preventDefault(); // Firefox fires the click on keyup
  };

  // A click that did not come from a real pointer press: screen readers, voice control.
  const onClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) instant();
  };

  const text =
    phase === 'done' ? 'Sealed' : phase === 'holding' ? 'Keep holding' : nudge ? 'Press and hold the seal' : label;

  return (
    <div className="stamp-wrap">
      <button
        type="button"
        className="stamp"
        data-phase={phase}
        data-nudge={nudge || undefined}
        disabled={disabled}
        aria-label="Seal and reveal my department. Press and hold the seal, or press Enter."
        style={{ ['--hold' as string]: `${holdMs}ms`, ['--slam' as string]: `${SLAM_MS}ms` }}
        onPointerDown={onPointerDown}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={onClick}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="wax-fill" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#cf3a2e" />
              <stop offset="0.55" stopColor="#9b1d14" />
              <stop offset="1" stopColor="#5c0e08" />
            </radialGradient>
            <radialGradient id="blob-fill" cx="40%" cy="34%" r="72%">
              <stop offset="0" stopColor="#b82e24" />
              <stop offset="0.55" stopColor="#8e1b13" />
              <stop offset="1" stopColor="#5a0e08" />
            </radialGradient>
            <radialGradient id="die-wood" cx="38%" cy="32%" r="80%">
              <stop offset="0" stopColor="#8a5a33" />
              <stop offset="0.6" stopColor="#5a3820" />
              <stop offset="1" stopColor="#33200f" />
            </radialGradient>
            <radialGradient id="die-top" cx="36%" cy="30%" r="80%">
              <stop offset="0" stopColor="#a8754a" />
              <stop offset="1" stopColor="#5b3a21" />
            </radialGradient>
            <radialGradient id="die-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0.55" stopColor="#1a0a03" stopOpacity="0.55" />
              <stop offset="1" stopColor="#1a0a03" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="stamp-track" cx="60" cy="60" r={RING_R} />
          <circle className="stamp-ring" cx="60" cy="60" r={RING_R} />
          <circle className="stamp-splash" cx="60" cy="60" r="44" />
          <circle className="stamp-splash stamp-splash-2" cx="60" cy="60" r="44" />

          {/* 1. Before: only a blob of wax on the paper. */}
          <g className="stamp-blob">
            <path d={BLOB_PATH} fill="#2a0805" opacity="0.4" transform="translate(2 3.5)" />
            <path d={BLOB_PATH} fill="url(#blob-fill)" />
            <path d={BLOB_PATH} fill="none" stroke="#3d0904" strokeOpacity="0.5" strokeWidth="1.4" />
            <path d={BLOB_DOME} fill="#c9463a" opacity="0.28" />
            <path d="M42 49 Q46 40 56 37.5" stroke="#ffcfc2" strokeOpacity="0.3" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <ellipse cx="72" cy="78" rx="9" ry="4" fill="#3d0904" opacity="0.28" transform="rotate(-28 72 78)" />
          </g>

          {/* 2. After: the pressed seal with the club logo. Hidden until the die lands on it. */}
          <g className="stamp-seal">
            <path d={SEAL_PATH} fill="#3a0a06" opacity="0.35" transform="translate(1.5 2.5)" />
            <path d={SEAL_PATH} fill="url(#wax-fill)" />
            <circle cx="60" cy="60" r="34" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.6" transform="translate(0.8 0.8)" />
            <circle cx="60" cy="60" r="34" fill="none" stroke="#ffb9a8" strokeOpacity="0.32" strokeWidth="1.4" />
            {/* The club logo, pressed in: a dark shadow, a pale lip, then the dark relief on top. */}
            <g transform="translate(0.8 0.8)" fill="#000" opacity="0.4">
              <BuccMark />
            </g>
            <g transform="translate(-0.5 -0.5)" fill="#ffb9a8" opacity="0.4">
              <BuccMark />
            </g>
            <g fill="#6e120b">
              <BuccMark />
            </g>
          </g>

          {/* 3. The seal die, seen from above: it falls toward you, lands, and lifts away. */}
          <g className="stamp-die">
            <circle className="stamp-die-shadow" cx="60" cy="60" r="58" fill="url(#die-shadow)" />
            <circle cx="60" cy="60" r="47" fill="url(#die-wood)" />
            <circle cx="60" cy="60" r="47" fill="none" stroke="#1f1208" strokeOpacity="0.7" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="#c9a24d" strokeWidth="3" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="#fff2c2" strokeOpacity="0.35" strokeWidth="1" transform="translate(-0.8 -0.8)" />
            <circle cx="60" cy="60" r="27" fill="url(#die-top)" />
            <circle cx="60" cy="60" r="27" fill="none" stroke="#2a190c" strokeOpacity="0.55" strokeWidth="1.2" />
            <path d="M42 50 Q46 41 56 38" stroke="#f1d6b0" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      </button>
      <span className="stamp-label" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}