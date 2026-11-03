import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

/**
 * Press-and-hold wax seal that replaces the submit button.
 *
 * - Pointer (mouse / touch / pen): hold for `holdMs`, a ring fills, the wax thumps down, then
 *   `onComplete` fires. Letting go early cancels. A quick tap nudges the hint instead.
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

/** Irregular wax edge: a closed smooth path through a ring of slightly uneven points. */
function waxBlob(cx: number, cy: number, r: number, lobes: number): string {
  const n = lobes * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (i % 2 === 0 ? 3.2 : -2.4) + Math.sin(i * 2.3) * 1.2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
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
const WAX_PATH = waxBlob(60, 60, 41, 9);

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
    vibrate([14, 40, 26]);
    // Let the thump land before the screen changes.
    doneTimer.current = window.setTimeout(() => cbs.current.onComplete(), 420);
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
        style={{ ['--hold' as string]: `${holdMs}ms` }}
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
          </defs>
          <circle className="stamp-track" cx="60" cy="60" r={RING_R} />
          <circle className="stamp-ring" cx="60" cy="60" r={RING_R} />
          <circle className="stamp-splash" cx="60" cy="60" r="44" />
          <g className="stamp-wax">
            <path d={WAX_PATH} fill="#3a0a06" opacity="0.35" transform="translate(1.5 2.5)" />
            <path d={WAX_PATH} fill="url(#wax-fill)" />
            <circle cx="60" cy="60" r="31" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.6" transform="translate(0.8 0.8)" />
            <circle cx="60" cy="60" r="31" fill="none" stroke="#ffb9a8" strokeOpacity="0.32" strokeWidth="1.4" />
            <text x="60" y="73.5" textAnchor="middle" className="stamp-glyph" fill="#000" opacity="0.38" transform="translate(1 1)">
              B
            </text>
            <text x="60" y="73.5" textAnchor="middle" className="stamp-glyph" fill="#ffb9a8" opacity="0.4" transform="translate(-0.7 -0.7)">
              B
            </text>
            <text x="60" y="73.5" textAnchor="middle" className="stamp-glyph" fill="#6e120b">
              B
            </text>
          </g>
        </svg>
      </button>
      <span className="stamp-label" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}