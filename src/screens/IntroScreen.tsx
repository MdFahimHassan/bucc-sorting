import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { EVENT } from '../config/departments';
import { EnchantedBackdrop } from '../components/EnchantedBackdrop';
import { HatIcon } from '../components/HatIcon';
import { WandGlow } from '../components/WandGlow';
import { WritingWand } from '../components/WritingWand';
import { particles } from '../lib/particles';
import { prefersReducedMotion } from '../lib/motion';

const LINES = ['The Sorting', 'Ceremony'] as const;

/** Resolves when the title font is ready (or after a short timeout, so we never hang). */
function titleFontReady(): Promise<void> {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load('64px "Almendra SC"').then(() => undefined),
    new Promise<void>((r) => setTimeout(r, 1500)),
  ]).catch(() => undefined);
}

/**
 * "The wand writes the title": a wand tip travels letter by letter, each letter flares
 * into place behind it, then taps the T and the Sorting Hat lands on it.
 * Only opacity/transform are animated; the one canvas is the shared particle engine.
 */
export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const wand = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    particles.setEmbers(0.85);
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const letters = q('.intro-letter');
    const hat = q('.intro-hat');
    const sub = q('.intro-sub');
    const cta = q('.intro-cta');
    const ignite = q('.ignite');
    const wandEl = wand.current;
    let cancelled = false;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion() || !wandEl) {
        gsap.set([ignite, letters, hat, sub, cta], { opacity: 0 });
        gsap.to([ignite, letters, hat, sub, cta], { opacity: 1, duration: 0.5, stagger: 0.04 });
        return;
      }
      gsap.set(ignite, { opacity: 0, scale: 0.35 });
      gsap.set(wandEl, { opacity: 0 });
      gsap.set([sub, cta], { opacity: 0, y: 10 });

      void titleFontReady().then(() => {
        if (cancelled) return;
        // Measure before any transform is applied.
        const pts = letters.map((l) => {
          const r = l.getBoundingClientRect();
          return { x: r.left + r.width / 2, top: r.top + r.height * 0.3, bottom: r.top + r.height * 0.72, w: r.width };
        });
        const hatTarget = (hat[0] as HTMLElement).getBoundingClientRect();
        const tTop = { x: hatTarget.left + hatTarget.width * 0.5, y: hatTarget.bottom };

        gsap.set(letters, { transformOrigin: '50% 80%' });
        gsap.set(hat, { opacity: 0, y: -46, rotate: -38, transformOrigin: '50% 100%' });
        gsap.set(wandEl, { x: pts[0]!.x - 160, y: pts[0]!.top - 90 });

        const STEP = 0.05;
        const tl = gsap.timeline();
        tlRef.current = tl;
        tl.to(wandEl, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.1);

        let t = 0.35;
        let prevLine = pts[0]!.top;
        letters.forEach((letter, i) => {
          const p = pts[i]!;
          const newLine = Math.abs(p.top - prevLine) > 20;
          if (newLine) t += 0.2; // lift the wand to the next line
          prevLine = p.top;
          // Two quick strokes per letter: top, then bottom.
          tl.to(wandEl, { x: p.x - p.w * 0.18, y: p.top, duration: newLine ? 0.28 : STEP, ease: 'none' }, t);
          tl.fromTo(
            letter,
            { opacity: 0, scale: 1.4, color: '#fffbe8' },
            { opacity: 1, scale: 1, color: '#f3d98c', duration: 0.5, ease: 'power3.out', clearProps: 'color' },
            t + (newLine ? 0.2 : 0),
          );
          tl.call(() => particles.trail(p.x, p.top), undefined, t + STEP);
          t += newLine ? 0.28 : STEP;
          tl.to(wandEl, { x: p.x + p.w * 0.2, y: p.bottom, duration: STEP, ease: 'none' }, t);
          t += STEP;
        });

        // Tap the T, the hat lands.
        tl.to(wandEl, { x: tTop.x, y: tTop.y - 6, duration: 0.4, ease: 'power2.inOut' }, t + 0.1);
        t += 0.5;
        tl.to(hat, { opacity: 1, y: 0, rotate: -12, duration: 0.55, ease: 'back.out(2.2)' }, t);
        tl.call(() => particles.burst(tTop.x, tTop.y - 20, '#ffd27a', 14), undefined, t + 0.3);
        t += 0.55;

        // Wand tip hands over to the interactive glow.
        tl.to(wandEl, { opacity: 0, x: '+=40', y: '+=60', duration: 0.5, ease: 'power2.in' }, t);
        tl.to(ignite, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, t + 0.1);
        tl.to(sub, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, t);
        tl.to(cta, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, t + 0.25);
      });
    }, el);

    return () => {
      cancelled = true;
      tlRef.current = null;
      ctx.revert();
    };
  }, []);

  /** Tap anywhere while it is writing to skip straight to the finished title. */
  const skip = () => {
    const tl = tlRef.current;
    if (tl && tl.progress() < 1) tl.progress(1);
  };

  return (
    <div ref={root} className="screen intro" data-screen="intro" onPointerDown={skip}>
      <EnchantedBackdrop />
      <WandGlow />
      <WritingWand ref={wand} />
      <div className="intro-inner">
        <h1 className="intro-title" aria-label={EVENT.title}>
          {LINES.map((line, li) => (
            <span key={line} className="intro-line" aria-hidden="true">
              {line.split(' ').map((word, wi) => (
                <span key={wi} className="intro-word">
                  {word.split('').map((ch, ci) => (
                    <span key={ci} className="intro-letter">
                      {ch}
                      {li === 0 && wi === 0 && ci === 0 && (
                        <HatIcon className="intro-hat" />
                      )}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="intro-sub">{EVENT.label}</p>
        <button type="button" className="btn-gold press intro-cta" onClick={onEnter}>
          Tap to enter
        </button>
      </div>
    </div>
  );
}