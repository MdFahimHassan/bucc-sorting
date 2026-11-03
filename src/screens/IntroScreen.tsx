import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { EVENT } from '../config/departments';
import { EnchantedBackdrop } from '../components/EnchantedBackdrop';
import { HatIcon } from '../components/HatIcon';
import { WandGlow } from '../components/WandGlow';
import { WritingWand } from '../components/WritingWand';
import { particles } from '../lib/particles';
import { prefersReducedMotion } from '../lib/motion';

const LINES = ['The', 'Sorting Ceremony'] as const;

/** Resolves when the title font is ready (or after a short timeout, so we never hang). */
function titleFontReady(): Promise<void> {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load('64px "Harry P"', LINES.join(' ')).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, 1500)),
  ]).catch(() => undefined);
}

interface Pt {
  x: number;
  y: number;
}

/**
 * "The wand writes the title": ONE continuous stroke per line. A single progress value
 * drives both the wand tip (x along the line, y on a gentle handwriting wave) and a soft
 * CSS mask that uncovers the text, so the reveal edge stays glued to the tip. At the end the
 * wand taps the T, the Sorting Hat drops on it, and the interactive WandGlow takes over.
 * Only opacity/transform are animated, apart from the mask variable on the two title lines.
 */
export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const wand = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    particles.setEmbers(0.85);
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const lines = q('.intro-line') as HTMLElement[];
    const hat = q('.intro-hat');
    const sub = q('.intro-sub');
    const cta = q('.intro-cta');
    const ignite = q('.ignite');
    const wandEl = wand.current;
    let cancelled = false;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion() || !wandEl) {
        lines.forEach((l) => l.classList.add('is-written'));
        if (wandEl) gsap.set(wandEl, { opacity: 0 });
        gsap.set([ignite, lines, hat, sub, cta], { opacity: 0 });
        gsap.to([ignite, lines, hat, sub, cta], { opacity: 1, duration: 0.5, stagger: 0.04 });
        return;
      }
      gsap.set(ignite, { opacity: 0, scale: 0.35 });
      gsap.set(wandEl, { opacity: 0 });
      gsap.set([sub, cta], { opacity: 0, y: 10 });

      void titleFontReady().then(() => {
        if (cancelled) return;
        const l1 = lines[0];
        const l2 = lines[1];
        const hatEl = hat[0] as HTMLElement | undefined;
        if (!l1 || !l2 || !hatEl) return;

        // ---- Measure once, before any transform is applied. ----
        const geo = (line: HTMLElement) => {
          const letters = Array.from(line.querySelectorAll<HTMLElement>('.intro-letter'));
          const first = letters[0]!.getBoundingClientRect();
          const last = letters[letters.length - 1]!.getBoundingClientRect();
          const box = line.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(line).fontSize) || 64;
          return {
            box,
            x0: first.left,
            x1: last.right,
            // middle of the x-height, where handwriting would sit
            y: first.top + first.height * 0.6,
            amp: Math.min(7, Math.max(3, fs * 0.05)),
          };
        };
        const g1 = geo(l1);
        const g2 = geo(l2);
        // Soft edge of the reveal mask, in px (also used by the CSS gradient).
        const edgeFade = (parseFloat(getComputedStyle(l1).fontSize) || 64) * 0.35;
        lines.forEach((l) => l.style.setProperty('--fade', `${edgeFade.toFixed(1)}px`));
        /** Tip x for stroke progress v: from just before the first letter to just past the line's end. */
        const strokeX = (g: ReturnType<typeof geo>, v: number) => {
          const startX = g.x0 - edgeFade * 0.4;
          const endX = g.box.left + g.box.width + edgeFade; // mask is fully open here
          return startX + (endX - startX) * v;
        };
        const hatBox = hatEl.getBoundingClientRect();
        const tTop: Pt = { x: hatBox.left + hatBox.width * 0.5, y: hatBox.bottom };
        const tilt = parseFloat(getComputedStyle(hatEl).getPropertyValue('--hat-tilt')) || -12;

        // ---- Wand tip: the only thing that ever moves the wand element. ----
        const setX = gsap.quickSetter(wandEl, 'x', 'px') as (v: number) => void;
        const setY = gsap.quickSetter(wandEl, 'y', 'px') as (v: number) => void;
        const tip: Pt = { x: g1.x0 - edgeFade, y: g1.y - 28 };
        const place = () => {
          setX(tip.x);
          setY(tip.y);
        };
        place();

        gsap.set(hat, { opacity: 0, y: -46, rotate: tilt - 26, transformOrigin: '50% 100%' });

        const tl = gsap.timeline();
        tlRef.current = tl;

        /** One stroke along a line. The mask edge is tied to tip.x, so they cannot drift apart. */
        const write = (line: HTMLElement, g: ReturnType<typeof geo>, waves: number, dur: number, at: number) => {
          const p = { v: 0 };
          tl.to(
            p,
            {
              v: 1,
              duration: dur,
              ease: 'sine.inOut',
              onUpdate: () => {
                const x = strokeX(g, p.v);
                tip.x = x;
                tip.y = g.y + Math.sin(p.v * Math.PI * 2 * waves) * g.amp;
                place();
                // mask edge sits exactly under the tip
                line.style.setProperty('--reveal', `${(x - g.box.left).toFixed(1)}px`);
                particles.trail(tip.x, tip.y);
              },
              onComplete: () => line.classList.add('is-written'),
            },
            at,
          );
        };

        /** Smooth curved hop from the end of one line to the start of the next. */
        const swoosh = (from: Pt, to: Pt, dur: number, at: number) => {
          const c: Pt = { x: from.x + (to.x - from.x) * 0.5, y: Math.max(from.y, to.y) + g2.amp * 7 };
          const p = { v: 0 };
          tl.to(
            p,
            {
              v: 1,
              duration: dur,
              ease: 'power2.inOut',
              onUpdate: () => {
                const u = 1 - p.v;
                tip.x = u * u * from.x + 2 * u * p.v * c.x + p.v * p.v * to.x;
                tip.y = u * u * from.y + 2 * u * p.v * c.y + p.v * p.v * to.y;
                place();
              },
            },
            at,
          );
        };

        // Wand appears and drifts onto the first line.
        tl.to(wandEl, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0);
        tl.to(tip, { x: strokeX(g1, 0), y: g1.y, duration: 0.25, ease: 'power2.out', onUpdate: place }, 0);
        write(l1, g1, 1, 0.6, 0.25);
        swoosh({ x: strokeX(g1, 1), y: g1.y }, { x: strokeX(g2, 0), y: g2.y }, 0.35, 0.85);
        write(l2, g2, 2, 1.25, 1.2);

        // Tap the T, the hat lands.
        tl.to(tip, { x: tTop.x, y: tTop.y - 6, duration: 0.35, ease: 'power2.inOut', onUpdate: place }, 2.65);
        tl.to(hat, { opacity: 1, y: 0, rotate: tilt, duration: 0.45, ease: 'back.out(2.2)' }, 3.0);
        tl.call(() => particles.burst(tTop.x, tTop.y - 20, '#ffd27a', 14), undefined, 3.25);

        // Wand tip hands over to the interactive glow; subtitle and CTA follow.
        tl.to(wandEl, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 3.25);
        tl.to(ignite, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 3.3);
        tl.to(sub, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 3.4);
        tl.to(cta, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 3.55);

        finishRef.current = () => {
          lines.forEach((l) => l.classList.add('is-written'));
          gsap.set(wandEl, { opacity: 0 });
        };
      });
    }, el);

    return () => {
      cancelled = true;
      tlRef.current?.kill();
      tlRef.current = null;
      finishRef.current = null;
      ctx.revert();
    };
  }, []);

  /** Tap anywhere while it is writing to skip straight to the finished title. */
  const skip = () => {
    const tl = tlRef.current;
    if (tl && tl.progress() < 1) {
      tl.progress(1);
      finishRef.current?.();
    }
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