import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ErrorBoundary, rememberResult } from './components/ErrorBoundary';
import { ParticleLayer } from './components/ParticleLayer';
import { SoundToggle } from './components/SoundToggle';
import {
  DIP_IN_MS,
  DIP_OUT_MS,
  DUSK_IN_MS,
  FADE_MS,
  PAN_MS,
  QUICK_MS,
  REDUCED_FADE_MS,
  prefersReducedMotion,
} from './lib/motion';
import { particles } from './lib/particles';
import { preloadAudio, sfx } from './lib/sound';
import { loadData, lookupParticipant, type LookupResult } from './lib/lookup';
import { useWandTrail } from './lib/useWandTrail';
import { CeremonyScreen } from './screens/CeremonyScreen';
import { IdEntryScreen } from './screens/IdEntryScreen';
import { IntroScreen } from './screens/IntroScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import './styles/transitions.css';

type Phase = 'intro' | 'id' | 'ceremony' | 'notfound';
type Found = Extract<LookupResult, { status: 'found' }>;
/**
 * How the old screen leaves and the new one arrives.
 *   pan      title scene to scroll scene: the camera follows the owl (transitions.css)
 *   dusk     scroll to ceremony: the scroll has already closed and gone dark (closeScroll.ts), the
 *            ceremony fades up out of that dark
 *   quick    to and from the not-found screen: a short, light crossfade
 *   fade     everything else: the old screen fades out underneath while the new one fades in
 *   reduced  prefers-reduced-motion: a plain short crossfade, nothing moves
 */
type ExitKind = 'pan' | 'dusk' | 'quick' | 'fade' | 'reduced';
interface Leaving {
  phase: Phase;
  kind: ExitKind;
}

/** How long each kind lasts (also drives --fade-ms for the CSS). */
const KIND_MS: Record<ExitKind, number> = {
  pan: PAN_MS,
  dusk: DUSK_IN_MS,
  quick: QUICK_MS,
  fade: FADE_MS,
  reduced: REDUCED_FADE_MS,
};

/** Replaying dips to black and back, like the scroll closing, instead of swapping the stage in one frame. */
type Dip = 'off' | 'in' | 'out';

const WRONG_TRIES_BEFORE_PAUSE = 3;
const PAUSE_MS = 4000;

export function App() {
  return (
    <ErrorBoundary>
      <Main />
    </ErrorBoundary>
  );
}

