/**
 * Lazy-loaded sound engine. Nothing here is fetched until someone turns sound on.
 *
 * - Music: one seamless loop (music.mp3, ~1.3 MB) streamed through an <audio> element, so playback
 *   starts while it is still downloading and the decoded audio never sits in memory. It is routed
 *   through Web Audio only to get a volume control that also works on iOS (element.volume does not).
 * - Sound effects: eleven tiny clips (~230 KB together), fetched and decoded when sound is turned on.
 * - If the music cannot load (offline on first use), a synthesized drone takes its place.
 *
 * Everything is mixed through one compressor, so layers can never clip.
 * Re-cut the files with scripts/make-audio.py. Credits are in the README.
 */
import chimeUrl from '../assets/audio/chime.mp3';
import crackUrl from '../assets/audio/crack.mp3';
import heartbeatUrl from '../assets/audio/heartbeat.mp3';
import musicUrl from '../assets/audio/music.mp3';
import paperUrl from '../assets/audio/paper.mp3';
import quillUrl from '../assets/audio/quill.mp3';
import ropeUrl from '../assets/audio/rope.mp3';
import sparkleUrl from '../assets/audio/sparkle.mp3';
import stampUrl from '../assets/audio/stamp.mp3';
import swooshUrl from '../assets/audio/swoosh.mp3';
import tickUrl from '../assets/audio/tick.mp3';
import wingsUrl from '../assets/audio/wings.mp3';

export type SfxName =
  | 'chime'
  | 'crack'
  | 'heartbeat'
  | 'paper'
  | 'quill'
  | 'rope'
  | 'sparkle'
  | 'stamp'
  | 'swoosh'
  | 'tick'
  | 'wings';

export interface SfxOptions {
  /** Multiplies the sound's own level in LEVEL. */
  gain?: number;
  /** Playback speed (also shifts pitch). 1 = as recorded. */
  rate?: number;
  /** If set, the speed glides from `rate` to this over `over` seconds (the heartbeat quickens). */
  rateTo?: number;
  over?: number;
}

const FILES: Record<SfxName, string> = {
  chime: chimeUrl,
  crack: crackUrl,
  heartbeat: heartbeatUrl,
  paper: paperUrl,
  quill: quillUrl,
  rope: ropeUrl,
  sparkle: sparkleUrl,
  stamp: stampUrl,
  swoosh: swooshUrl,
  tick: tickUrl,
  wings: wingsUrl,
};

/**
 * THE MIX. The clips are already level-matched, so these are the only numbers to touch when a sound
 * is too loud or too quiet. The heartbeat is boosted because it is the quietest thing on a phone.
 */
const LEVEL: Record<SfxName, number> = {
  chime: 1,
  crack: 0.8,
  heartbeat: 1.9,
  paper: 0.9,
  quill: 0.8,
  rope: 1,
  sparkle: 0.8,
  stamp: 1,
  swoosh: 0.7,
  tick: 0.7,
  wings: 0.8,
};

/** Music level, and how far it dips while the reveal chime rings. */
const MUSIC_LEVEL = 0.5;
const DUCK_TO = 0.3;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicGain: GainNode | null = null;
let wanted = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 10;
  comp.ratio.value = 6;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);
  document.addEventListener('visibilitychange', onVisibility);
  return ctx;
}

// ---------------------------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------------------------
let music: HTMLAudioElement | null = null;
let droneOn = false;

function startMusic(c: AudioContext): void {
  if (!musicGain) return;
  if (!music) {
    music = new Audio(musicUrl);
    music.loop = true;
    music.preload = 'auto';
    try {
      c.createMediaElementSource(music).connect(musicGain);
    } catch {
      music.volume = MUSIC_LEVEL; // no routing: the element's own volume (not honoured on iOS)
    }
    music.addEventListener('error', () => startDrone(c));
  }
  void music.play().catch(() => startDrone(c));
  musicGain.gain.cancelScheduledValues(c.currentTime);
  musicGain.gain.setTargetAtTime(MUSIC_LEVEL, c.currentTime, 1.2);
}

function stopMusic(c: AudioContext): void {
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setTargetAtTime(0, c.currentTime, 0.2);
  }
  const m = music;
  window.setTimeout(() => {
    if (!wanted) m?.pause();
  }, 900);
}

