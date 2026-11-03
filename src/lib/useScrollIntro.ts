import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { OWL_GLIDE_MS, prefersReducedMotion } from './motion';

/**
 * The owl delivers the scroll, the red string comes off, the scroll unrolls.
 *
 *   owl    owl flies in from the left
 *   drop   it lets go of the rolled scroll, which falls and bounces
 *   untie  the red string lifts off
 *   unroll the two rolls travel to the top and bottom edges, the parchment opens between them
 *   ready  final state (this is also what the plain CSS describes, see .scroll-wrap in index.css)
 *
 * Everything is transform/opacity driven through the Web Animations API (no GSAP, no images),
 * so it stays on the compositor and costs almost nothing in JS. It plays once per visit,
 * is skipped under prefers-reduced-motion, and any tap skips it.
 */
export type IntroStage = 'owl' | 'drop' | 'untie' | 'unroll' | 'ready';

export interface IntroParts {
  wrap: RefObject<HTMLDivElement | null>;
  card: RefObject<HTMLElement | null>;
  owl: RefObject<HTMLDivElement | null>;
  carried: RefObject<SVGGElement | null>;
  drop: RefObject<HTMLDivElement | null>;
  ribbon: RefObject<HTMLDivElement | null>;
  top: RefObject<HTMLDivElement | null>;
  bottom: RefObject<HTMLDivElement | null>;
}

/** Set once the sequence has finished (or was skipped), so retries go straight to the scroll. */
let introSeen = false;

function canPlay(): boolean {
  return (
    !introSeen &&
    !prefersReducedMotion() &&
    typeof Element !== 'undefined' &&
    typeof Element.prototype.animate === 'function'
  );
}

