export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Phones and small tablets get the lighter particle budget. */
export function isCompactDevice(): boolean {
  if (typeof matchMedia !== 'function') return true;
  return matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
