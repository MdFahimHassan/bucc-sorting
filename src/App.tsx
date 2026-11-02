import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, rememberResult } from './components/ErrorBoundary';
import { ParticleLayer } from './components/ParticleLayer';
import { SoundToggle } from './components/SoundToggle';
import { preloadAudio } from './lib/sound';
import { loadData, lookupParticipant, type LookupResult } from './lib/lookup';
import { useWandTrail } from './lib/useWandTrail';
import { CeremonyScreen } from './screens/CeremonyScreen';
import { IdEntryScreen } from './screens/IdEntryScreen';
import { IntroScreen } from './screens/IntroScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';

type Phase = 'intro' | 'id' | 'ceremony' | 'notfound';
type Found = Extract<LookupResult, { status: 'found' }>;

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
  const wrongTries = useRef(0);
  const lastFound = useRef<Found | null>(null);

  useWandTrail();

  // Warm the (tiny) encrypted list while the intro plays. Failure is retried on submit.
  useEffect(() => {
    void loadData().catch(() => undefined);
  }, []);

  const handleSubmit = useCallback((rawId: string) => {
    setLastId(rawId);
    setLookup(lookupParticipant(rawId));
    setCeremonyKey((k) => k + 1);
    setPhase('ceremony');
  }, []);

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
    setPhase('notfound');
  }, []);

  /** Replaying skips nothing: the full ceremony runs again on the already-found result. */
  const handleReplay = useCallback(() => {
    if (!lastFound.current) return;
    setLookup(Promise.resolve(lastFound.current));
    setCeremonyKey((k) => k + 1);
  }, []);

  const handleAnotherId = useCallback(() => {
    setLastId('');
    setPhase('id');
  }, []);

  return (
    <>
      <ParticleLayer />
      <main>
        {phase === 'intro' && (
          <IntroScreen
            onEnter={() => {
              // First tap: fetch the (tiny) audio chunk in the background. Sound stays off until toggled.
              preloadAudio();
              setPhase('id');
            }}
          />
        )}
        {phase !== 'intro' && <SoundToggle />}
        {phase === 'id' && (
          <IdEntryScreen onSubmit={handleSubmit} lockedUntil={lockedUntil} initialValue={lastId} />
        )}
        {phase === 'ceremony' && lookup && (
          <CeremonyScreen
            key={ceremonyKey}
            lookup={lookup}
            onFound={handleFound}
            onFail={handleFail}
            onReplay={handleReplay}
            onAnotherId={handleAnotherId}
          />
        )}
        {phase === 'notfound' && <NotFoundScreen failure={failure} onRetry={() => setPhase('id')} />}
      </main>
      <div className="film-layer" aria-hidden="true" />
    </>
  );
}
