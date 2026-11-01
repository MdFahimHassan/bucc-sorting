import { useCallback, useEffect, useState } from 'react';
import { ParticleLayer } from './components/ParticleLayer';
import { getDepartment } from './config/departments';
import { loadData, lookupParticipant, type LookupResult } from './lib/lookup';
import { useWandTrail } from './lib/useWandTrail';
import { IdEntryScreen } from './screens/IdEntryScreen';
import { IntroScreen } from './screens/IntroScreen';

type Phase = 'intro' | 'id' | 'result';

const WRONG_TRIES_BEFORE_PAUSE = 3;
const PAUSE_MS = 4000;

export function App() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lastId, setLastId] = useState('');
  const [wrongTries, setWrongTries] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useWandTrail();

  // Warm the (tiny) encrypted list while the intro plays. Failure is retried on submit.
  useEffect(() => {
    void loadData().catch(() => undefined);
  }, []);

  const handleSubmit = useCallback(
    async (rawId: string) => {
      setLastId(rawId);
      const r = await lookupParticipant(rawId);
      if (r.status === 'not-found') {
        const n = wrongTries + 1;
        setWrongTries(n);
        if (n >= WRONG_TRIES_BEFORE_PAUSE) setLockedUntil(Date.now() + PAUSE_MS);
      } else if (r.status === 'found') {
        setWrongTries(0);
        setLockedUntil(null);
      }
      setResult(r);
      setPhase('result');
    },
    [wrongTries],
  );

  return (
    <>
      <ParticleLayer />
      {phase === 'intro' && <IntroScreen onEnter={() => setPhase('id')} />}
      {phase === 'id' && (
        <IdEntryScreen onSubmit={handleSubmit} lockedUntil={lockedUntil} initialValue={lastId} />
      )}
      {phase === 'result' && <TempResult result={result} onBack={() => setPhase('id')} />}
      <div className="film-layer" aria-hidden="true" />
    </>
  );
}

/** Step 3 placeholder. Replaced by the sorting, reveal and card screens in Step 4. */
function TempResult({ result, onBack }: { result: LookupResult | null; onBack: () => void }) {
  const dept = result?.status === 'found' ? getDepartment(result.person.dept) : undefined;
  return (
    <div className="screen screen-in" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p aria-live="polite">
          {result?.status === 'found'
            ? `${result.person.name}: ${dept?.name ?? result.person.dept}`
            : 'The Sorting Hat cannot find you. Please see a Prefect (volunteer).'}
        </p>
        <button type="button" className="btn-gold press" onClick={onBack} style={{ marginTop: 24 }}>
          Back
        </button>
      </div>
    </div>
  );
}
