/**
 * Lazy-loaded synthesized ambience (no audio file to download on slow venue Wi-Fi).
 * A soft two-voice drone with a slow filter sweep, plus a short chime for the reveal.
 * Only imported after the first tap, and only started when the person turns sound on.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function startDrone(c: AudioContext, out: AudioNode): void {
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.7;
  filter.connect(out);

  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  // D2 + A2 + F3, slightly detuned for slow beating
  for (const [f, g, type] of [
    [73.4, 0.5, 'sine'],
    [110.3, 0.32, 'triangle'],
    [174.9, 0.16, 'sine'],
    [73.0, 0.4, 'sine'],
  ] as const) {
    const o = c.createOscillator();
    const v = c.createGain();
    o.type = type;
    o.frequency.value = f;
    v.gain.value = g;
    o.connect(v).connect(filter);
    o.start();
  }
}

export async function setSound(on: boolean): Promise<boolean> {
  const c = ensure();
  if (!c || !master) return false;
  if (on) {
    try {
      await c.resume();
    } catch {
      return false;
    }
    if (!started) {
      startDrone(c, master);
      started = true;
    }
  }
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setTargetAtTime(on ? 0.16 : 0, c.currentTime, on ? 0.9 : 0.25);
  return true;
}

/** Bright bell for the moment the house is revealed. No-op while muted. */
export function chime(): void {
  const c = ctx;
  if (!c || !master || master.gain.value < 0.01) return;
  const t = c.currentTime;
  for (const [f, d, g] of [
    [880, 2.4, 0.25],
    [1318.5, 2.0, 0.16],
    [1760, 1.6, 0.1],
  ] as const) {
    const o = c.createOscillator();
    const v = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(g, t + 0.02);
    v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(v).connect(c.destination);
    o.start(t);
    o.stop(t + d + 0.05);
  }
}
