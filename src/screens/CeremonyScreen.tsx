import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { HatIcon } from '../components/HatIcon';
import {
  DEPARTMENTS,
  getDepartment,
  hasGroupChat,
  patronusLabel,
  type Department,
} from '../config/departments';
import { crestUrl } from '../config/crestImages';
import type { LookupResult } from '../lib/lookup';
import { prefersReducedMotion, sleep } from '../lib/motion';
import { particles } from '../lib/particles';
import { playChime } from '../lib/sound';
import { ShareSheet } from '../components/ShareSheet';

const TAU = Math.PI * 2;
const HAT_LINES = [
  'Hmm… difficult, very difficult…',
  'Plenty of courage, I see…',
  'I know just the place for you…',
];

interface Props {
  /** Resolves with the lookup. Starts at submit so the Hat can think while it runs. */
  lookup: Promise<LookupResult>;
  onFound: (result: Extract<LookupResult, { status: 'found' }>) => void;
  onFail: (result: LookupResult) => void;
  onReplay: () => void;
  onAnotherId: () => void;
}

interface Reveal {
  dept: Department;
  name: string;
}

/** Sorting moment, reveal and department card on one continuous stage. */
export function CeremonyScreen({ lookup, onFound, onFail, onReplay, onAnotherId }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ onFound, onFail });
  propsRef.current = { onFound, onFail };
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [announce, setAnnounce] = useState('');
  const [sheet, setSheet] = useState<{ url: string; blob: Blob; fileName: string; native: boolean } | null>(null);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'error'>('idle');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const reduced = prefersReducedMotion();

    const one = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    const stage = one<HTMLElement>('.stage');
    const shakeEl = one<HTMLElement>('.ceremony-shake');
    const hatLine = one<HTMLElement>('.hat-line');
    const hat = one<SVGElement>('.hat-wrap svg');
    const hatWrap = one<HTMLElement>('.hat-wrap');
    const stageGlow = one<HTMLElement>('.stage-glow');
    const haloWrap = one<HTMLElement>('.halo-wrap');
    const flash = one<HTMLElement>('.flash');
    const items = all<HTMLElement>('.hx');
    const bodies = all<HTMLElement>('.hx-body');
    const auras = all<HTMLElement>('.hx-aura');

    // ----- ring physics, driven by one ticker callback -----
    const S = { angle: 0, speed: 0.55, shake: 0 };
    const pos = items.map(() => ({ x: 0, y: 0, s: 1 }));
    let ringOn = true;
    let driven: number | null = null; // index being driven by the centre move instead of the ring

    const place = () => {
      const r = stage.clientWidth * 0.38;
      items.forEach((it, i) => {
        if (i === driven) return;
        const a = S.angle + (i * TAU) / items.length;
        const p = pos[i]!;
        p.x = Math.cos(a) * r;
        p.y = Math.sin(a) * r * 0.92;
        p.s = 0.88 + 0.16 * ((Math.sin(a) + 1) / 2);
        it.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${p.s.toFixed(3)})`;
      });
    };
    const tick = (_t: number, deltaMs: number) => {
      if (ringOn) {
        S.angle += S.speed * (Math.min(deltaMs, 50) / 1000);
        place();
      }
      if (S.shake > 0.01) {
        shakeEl.style.transform = `translate3d(${((Math.random() * 2 - 1) * S.shake).toFixed(2)}px,${((Math.random() * 2 - 1) * S.shake).toFixed(2)}px,0)`;
      }
    };

    const center = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const timelineDone = (tl: gsap.core.Timeline) =>
      new Promise<void>((res) => {
        tl.eventCallback('onComplete', () => res());
      });

    const ctx = gsap.context(() => {
      void (async () => {
        let found: Extract<LookupResult, { status: 'found' }> | null = null;
        try {
          // ================= 1. SORTING =================
          if (!reduced) {
            place();
            gsap.ticker.add(tick);
            particles.setEmbers(1);

            const sp = { v: 1 };
            const master = gsap.timeline();
            // typewriter, one line after another
            HAT_LINES.forEach((line) => {
              const o = { n: 0 };
              master
                .call(() => {
                  hatLine.textContent = '';
                  gsap.set(hatLine, { opacity: 1 });
                })
                .to(o, {
                  n: line.length,
                  duration: line.length * 0.024,
                  ease: 'none',
                  onUpdate: () => {
                    hatLine.textContent = line.slice(0, Math.round(o.n));
                  },
                })
                .to({}, { duration: 0.22 });
            });
            // rising tension over the same span
            const T = master.duration();
            master
              .to(S, { speed: 7.2, duration: T, ease: 'power2.in' }, 0)
              .to(S, { shake: 3.2, duration: T, ease: 'power2.in' }, 0)
              .fromTo(stageGlow, { opacity: 0.1 }, { opacity: 1, duration: T, ease: 'power2.in' }, 0)
              .to(auras, { opacity: 0.75, duration: T, ease: 'power2.in' }, 0)
              .to(
                sp,
                {
                  v: 3.4,
                  duration: T,
                  ease: 'power2.in',
                  onUpdate: () => particles.setSpeed(sp.v),
                },
                0,
              )
              .to(hat, { rotation: 5, duration: T / 4, ease: 'sine.inOut', yoyo: true, repeat: 3, transformOrigin: '50% 90%' }, 0);
            await timelineDone(master);
          } else {
            hatLine.textContent = 'The Sorting Hat is thinking…';
            gsap.set(hatLine, { opacity: 1 });
            await sleep(900);
          }
          if (cancelled) return;

          // ================= result =================
          const raced = await Promise.race([lookup, sleep(700).then(() => null)]);
          let result = raced;
          if (result === null) {
            hatLine.textContent = 'Patience, patience…';
            result = await lookup;
          }
          if (cancelled) return;

          const dept = result.status === 'found' ? getDepartment(result.person.dept) : undefined;
          if (result.status !== 'found' || !dept) {
            ringOn = false;
            gsap.ticker.remove(tick);
            S.shake = 0;
            shakeEl.style.transform = '';
            await gsap.to(shakeEl, { opacity: 0, duration: 0.3 });
            if (!cancelled) propsRef.current.onFail(result.status === 'found' ? { status: 'not-found' } : result);
            return;
          }
          found = result;
          const idx = DEPARTMENTS.findIndex((d) => d.id === dept.id);
          const chosen = items[idx]!;
          chosen.classList.add('is-chosen');

          // Mount the reveal text now so it can be animated.
          flushSync(() => setReveal({ dept, name: result.person.name }));
          root.style.setProperty('--glow', dept.accent);
          propsRef.current.onFound(result);

          if (reduced) {
            hatLine.textContent = '';
            root.classList.add('is-final');
            setAnnounce(`${result.person.name}, you have been sorted into ${dept.name}.`);
            return;
          }

          // ================= 2. REVEAL =================
          // 2a. ring winds down, text clears
          await new Promise<void>((res) =>
            gsap
              .timeline({ onComplete: res })
              .to(S, { speed: 0, shake: 0, duration: 0.55, ease: 'power2.out' }, 0)
              .to(hatLine, { opacity: 0, duration: 0.3 }, 0)
              .to(auras, { opacity: 0.12, duration: 0.4 }, 0),
          );
          shakeEl.style.transform = '';
          particles.setSpeed(1.4);
          if (cancelled) return;

          // 2b. flash one by one, decelerating, ending on the chosen patronus
          const K = items.length + idx;
          const flashTl = gsap.timeline();
          let t = 0;
          for (let k = 0; k <= K; k++) {
            const i = k % items.length;
            const last = k === K;
            flashTl
              .fromTo(
                auras[i]!,
                { opacity: 1 },
                { opacity: last ? 1 : 0.12, duration: 0.3, ease: 'power2.out' },
                t,
              )
              .fromTo(
                bodies[i]!,
                { scale: last ? 1.4 : 1.2 },
                { scale: last ? 1.3 : 1, duration: last ? 0.4 : 0.25, ease: 'power2.out' },
                t,
              );
            t += 0.055 + 0.12 * Math.pow(k / K, 2);
          }
          await timelineDone(flashTl);
          if (cancelled) return;

          // 2c. the other six dissolve into silver mist
          const crackTl = gsap.timeline();
          let n = 0;
          items.forEach((it, i) => {
            if (i === idx) return;
            const at = n++ * 0.06;
            const c = center(it);
            crackTl
              .call(() => particles.burst(c.x, c.y, '#cfe9ff', 6), [], at + 0.1)
              .to(
                bodies[i]!,
                { opacity: 0, scale: 1.25, y: -22, filter: 'blur(5px)', duration: 0.6, ease: 'power2.out' },
                at + 0.05,
              );
          });
          crackTl.to([hatWrap, stageGlow], { opacity: 0, duration: 0.5 }, 0.2);
          await timelineDone(crackTl);
          if (cancelled) return;

          // 2d. chosen patronus travels to the centre
          ringOn = false;
          driven = idx;
          chosen.style.willChange = 'auto'; // let the browser re-rasterise sharply at 3x
          const C = { ...pos[idx]! };
          const apply = () => {
            chosen.style.transform = `translate3d(${C.x.toFixed(1)}px,${C.y.toFixed(1)}px,0) scale(${C.s.toFixed(3)})`;
          };
          const mv = gsap.timeline();
          mv.to(C, { x: 0, y: 0, s: 3, duration: 0.95, ease: 'power3.inOut', onUpdate: apply }, 0)
            .to(bodies[idx]!, { scale: 1, duration: 0.5 }, 0)
            .to(haloWrap, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.2);
          await timelineDone(mv);
          if (cancelled) return;

          // 2e. burst + flash in the department colour
          const c = center(chosen);
          particles.burst(c.x, c.y, dept.accent, 44);
          playChime();
          particles.setEmbers(0.75, [dept.accent, dept.accent, '#ffe3a1']);
          particles.setSpeed(1.8);
          gsap
            .timeline()
            .fromTo(flash, { opacity: 0 }, { opacity: 0.38, duration: 0.08 })
            .to(flash, { opacity: 0, duration: 0.35 });
          gsap.delayedCall(1.4, () => particles.setSpeed(1));

          // 2f. name letter by letter, then flavour, greeting and card details
          const chars = all<HTMLElement>('.ch');
          const fin = gsap.timeline({ delay: 0.25 });
          fin
            .to(chars, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' })
            .to('.flavor', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '>-0.1')
            .to('.greet', { opacity: 1, duration: 0.6 }, '<')
            .to('.details', { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, '>-0.2');
          await timelineDone(fin);
          if (!cancelled) {
            setAnnounce(`${result.person.name}, you have been sorted into ${dept.name}.`);
          }
        } catch (err) {
          // Animation trouble must never hide the answer: fall back to the static card.
          console.error(err);
          if (cancelled) return;
          gsap.ticker.remove(tick);
          shakeEl.style.transform = '';
          if (!found) {
            try {
              const r = await lookup;
              if (r.status === 'found') found = r;
              else {
                propsRef.current.onFail(r);
                return;
              }
            } catch {
              propsRef.current.onFail({ status: 'error', message: 'Something went wrong' });
              return;
            }
          }
          const d = getDepartment(found.person.dept);
          if (!d) {
            propsRef.current.onFail({ status: 'not-found' });
            return;
          }
          flushSync(() => setReveal({ dept: d, name: found!.person.name }));
          root.style.setProperty('--glow', d.accent);
          items[DEPARTMENTS.findIndex((x) => x.id === d.id)]?.classList.add('is-chosen');
          root.classList.add('is-final');
          setAnnounce(`${found.person.name}, you have been sorted into ${d.name}.`);
        }
      })();
    }, root);

    return () => {
      cancelled = true;
      gsap.ticker.remove(tick);
      ctx.revert();
      particles.setSpeed(1);
      particles.setEmbers(0.3);
    };
    // lookup is created once per mount (the parent remounts for a replay).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dept = reveal?.dept;

  const saveCard = async () => {
    if (!reveal || saving === 'busy') return;
    setSaving('busy');
    try {
      // Lazy chunk: the canvas generator is only fetched when someone asks for the card.
      const m = await import('../lib/shareCard');
      const blob = await m.renderCard(reveal.name, reveal.dept);
      const fileName = m.cardFileName(reveal.name);
      const text = `I was sorted into ${reveal.dept.name} at BUCC Fall 26!`;
      const outcome = await m.shareCard(blob, fileName, text);
      if (outcome === 'shared' || outcome === 'cancelled') {
        setSaving('idle');
        return;
      }
      const url = URL.createObjectURL(blob);
      m.downloadBlob(blob, fileName);
      setSheet({ url, blob, fileName, native: false });
      setSaving('idle');
    } catch (e) {
      console.error(e);
      setSaving('error');
    }
  };
  const closeSheet = () => {
    if (sheet) URL.revokeObjectURL(sheet.url);
    setSheet(null);
  };

  return (
    <div ref={rootRef} className="screen ceremony" data-screen="ceremony">
      <div className="ceremony-shake">
        <p className="greet">{reveal?.name}</p>

        <div className="stage" aria-hidden="true">
          <div className="stage-glow" />
          <div className="halo-wrap">
            <div className="halo" />
          </div>
          <div className="hat-wrap">
            <HatIcon className="hat" />
          </div>
          {DEPARTMENTS.map((d) => (
            <div key={d.id} className="hx" style={{ ['--c' as string]: d.accent }}>
              <div className="hx-body">
                <span className="hx-aura" />
                <span className="hx-icon" style={{ ['--img' as string]: `url(${crestUrl(d.id)})` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="zone">
          <p className="hat-line" aria-hidden="true" />
          {dept && (
            <div className="reveal-text">
              <h2 className="dept-name" aria-label={dept.name}>
                {dept.name.split(' ').map((word, wi) => (
                  <span key={`${word}-${wi}`} aria-hidden="true">
                    {wi > 0 ? ' ' : ''}
                    <span className="word">
                      {Array.from(word).map((ch, ci) => (
                        <span className="ch" key={ci}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </h2>
              <p className="flavor">{dept.flavor}</p>
            </div>
          )}
        </div>

        <div className="details">
          {dept && (
            <>
              <p className="hx-label">Your Patronus is {patronusLabel(dept)}.</p>
              <p className="desc">
                <span>{dept.description[0]}</span>
                <span>{dept.description[1]}</span>
              </p>
              <div className="actions">
                <button type="button" className="btn-line press" onClick={() => void saveCard()} disabled={saving === 'busy'}>
                  {saving === 'busy' ? 'Making your card\u2026' : 'Save my card'}
                </button>
                {saving === 'error' && (
                  <p className="card-error" role="alert">
                    The card could not be made on this device. Try again, or screenshot this screen.
                  </p>
                )}
                {hasGroupChat(dept) && (
                  <a
                    className="btn-glow press"
                    href={dept.groupChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join the group chat
                  </a>
                )}
              </div>
              <div className="quiet-row">
                <button type="button" className="btn-quiet press" onClick={onReplay}>
                  Replay
                </button>
                <button type="button" className="btn-quiet press" onClick={onAnotherId}>
                  Try another ID
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {sheet && (
        <ShareSheet
          url={sheet.url}
          fileName={sheet.fileName}
          canNativeShare={false}
          onShare={() => undefined}
          onDownload={() => {
            void import('../lib/shareCard').then((m) => m.downloadBlob(sheet.blob, sheet.fileName));
          }}
          onClose={closeSheet}
        />
      )}
      <div className="flash" aria-hidden="true" />
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}