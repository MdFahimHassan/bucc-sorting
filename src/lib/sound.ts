/** Thin, eager facade. The real audio module is only fetched after the first tap. */
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

export function playChime(): void {
  if (!on || !mod) return;
  void mod.then((m) => m.chime()).catch(() => undefined);
}
