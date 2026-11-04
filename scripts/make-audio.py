#!/usr/bin/env python3
"""
Builds the small audio files in src/assets/audio/ from the original downloads.

    python3 scripts/make-audio.py <folder with the original sound effects> <original music .mp3>

Needs: ffmpeg (with libmp3lame) and numpy. Not part of `npm run build`; the output is committed.

What it does
- Sound effects: cuts each one to the useful part, trims leading silence, fades the ends,
  matches loudness (RMS) so the levels in src/lib/audio.ts are easy to reason about, and
  encodes mono 64 kbps MP3.
- Heartbeat: the original is 93% below 60 Hz, which phone speakers cannot play, so it sounded
  "low". Harmonics are added (80-400 Hz) so the thump is audible on a phone.
- Music: cross-fades the end into the start so the loop has no seam, evens out the loudness
  and encodes 64 kbps stereo. It is streamed, never decoded into memory.

Sources (all free for this use; credits are in the README):
  Pixabay Content License (https://pixabay.com/service/license-summary/)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / 'src' / 'assets' / 'audio'

# name: (filename contains, start s, length s, fade-in s, fade-out s, target RMS dBFS)
SFX = {
    'heartbeat': ('heartbeat', 0.0, 8.05, 0.05, 0.4, -15.0),
    'wings': ('dragon-wings', 6.3, 3.0, 0.45, 0.9, -20.0),
    'rope': ('rope', 0.0, 1.68, 0.02, 0.2, -23.0),
    'paper': ('paper-handling', 2.55, 1.2, 0.02, 0.3, -22.0),
    'quill': ('quill-pen', 93.5, 1.7, 0.1, 0.6, -25.0),
    'stamp': ('traditional-stamp', 0.0, 1.1, 0.0, 0.35, -17.0),
    'swoosh': ('thin-swoosh', 0.0, 1.1, 0.0, 0.3, -20.0),
    'sparkle': ('glitter-wand', 0.0, 3.0, 0.0, 1.0, -22.0),
    'crack': ('glass-bottle', 0.0, 1.1, 0.0, 0.4, -18.0),
    'tick': ('mouse-click', 0.0, 0.3, 0.0, 0.05, -24.0),
    'chime': ('discovery-chime', 0.0, 5.2, 0.0, 1.3, -20.0),
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def biquad_hp(x: np.ndarray, fc: float) -> np.ndarray:
    """One-pole-ish high-pass, enough to remove rumble/DC without a SciPy dependency."""
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    prev_x = prev_y = 0.0
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x)
        prev_x = v
        y[i] = prev_y
    return y


def lowpass(x: np.ndarray, fc: float) -> np.ndarray:
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s)
        y[i] = s
    return y


def make_audible_on_phones(x: np.ndarray) -> np.ndarray:
    """Add harmonics above the fundamental so a sub-bass thump reads on small speakers."""
    base = x / max(np.max(np.abs(x)), 1e-6)
    odd = biquad_hp(np.tanh(5 * base), 70)  # 3rd, 5th... harmonics
    even = biquad_hp(np.abs(base) * 2 - np.mean(np.abs(base)) * 2, 70)  # 2nd harmonic
    y = 0.55 * base + 0.9 * odd + 0.6 * even
    y = lowpass(y, 450)  # keep it a thump, not a click
    # Phone speakers cannot play below ~70 Hz, but that energy would still eat the loudness budget
    # when the clip is levelled. Remove it so the audible part gets the volume.
    return biquad_hp(biquad_hp(y, 65), 65)


def trim_leading_silence(x: np.ndarray, floor_db: float = -42.0) -> np.ndarray:
    thr = 10 ** (floor_db / 20)
    idx = np.argmax(np.abs(x) > thr)
    start = max(0, int(idx) - int(0.012 * SR))
    return x[start:]


def finish(x: np.ndarray, fi: float, fo: float, target_db: float) -> np.ndarray:
    n = len(x)
    env = np.ones(n, dtype=np.float32)
    a, b = int(fi * SR), int(fo * SR)
    if a:
        env[:a] = np.linspace(0, 1, a) ** 2
    if b:
        env[-b:] = np.minimum(env[-b:], np.linspace(1, 0, b) ** 1.5)
    x = x * env
    rms = np.sqrt(np.mean(x[x != 0] ** 2)) if np.any(x) else 1e-6
    # RMS over the loud part only (the tail of a decaying sound should not pull the gain up).
    win = SR // 4
    loud = [np.sqrt(np.mean(x[i : i + win] ** 2)) for i in range(0, max(1, n - win), win // 2)]
    rms = np.percentile(loud, 85) if loud else rms
    x = x * (10 ** (target_db / 20) / max(rms, 1e-6))
    # Soft limiter so the boosted peaks never clip.
    return np.tanh(x * 0.9) / np.tanh(0.9) * 0.94


def encode(x: np.ndarray, out: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', tmp.name],
            input=x.astype(np.float32).tobytes(),
            check=True,
        )
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k',
             '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', str(out)],
            check=True,
        )


def music(src: Path, out: Path, xfade: float = 4.0) -> None:
    """Seamless loop: the last `xfade` seconds are blended into the first `xfade` seconds, so the
    file ends exactly where its own second `xfade` mark begins, and looping has no seam."""
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(src), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True,
    ).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    n = int(xfade * SR)
    head, body, tail = a[:n], a[n:-n], a[-n:]
    t = np.linspace(0, np.pi / 2, n, dtype=np.float32)[:, None]
    blend = tail * np.cos(t) + head * np.sin(t)  # equal-power
    loop = np.concatenate([body, blend]).astype(np.float32)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', tmp.name],
            input=loop.tobytes(), check=True,
        )
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-af', 'loudnorm=I=-19:TP=-2:LRA=9',
             '-ar', str(SR), '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '64k', '-joint_stereo', '1',
             '-map_metadata', '-1', '-id3v2_version', '0', str(out)],
            check=True,
        )


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    folder, music_src = Path(sys.argv[1]), Path(sys.argv[2])
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(folder.glob('*.mp3'))
    for name, (key, start, length, fi, fo, target) in SFX.items():
        match = next((f for f in files if key in f.name.lower()), None)
        if match is None:
            sys.exit(f'No file containing "{key}" in {folder}')
        x = decode(match)[int(start * SR) : int((start + length) * SR)]
        if name == 'heartbeat':
            x = make_audible_on_phones(x)
        elif name in ('rope', 'quill'):
            x = lowpass(biquad_hp(x, 120), 9000)  # these are boosted a lot: keep the hiss down
        x = trim_leading_silence(x) if name in ('stamp', 'tick', 'crack') else x
        encode(finish(x, fi, fo, target), OUT / f'{name}.mp3')
        print(f'{name}.mp3', (OUT / f'{name}.mp3').stat().st_size, 'bytes')
    music(music_src, OUT / 'music.mp3')
    print('music.mp3', (OUT / 'music.mp3').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()