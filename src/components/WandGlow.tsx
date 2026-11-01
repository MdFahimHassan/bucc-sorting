import { useEffect, useRef } from 'react';

/**
 * The wand tip: a flickering warm glow that eases toward the pointer.
 * Position is written straight to the element transform (no React state per frame).
 * Structure: outer follows the pointer, .ignite is animated by GSAP, halo/core flicker in CSS.
 */
export function WandGlow() {
  const outer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.58;
    let x = tx;
    let y = ty;
    let raf = 0;

    const paint = () => {
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    };
    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      paint();
      raf =
        Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    paint();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={outer} className="wand-glow" aria-hidden="true">
      <div className="ignite">
        <div className="wand-halo" />
        <div className="wand-core" />
      </div>
    </div>
  );
}
