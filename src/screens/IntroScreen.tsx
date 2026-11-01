import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { EVENT } from '../config/departments';
import { WandGlow } from '../components/WandGlow';
import { particles } from '../lib/particles';
import { prefersReducedMotion } from '../lib/motion';

/**
 * "Lumos": darkness, then a wand tip ignites and the title appears in its light.
 * The single orchestrated moment on this screen; everything else is quiet.
 */
export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    particles.setEmbers(0.85);
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const lines = q('.intro-line');
    const sub = q('.intro-sub');
    const cta = q('.intro-cta');
    const ignite = q('.ignite');

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set([lines, sub, cta, ignite], { opacity: 0 });
        gsap.to([ignite, lines, sub, cta], { opacity: 1, duration: 0.5, stagger: 0.1 });
        return;
      }
      gsap.set(ignite, { opacity: 0, scale: 0.35 });
      gsap.set(lines, { opacity: 0, y: 14 });
      gsap.set([sub, cta], { opacity: 0, y: 10 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(ignite, { opacity: 1, scale: 1, duration: 1.1 }, 0.15)
        // two quick stutters, like a flame catching
        .to(ignite, { opacity: 0.55, duration: 0.07 }, 0.55)
        .to(ignite, { opacity: 1, duration: 0.09 }, 0.62)
        .to(lines, { opacity: 1, y: 0, duration: 0.95, stagger: 0.22 }, 0.7)
        .to(sub, { opacity: 1, y: 0, duration: 0.7 }, 1.55)
        .to(cta, { opacity: 1, y: 0, duration: 0.7 }, 1.8);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="screen intro" data-screen="intro">
      <WandGlow />
      <div className="intro-inner">
        <h1 className="intro-title" aria-label={EVENT.title}>
          <span className="intro-line" aria-hidden="true">
            The Sorting
          </span>
          <span className="intro-line" aria-hidden="true">
            Ceremony
          </span>
        </h1>
        <p className="intro-sub">{EVENT.label}</p>
        <button type="button" className="btn-gold press intro-cta" onClick={onEnter}>
          Tap to enter
        </button>
      </div>
    </div>
  );
}
