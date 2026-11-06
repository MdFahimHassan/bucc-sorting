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
import { preloadCrests } from './lib/preload';
import { loadData, lookupParticipant, type LookupResult } from './lib/lookup';
import { useWandTrail } from './lib/useWandTrail';
import { CeremonyScreen } from './screens/CeremonyScreen';
import { IdEntryScreen } from './screens/IdEntryScreen';
import { IntroScreen } from './screens/IntroScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import './styles/transitions.css';

type Phase = 'intro' | 'id' | 'ceremony' | 'notfound';
type Found = Extract<LookupResult, { status: 'found' }>;
type ExitKind = 'pan' | 'dusk' | 'quick' | 'fade' | 'reduced';
interface Leaving {
  phase: Phase;
  kind: ExitKind;
}

const KIND_MS: Record<ExitKind, number> = {
  pan: PAN_MS,
  dusk: DUSK_IN_MS,
  quick: QUICK_MS,
  fade: FADE_MS,
  reduced: REDUCED_FADE_MS,
};

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

  useEffect(() => {
    void loadData()
      .catch(() => undefined)
      .finally(() => void preloadCrests());
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest('button') : null;
      if (el && !el.disabled && !el.matches('.intro-cta, .stamp')) sfx('tick');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

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