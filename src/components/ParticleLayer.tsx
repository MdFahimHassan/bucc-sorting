import { useEffect, useRef } from 'react';
import { particles } from '../lib/particles';

/** Fixed full-screen canvas driven by the shared particle engine. */
export function ParticleLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    particles.attach(c);
    return () => particles.detach();
  }, []);
  return <canvas ref={ref} className="layer-canvas" aria-hidden="true" />;
}
