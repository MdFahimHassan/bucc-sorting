/**
 * Thin, eager facade. The real audio module (and every sound file) is only fetched after the first tap.
 * Every call is a silent no-op while sound is off, so screens can call these without checking.
 */
import type { SfxName, SfxOptions } from './audio';

export type { SfxName, SfxOptions };

type AudioMod = typeof import('./audio');
let mod: Promise<AudioMod> | null = null;
let on = false;

export function preloadAudio(): void {
  mod ??= import('./audio');
}

export function isSoundOn(): boolean {
  return on;
}

export async function toggleSound(): Promise<boolean> {
  preloadAudio();
  const m = await mod!;
  const next = !on;
  const ok = await m.setSound(next);
  on = ok ? next : false;
  return on;
}

/** Play one sound effect (see SfxName). */
export function sfx(name: SfxName, options?: SfxOptions): void {
  if (!on || !mod) return;
  void mod.then((m) => m.play(name, options)).catch(() => undefined);
}

/** Fade out one sound effect, or all of them when no name is given. The music keeps playing. */
export function stopSfx(name?: SfxName, fadeSeconds?: number): void {
  if (!mod) return;
  void mod.then((m) => m.stop(name, fadeSeconds)).catch(() => undefined);
}

/** The reveal bell. The music dips underneath it so it rings clearly. */
export function playChime(): void {
  if (!on || !mod) return;
  void mod
    .then((m) => {
      m.duck();
      m.play('chime');
    })
    .catch(() => undefined);
}