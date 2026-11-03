export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Phones and small tablets get the lighter particle budget. */
export function isCompactDevice(): boolean {
  if (typeof matchMedia !== 'function') return true;
  return matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Screen-to-screen transitions (see App.tsx and styles/transitions.css).
 * PAN_MS: title scene sweeps left while the scroll scene arrives from the right.
 * OWL_GLIDE_MS: the owl's flight across the title scene. It is a little shorter than the pan, so the
 * camera seems to follow the owl and settle just after it hovers.
 * FADE_MS: the overlapping crossfade used for every other screen change.
 */
export const PAN_MS = 1400;
export const OWL_GLIDE_MS = 1250;
export const FADE_MS = 640;

/**
 * More transition timings (see App.tsx, closeScroll.ts and styles/transitions.css).
 * QUICK_MS: the not-found screen, which should feel light.
 * DUSK_IN_MS: the ceremony fading up out of the dark after the scroll has closed.
 * REDUCED_FADE_MS: with reduced motion every change is just this crossfade.
 * DIP_IN_MS / DIP_OUT_MS: the dark beat when the ceremony is replayed.
 */
export const QUICK_MS = 380;
export const DUSK_IN_MS = 800;
export const REDUCED_FADE_MS = 250;
export const DIP_IN_MS = 320;
export const DIP_OUT_MS = 560;