export function useScrollIntro(parts: IntroParts): {
  stage: IntroStage;
  /** True when this mount plays the full sequence. */
  played: boolean;
  skip: () => void;
} {
  const [initial] = useState<IntroStage>(() => (canPlay() ? 'owl' : 'ready'));
  const [stage, setStage] = useState<IntroStage>(initial);
  const skipRef = useRef<() => void>(() => undefined);
  const partsRef = useRef(parts);
  partsRef.current = parts;

  useEffect(() => {
    if (initial === 'ready') {
      introSeen = true;
      return;
    }

    const p = partsRef.current;
    const anims: Animation[] = [];
    let cancelled = false;
    let done = false;

    // Keep the DOM attributes in lockstep with React state so the CSS never lags a frame.
    const go = (s: IntroStage) => {
      const wrap = p.wrap.current;
      if (wrap) {
        wrap.dataset.stage = s;
        if (s === 'owl' || s === 'drop' || s === 'untie') wrap.setAttribute('data-hold', '');
        else wrap.removeAttribute('data-hold');
      }
      setStage(s);
    };

    const play = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return Promise.resolve();
      const a = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(a);
      // Cancelling rejects `finished`; swallow it so a skip never logs an unhandled rejection.
      return a.finished.then(
        () => undefined,
        () => undefined,
      );
    };

    const finish = () => {
      if (done) return;
      done = true;
      introSeen = true;
      go('ready');
      anims.forEach((a) => a.cancel());
    };

    skipRef.current = () => {
      cancelled = true;
      finish();
    };

    const run = async () => {
      const owl = p.owl.current;
      const card = p.card.current;
      const drop = p.drop.current;
      const ribbon = p.ribbon.current;
      const top = p.top.current;
      const bottom = p.bottom.current;
      const carried = p.carried.current;
      if (!owl || !card || !drop || !ribbon || !top || !bottom) {
        finish();
        return;
      }

      go('owl');

      // Measure before any animation touches transforms.
      const vw = document.documentElement.clientWidth;
      const owlW = owl.offsetWidth;
      const owlH = owl.offsetHeight;
      const owlTop = owl.getBoundingClientRect().top;
      const cardRect = card.getBoundingClientRect();
      const cardH = card.offsetHeight;
      const hoverX = (vw - owlW) / 2;
      const targetX = cardRect.left + cardRect.width / 2;
      const targetY = cardRect.top + cardRect.height / 2;
      // Where the scroll hangs from the owl (matches the talons in Owl.tsx: x 90/200, y 114/140).
      const dx = hoverX + owlW * (90 / 200) - targetX;
      const dy = owlTop + owlH * (114 / 140) - targetY;

      // 1. Owl glides in and slows to a hover over the middle. This runs while the title scene pans
      //    away (App.tsx / transitions.css), so the owl is what the "camera" follows.
      await play(
        owl,
        [
          { transform: `translate(${-owlW * 1.15}px, 28px)` },
          { transform: `translate(${hoverX}px, 0px)` },
        ],
        { duration: OWL_GLIDE_MS, easing: 'cubic-bezier(0.35, 0.1, 0.3, 1)' },
      );
      if (cancelled) return;

      // 2. It lets go: the owl flies off while the scroll falls and bounces.
      if (carried) carried.style.visibility = 'hidden';
      go('drop');
      void play(
        owl,
        [
          { transform: `translate(${hoverX}px, 0px)`, opacity: 1 },
          { transform: `translate(${vw + owlW * 0.3}px, -46px)`, opacity: 1 },
        ],
        { duration: 850, delay: 120, easing: 'cubic-bezier(0.5, 0, 0.9, 0.7)' },
      );
      await play(
        drop,
        [
          { opacity: 1, transform: `translate(${dx}px, ${dy}px) rotate(-16deg) scale(0.5)` },
          {
            opacity: 1,
            transform: `translate(${dx * 0.35}px, ${dy * 0.5}px) rotate(8deg) scale(0.8)`,
            offset: 0.55,
          },
          { opacity: 1, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
        ],
        { duration: 480, easing: 'cubic-bezier(0.45, 0, 0.85, 0.55)' },
      );
      if (cancelled) return;
      await play(
        drop,
        [
          { transform: 'translateY(0px) scale(1, 1)' },
          { transform: 'translateY(-18px) scale(1, 1.04)', offset: 0.45 },
          { transform: 'translateY(0px) scale(1.06, 0.9)', offset: 0.8 },
          { transform: 'translateY(0px) scale(1, 1)' },
        ],
        { duration: 300, easing: 'ease-out' },
      );
      if (cancelled) return;

      // 3. The red string comes loose and floats away.
      go('untie');
      await play(
        ribbon,
        [
          { opacity: 1, transform: 'translateY(0px) rotate(0deg) scale(1)' },
          { opacity: 1, transform: 'translateY(-6px) rotate(-5deg) scale(1.12)', offset: 0.25 },
          { opacity: 0, transform: 'translateY(-30px) rotate(-28deg) scale(0.7)' },
        ],
        { duration: 420, easing: 'ease-in' },
      );
      if (cancelled) return;

      // 4. Unroll. The two rolls start exactly where the dropped scroll lies, widen, then travel
      //    to the top and bottom edges while the sheet grows between them. Rolls and sheet share
      //    one duration and easing, so the rolls ride the sheet's edges.
      go('unroll');
      const ease = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
      const timing = { duration: 760, delay: 140, easing: ease };
      const half = (cardH / 2) * 0.98;
      // The two tubes widen to the full width of the scroll, thicken a little, and their spiral ends
      // grow to size. They stay as the open scroll's top and bottom rolls.
      const widenTo = (side: 'top' | 'bottom'): Keyframe[] => [
        { left: '29%', right: '29%', height: '22px', [side]: '-11px' },
        { left: '0px', right: '0px', height: '44px', [side]: '-22px' },
      ];
      const widenTiming = { duration: 320, easing: 'ease-out' };
      void play(top, widenTo('top'), widenTiming);
      void play(bottom, widenTo('bottom'), widenTiming);
      for (const el of [top, bottom]) {
        for (const pseudoElement of ['::before', '::after']) {
          void play(el, [{ width: '14px' }, { width: '28px' }], { ...widenTiming, pseudoElement });
        }
      }
      void play(top, [{ transform: `translateY(${half}px)` }, { transform: 'translateY(0px)' }], timing);
      void play(bottom, [{ transform: `translateY(${-half}px)` }, { transform: 'translateY(0px)' }], timing);
      // Opacity holds at 0 until the rolls have widened, so no thin full-width sliver shows first.
      void play(card, [{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1 }], timing);
      await play(card, [{ transform: 'scaleY(0.02)' }, { transform: 'scaleY(1)' }], timing);
      if (cancelled) return;

      finish();
    };

    void run().catch(() => finish());

    return () => {
      cancelled = true;
      anims.forEach((a) => a.cancel());
    };
  }, [initial]);

  const skip = useCallback(() => skipRef.current(), []);
  return { stage, played: initial !== 'ready', skip };
}