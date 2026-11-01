import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { STUDENT_ID_EXAMPLE } from '../config/departments';
import { Footprints } from '../components/Footprints';
import { InkText } from '../components/InkText';
import { cryptoSupported } from '../lib/lookup';
import { particles } from '../lib/particles';
import { validateIdInput } from '../lib/validate';

interface Props {
  onSubmit: (rawId: string) => void;
  /** Epoch ms until which submitting is paused (after repeated misses). */
  lockedUntil: number | null;
  initialValue?: string;
}

/** Marauder's Map style: parchment, ink-in oath, footprints, one input. */
export function IdEntryScreen({ onSubmit, lockedUntil, initialValue = '' }: Props) {
  const inputId = useId();
  const helpId = useId();
  const errId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const supported = cryptoSupported();

  useEffect(() => {
    particles.setEmbers(0.3);
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 650);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const wait = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = wait > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const problem = validateIdInput(value);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit(value);
  };

  return (
    <div className="screen map-screen screen-in" data-screen="id">
      <section className="parchment" aria-labelledby={`${inputId}-title`}>
        <div className="map-content">
          <InkText
            text="I solemnly swear that I am up to no good"
            className="oath"
          />
          <h1 id={`${inputId}-title`} className="sr-only">
            Find your department
          </h1>

          {!supported ? (
            <div role="alert" className="map-note">
              <p>
                This browser cannot run the Sorting Hat&rsquo;s magic because secure web crypto is
                missing.
              </p>
              <p>
                Please open this page in Chrome or Safari, and check that the address starts with
                https.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="map-form">
              <label htmlFor={inputId} className="map-label">
                Student ID
              </label>
              <input
                ref={inputRef}
                id={inputId}
                className="map-input"
                type="text"
                inputMode="numeric"
                enterKeyHint="go"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={20}
                placeholder={STUDENT_ID_EXAMPLE}
                value={value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${helpId} ${errId}` : helpId}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
              />
              <p id={helpId} className="map-help">
                8 digits, like {STUDENT_ID_EXAMPLE}. Spaces and dashes are fine.
              </p>
              <p id={errId} className="map-error" role="alert" aria-live="assertive">
                {error}
              </p>

              <button type="submit" className="btn-ink press" disabled={locked} aria-disabled={locked}>
                {locked ? `The Hat needs a moment (${wait})` : 'Reveal my department'}
              </button>
            </form>
          )}
        </div>
        <Footprints />
      </section>
    </div>
  );
}
