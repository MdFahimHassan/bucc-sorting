import { particles } from './particles';

/**
 * The scroll closes once the seal is stamped: the open scroll rolled up (the unroll in reverse), a
 * flash of warm light as it is sealed, then the candles go out and the screen is left dark. The
 * ceremony fades up out of that dark (App.tsx, "dusk" transition).
 *
 *   1. form fades, sheet folds shut and the two rolls travel to the middle
 *   2. the rolls draw together into the small rolled scroll (what the owl dropped)
 *   3. flash + embers
 *   4. dusk: a dark layer fades in and stays, so the next screen can come up from black
 *
 * Everything is Web Animations API, transform/opacity only (plus the roll sizes the unroll uses).
 * Animations use fill "forwards" so the dark state holds until the screen is unmounted.
 */
export interface CloseParts {
  card: HTMLElement;
  top: HTMLElement;
  bottom: HTMLElement;
  content: HTMLElement | null;
  flash: HTMLElement;
  dusk: HTMLElement;
}

const ROLL_MS = 520;
const MERGE_MS = 200;
const FLASH_MS = 300;
const DUSK_LEAD_MS = 90; // the dark starts closing in just after the flash peaks
const DUSK_MS = 360;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function play(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  const a = el.animate(keyframes, { fill: 'forwards', ...options });
  // Cancelling rejects `finished`; swallow it so an unmount mid-close never logs an error.
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

export async function closeScroll(p: CloseParts): Promise<void> {
  const cardRect = p.card.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;
  const half = (p.card.offsetHeight / 2) * 0.98;

  // 1. The sheet folds shut between the two rolls, which meet in the middle.
  if (p.content) void play(p.content, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' });
  const roll: KeyframeAnimationOptions = { duration: ROLL_MS, easing: 'cubic-bezier(0.6, 0, 0.35, 1)' };
  void play(p.top, [{ transform: 'translateY(0px)' }, { transform: `translateY(${half}px)` }], roll);
  void play(p.bottom, [{ transform: 'translateY(0px)' }, { transform: `translateY(${-half}px)` }], roll);
  void play(p.card, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], roll);
  await play(p.card, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.02)' }], roll);

  // 2. The rolls narrow back into the small rolled scroll.
  const narrow = (side: 'top' | 'bottom'): Keyframe[] => [
    { left: '0px', right: '0px', height: '44px', [side]: '-22px' },
    { left: '29%', right: '29%', height: '22px', [side]: '-11px' },
  ];
  const merge: KeyframeAnimationOptions = { duration: MERGE_MS, easing: 'ease-in' };
  void play(p.top, narrow('top'), merge);
  void play(p.bottom, narrow('bottom'), merge);
  for (const el of [p.top, p.bottom]) {
    for (const pseudoElement of ['::before', '::after']) {
      void play(el, [{ width: '28px' }, { width: '14px' }], { ...merge, pseudoElement });
    }
  }
  await wait(MERGE_MS);

  // 3. Sealed: a flash and a burst of embers where the scroll was.
  p.flash.style.left = `${cx}px`;
  p.flash.style.top = `${cy}px`;
  particles.burst(cx, cy, '#ffd89a', 40);
  particles.burst(cx, cy, '#ff9a4a', 16);
  void play(
    p.flash,
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(0.15)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(0.7)', offset: 0.35 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
    ],
    { duration: FLASH_MS, easing: 'ease-out' },
  );
  await wait(DUSK_LEAD_MS);

  // 4. The candles go out. The dark layer stays (fill forwards) until the screen is replaced.
  await play(p.dusk, [{ opacity: 0 }, { opacity: 1 }], { duration: DUSK_MS, easing: 'ease-in' });
}