/** Dip the music while something important rings out, then bring it back. */
export function duck(seconds = 3.5): void {
  const c = ctx;
  if (!c || !musicGain || !wanted) return;
  const t = c.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setTargetAtTime(MUSIC_LEVEL * DUCK_TO, t, 0.15);
  musicGain.gain.setTargetAtTime(MUSIC_LEVEL, t + seconds, 0.9);
}

/** Only used if the music file cannot be loaded. A soft two-voice drone with a slow filter sweep. */
function startDrone(c: AudioContext): void {
  if (droneOn || !musicGain) return;
  droneOn = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.7;
  const level = c.createGain();
  level.gain.value = 0.32;
  filter.connect(level).connect(musicGain);

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

// ---------------------------------------------------------------------------------------------
// Sound effects
// ---------------------------------------------------------------------------------------------
const buffers: Partial<Record<SfxName, AudioBuffer>> = {};
let loading: Promise<void> | null = null;

function loadSfx(c: AudioContext): Promise<void> {
  loading ??= Promise.all(
    (Object.keys(FILES) as SfxName[]).map(async (name) => {
      try {
        const res = await fetch(FILES[name]);
        if (!res.ok) return;
        buffers[name] = await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* that one effect stays silent; nothing else depends on it */
      }
    }),
  ).then(() => undefined);
  return loading;
}

const playing = new Map<SfxName, Set<{ src: AudioBufferSourceNode; gain: GainNode }>>();

export function play(name: SfxName, o: SfxOptions = {}): void {
  const c = ctx;
  const buf = buffers[name];
  if (!c || !sfxBus || !buf || !wanted || c.state !== 'running') {
    if (name === 'chime' && c && wanted && c.state === 'running') chime(); // synthesized stand-in
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const rate = o.rate ?? 1;
  src.playbackRate.value = rate;
  if (o.rateTo !== undefined) {
    src.playbackRate.setValueAtTime(rate, c.currentTime);
    src.playbackRate.linearRampToValueAtTime(o.rateTo, c.currentTime + (o.over ?? buf.duration));
  }
  const gain = c.createGain();
  gain.gain.value = LEVEL[name] * (o.gain ?? 1);
  src.connect(gain).connect(sfxBus);
  const entry = { src, gain };
  let set = playing.get(name);
  if (!set) playing.set(name, (set = new Set()));
  set.add(entry);
  src.onended = () => {
    set.delete(entry);
    gain.disconnect();
  };
  src.start();
}

/** Fade out and stop one sound, or every sound when no name is given. Music is not touched. */
export function stop(name?: SfxName, fadeSeconds = 0.3): void {
  const c = ctx;
  if (!c) return;
  const sets = name ? [playing.get(name)] : [...playing.values()];
  for (const set of sets) {
    for (const { src, gain } of set ?? []) {
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, c.currentTime);
      gain.gain.linearRampToValueAtTime(0, c.currentTime + fadeSeconds);
      try {
        src.stop(c.currentTime + fadeSeconds + 0.02);
      } catch {
        /* already stopped */
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// On / off
// ---------------------------------------------------------------------------------------------
function onVisibility(): void {
  const c = ctx;
  if (!c || !wanted) return;
  if (document.hidden) {
    music?.pause();
    void c.suspend();
  } else {
    void c.resume().then(() => void music?.play().catch(() => undefined));
  }
}

export async function setSound(on: boolean): Promise<boolean> {
  const c = ensure();
  if (!c || !master) return false;
  wanted = on;
  if (on) {
    // Start the music and the resume in the same breath as the tap: iOS only allows it then.
    const resumed = c.resume();
    startMusic(c);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(1, c.currentTime, 0.05);
    try {
      await resumed;
    } catch {
      wanted = false;
      return false;
    }
    void loadSfx(c);
  } else {
    stop(undefined, 0.15);
    stopMusic(c);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(0, c.currentTime, 0.25);
  }
  return true;
}

/** Synthesized bell. Only used if the chime file did not load. */
export function chime(): void {
  const c = ctx;
  if (!c || !sfxBus || !wanted) return;
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
    o.connect(v).connect(sfxBus);
    o.start(t);
    o.stop(t + d + 0.05);
  }
}