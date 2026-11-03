import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { STUDENT_ID_EXAMPLE } from '../config/departments';
import { ScrollBackdrop } from '../components/ScrollBackdrop';
import { Footprints } from '../components/Footprints';
import { InkText } from '../components/InkText';
import { Owl } from '../components/Owl';
import { WaxStamp } from '../components/WaxStamp';
import { closeScroll } from '../lib/closeScroll';
import { cryptoSupported } from '../lib/lookup';
import { prefersReducedMotion, sleep } from '../lib/motion';
import { particles } from '../lib/particles';
import { useScrollIntro } from '../lib/useScrollIntro';
import { validateIdInput } from '../lib/validate';

interface Props {
  onSubmit: (rawId: string) => void;
  /** Epoch ms until which submitting is paused (after repeated misses). */
  lockedUntil: number | null;
  initialValue?: string;
}

const OATH = 'Whisper thy number, and the castle shall answer.';

/**
 * Marauder's Map style: an owl delivers a scroll, the red string comes off, it unrolls into
 * parchment with an ink-in line, one input, and a wax seal you hold to submit.
 */
export function IdEntryScreen({ onSubmit, lockedUntil, initialValue = '' }: Props) {
  const inputId = useId();
  const helpId = useId();
  const errId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(initialValue);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const supported = cryptoSupported();

  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const owlRef = useRef<HTMLDivElement>(null);
  const carriedRef = useRef<SVGGElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const duskRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const alive = useRef(true);
  const [closing, setClosing] = useState(false);

  const { stage, played, skip } = useScrollIntro({
    wrap: wrapRef,
    card: cardRef,
    owl: owlRef,
    carried: carriedRef,
    drop: dropRef,
    ribbon: ribbonRef,
    top: topRef,
    bottom: bottomRef,
  });
  const ready = stage === 'ready';
  const hold = stage === 'owl' || stage === 'drop' || stage === 'untie';
  // The oath inks in once the sheet starts opening; a touch later so the sheet leads.
  const oathDelay = useRef(played ? 700 : 250).current;

  useEffect(() => {
    particles.setEmbers(0.3);
  }, []);

  // Focus only when the form is actually usable (after the unroll, not during it).
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), played ? 60 : 650);
    return () => clearTimeout(t);
  }, [ready, played]);

  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const wait = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = wait > 0;

  /** Shows the problem (and returns false) when the ID is not usable yet. */
  const check = (): boolean => {
    if (locked) return false;
    const problem = validateIdInput(valueRef.current);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return false;
    }
    setError(null);
    return true;
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * Hand the ID over. The scroll first closes and the screen goes dark (closeScroll.ts), so the
   * ceremony can come up out of the dark instead of replacing the scroll in one frame. Both ways
   * of submitting (the seal, and Enter) come through here.
   */
  const send = () => {
    if (closingRef.current) return;
    const id = valueRef.current;
    const card = cardRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    const flash = flashRef.current;
    const dusk = duskRef.current;
    if (prefersReducedMotion() || !card || !top || !bottom || !flash || !dusk || typeof card.animate !== 'function') {
      onSubmit(id);
      return;
    }
    closingRef.current = true;
    setClosing(true);
    // The timeout is only a safety net, so a stalled animation can never trap someone on this screen.
    void Promise.race([
      closeScroll({ card, top, bottom, flash, dusk, content: card.querySelector<HTMLElement>('.map-content') }),
      sleep(2400),
    ])
      .catch(() => undefined)
      .then(() => {
        if (alive.current) onSubmit(id);
      });
  };

  // Enter / the keyboard's Go key submits straight away; the seal is the pointer path.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (check()) send();
  };

  return (
    <div
      className="screen map-screen screen-in"
      data-screen="id"
      data-ready={ready ? '' : undefined}
      onPointerDown={ready ? undefined : skip}
      onKeyDown={ready ? undefined : skip}
    >
      <ScrollBackdrop />
      <div className="owl-layer" aria-hidden="true">
        <div ref={owlRef} className="owl-fly">
          <div className="owl-bob">
            <Owl carriedRef={carriedRef} />
          </div>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="scroll-wrap"
        data-stage={stage}
        data-hold={hold ? '' : undefined}
      >
        <div ref={topRef} className="roll roll-edge roll-top" aria-hidden="true" />

        <section ref={cardRef} className="parchment" aria-labelledby={`${inputId}-title`}>
          <div className="map-content" inert={!ready || closing}>
            <InkText text={OATH} className="oath" startDelayMs={oathDelay} />
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
                    valueRef.current = e.target.value;
                    setValue(e.target.value);
                    if (error) setError(null);
                  }}
                />
                <p id={helpId} className="map-help">
                  8 or 10 digits, like {STUDENT_ID_EXAMPLE}. Spaces and dashes are fine.
                </p>
                <p id={errId} className="map-error" role="alert" aria-live="assertive">
                  {error}
                </p>

                <WaxStamp
                  label={locked ? `The Hat needs a moment (${wait})` : 'Hold to seal your fate'}
                  disabled={locked}
                  onBeforeHold={check}
                  onComplete={send}
                />
              </form>
            )}
          </div>
          <Footprints />
        </section>

        <div ref={bottomRef} className="roll roll-edge roll-bottom" aria-hidden="true" />

        {/* The dropped scroll: rolled up, tied with a red string, until it is untied. */}
        <div ref={dropRef} className="roll roll-drop" aria-hidden="true">
          <div ref={ribbonRef} className="ribbon">
            <svg viewBox="0 0 64 64" focusable="false">
              <path d="M30 34 Q24 46 17 58" stroke="#a81f17" strokeWidth="4.2" strokeLinecap="round" fill="none" />
              <path d="M34 34 Q40 46 47 58" stroke="#a81f17" strokeWidth="4.2" strokeLinecap="round" fill="none" />
              <rect x="26" y="16" width="12" height="32" rx="2" fill="#b3261e" />
              <rect x="26" y="16" width="3" height="32" rx="1.5" fill="#7d150f" opacity="0.55" />
              <ellipse cx="22" cy="28" rx="10" ry="6" transform="rotate(-24 22 28)" fill="#c62f25" stroke="#7d150f" strokeWidth="1" />
              <ellipse cx="42" cy="28" rx="10" ry="6" transform="rotate(24 42 28)" fill="#c62f25" stroke="#7d150f" strokeWidth="1" />
              <circle cx="32" cy="30" r="4.4" fill="#d9382d" stroke="#7d150f" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>

      <p className="intro-skip" aria-hidden="true">
        Tap to skip
      </p>

      {/* Closing the scroll: a flash where it was sealed, then the dark that the ceremony comes up out of. */}
      <div ref={flashRef} className="id-flash" aria-hidden="true" />
      <div ref={duskRef} className="id-dusk" aria-hidden="true" />
    </div>
  );
}