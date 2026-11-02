import { useEffect } from 'react';
import { HatIcon } from '../components/HatIcon';
import type { LookupResult } from '../lib/lookup';
import { particles } from '../lib/particles';

interface Props {
  failure: LookupResult | null;
  onRetry: () => void;
}

export function NotFoundScreen({ failure, onRetry }: Props) {
  useEffect(() => {
    particles.setEmbers(0.2);
  }, []);

  const problem = failure?.status === 'error';
  return (
    <div className="screen notfound screen-in" data-screen="notfound">
      <div className="notfound-inner" role="alert">
        <HatIcon className="notfound-hat" />
        {problem ? (
          <>
            <h1 className="notfound-title">The list would not open.</h1>
            <p className="notfound-body">
              Check your connection and try again. If it keeps happening, please see a Prefect
              (volunteer).
            </p>
          </>
        ) : (
          <>
            <h1 className="notfound-title">The Sorting Hat cannot find you.</h1>
            <p className="notfound-body">Please see a Prefect (volunteer).</p>
          </>
        )}
        <button type="button" className="btn-gold press" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