function Main() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [lookup, setLookup] = useState<Promise<LookupResult> | null>(null);
  const [ceremonyKey, setCeremonyKey] = useState(0);
  const [failure, setFailure] = useState<LookupResult | null>(null);
  const [lastId, setLastId] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [dip, setDip] = useState<Dip>('off');
  const dipTimer = useRef<number | undefined>(undefined);
  const wrongTries = useRef(0);
  const lastFound = useRef<Found | null>(null);
  const phaseRef = useRef<Phase>('intro');
  const leaveTimer = useRef<number | undefined>(undefined);

  useWandTrail();

  // Warm the (tiny) encrypted list while the intro plays. Failure is retried on submit.
  useEffect(() => {
    void loadData().catch(() => undefined);
  }, []);

  // A soft tick on every button. The title's own button and the wax seal have their own sounds.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest('button') : null;
      if (el && !el.disabled && !el.matches('.intro-cta, .stamp')) sfx('tick');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  /**
   * Change screen. The old screen stays mounted (inert, taken out of the layout) while it animates
   * out, and the new one animates in over it, instead of the old one vanishing in the same frame.
   */
  const go = useCallback((next: Phase) => {
    const from = phaseRef.current;
    if (from === next) return;
    phaseRef.current = next;
    window.clearTimeout(leaveTimer.current);
    const kind: ExitKind = prefersReducedMotion()
      ? 'reduced'
      : from === 'intro' && next === 'id'
        ? 'pan'
        : from === 'id' && next === 'ceremony'
          ? 'dusk'
          : from === 'notfound' || next === 'notfound'
            ? 'quick'
            : 'fade';
    if (kind === 'pan') {
      // Lock sideways overflow right now, before the first pan frame, not a render later.
      document.documentElement.classList.add('is-panning');
      // The title turns to embers as the camera sweeps away from it.
      [0.25, 0.5, 0.75].forEach((x, i) => {
        window.setTimeout(() => particles.burst(window.innerWidth * x, window.innerHeight * 0.45, '#f3d98c', 14), i * 130);
      });
    }
    setLeaving({ phase: from, kind });
    setPhase(next);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), KIND_MS[kind] + 60);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(leaveTimer.current);
      window.clearTimeout(dipTimer.current);
    },
    [],
  );

  // The pan briefly parks things off to the right; never let that show a horizontal scrollbar.
  const panning = leaving?.kind === 'pan';
  useEffect(() => {
    if (!panning) return;
    const root = document.documentElement;
    root.classList.add('is-panning');
    return () => root.classList.remove('is-panning');
  }, [panning]);

  const handleSubmit = useCallback(
    (rawId: string) => {
      setLastId(rawId);
      setLookup(lookupParticipant(rawId));
      setCeremonyKey((k) => k + 1);
      go('ceremony');
    },
    [go],
  );

  const handleFound = useCallback((r: Found) => {
    lastFound.current = r;
    rememberResult(r.person.name, r.person.dept);
    wrongTries.current = 0;
    setLockedUntil(null);
  }, []);

  const handleFail = useCallback((r: LookupResult) => {
    if (r.status === 'not-found') {
      wrongTries.current += 1;
      if (wrongTries.current >= WRONG_TRIES_BEFORE_PAUSE) {
        setLockedUntil(Date.now() + PAUSE_MS);
        wrongTries.current = 0;
      }
    }
    setFailure(r);
    go('notfound');
  }, [go]);

  /** Replaying skips nothing: the full ceremony runs again on the already-found result. */
  const handleReplay = useCallback(() => {
    const found = lastFound.current;
    if (!found || dipTimer.current !== undefined) return;
    const restart = () => {
      setLookup(Promise.resolve(found));
      setCeremonyKey((k) => k + 1);
    };
    if (prefersReducedMotion()) {
      restart();
      return;
    }
    // Dip to black, restart the ceremony while nothing shows, come back up (its entrance plays again).
    setDip('in');
    dipTimer.current = window.setTimeout(() => {
      restart();
      setDip('out');
      dipTimer.current = window.setTimeout(() => {
        setDip('off');
        dipTimer.current = undefined;
      }, DIP_OUT_MS + 40);
    }, DIP_IN_MS);
  }, []);

  const handleAnotherId = useCallback(() => {
    setLastId('');
    go('id');
  }, [go]);

  const screenFor = (p: Phase) => {
    switch (p) {
      case 'intro':
        return (
          <IntroScreen
            onEnter={() => {
              // First tap: fetch the (tiny) audio chunk in the background. Sound stays off until toggled.
              preloadAudio();
              sfx('swoosh');
              go('id');
            }}
          />
        );
      case 'id':
        return <IdEntryScreen onSubmit={handleSubmit} lockedUntil={lockedUntil} initialValue={lastId} />;
      case 'ceremony':
        return lookup ? (
          <CeremonyScreen
            key={ceremonyKey}
            lookup={lookup}
            onFound={handleFound}
            onFail={handleFail}
            onReplay={handleReplay}
            onAnotherId={handleAnotherId}
          />
        ) : null;
      case 'notfound':
        return <NotFoundScreen failure={failure} onRetry={() => go('id')} />;
    }
  };

  const timing = {
    '--pan-ms': `${PAN_MS}ms`,
    '--fade-ms': `${KIND_MS[leaving?.kind ?? 'fade']}ms`,
    '--dip-in-ms': `${DIP_IN_MS}ms`,
    '--dip-out-ms': `${DIP_OUT_MS}ms`,
  } as CSSProperties;

  return (
    <>
      <ParticleLayer />
      <main className="app-main" style={timing}>
        <SoundToggle />
        {leaving && (
          <div
            key={leaving.phase}
            className={`phase-layer phase-leave phase-${leaving.kind}-leave`}
            data-phase={leaving.phase}
            inert
            aria-hidden="true"
          >
            {screenFor(leaving.phase)}
          </div>
        )}
        <div
          key={phase}
          className={`phase-layer${leaving ? ` phase-${panning ? 'pan' : 'soft'}-enter phase-${leaving.kind}-enter` : ''}`}
          data-phase={phase}
          inert={panning}
        >
          {screenFor(phase)}
        </div>
      </main>
      {dip !== 'off' && <div className={`dip dip-${dip}`} style={timing} aria-hidden="true" />}
      <div className="film-layer" aria-hidden="true" />
    </>
  );
}