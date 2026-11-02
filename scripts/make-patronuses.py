"""
Turns the seven rendered patronus images in scripts/patronus-src/ into transparent
WebP cut-outs in src/assets/patronus/.

The renders are bright silver-blue light on a dark forest. We treat that light as
additive: alpha comes from the brightness of each pixel, colour is un-premultiplied so
the glow keeps its true silver-blue, and the forest, embers and moss are dropped.
Each figure is then cropped to a square around itself so every patronus sits the same
way in the app's ring.

Run when the source renders change (needs: pip install pillow numpy scipy):
    python scripts/make-patronuses.py
Output is committed, so the site build never needs Python.
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'patronus-src')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'patronus')
SIZE = 640  # square output, px
NAMES = ['doe', 'phoenix', 'horse', 'terrier', 'otter', 'hare', 'stag']

LO, HI = 0.36, 0.74  # brightness window mapped to alpha 0..1


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def build(name):
    im = np.asarray(Image.open(os.path.join(SRC, f'{name}.png')).convert('RGB'), np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    peak = im.max(axis=2)

    # Silver-blue light: blue is never far below the brightest channel. Warm embers (r >> b) are not.
    coolness = np.clip((b - r) / 0.12 + 0.6, 0, 1)
    a = smoothstep((peak - LO) / (HI - LO)) * coolness

    # Keep only light that belongs to the figure: the biggest bright blob plus anything touching it
    # at a short distance (sparks and mist trailing off the body).
    core = ndi.binary_opening(a > 0.55, iterations=1)
    lab, n = ndi.label(core)
    if n == 0:
        raise SystemExit(f'{name}: nothing found')
    sizes = ndi.sum(core, lab, range(1, n + 1))
    body = lab == (1 + int(np.argmax(sizes)))
    near = ndi.gaussian_filter(ndi.binary_dilation(body, iterations=26).astype(np.float32), 9)
    a = ndi.gaussian_filter(a * np.clip(near * 1.6, 0, 1), 0.7)

    # Un-premultiply: pixel = colour * alpha. Brighter pixels become opaque pale silver, faint
    # ones become see-through blue mist.
    rgb = np.clip(im / np.maximum(peak[..., None], 1e-3), 0, 1)
    # lift towards white in the core so it reads as light, not paint
    core_w = smoothstep((peak - 0.55) / 0.35)[..., None]
    rgb = rgb * (1 - 0.32 * core_w) + 1.0 * (0.32 * core_w)

    # Crop square around the figure's body, padded for glow/mist.
    ys, xs = np.where(body)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    half = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 * 1.32
    box = (cx - half, cy - half, cx + half, cy + half)

    out = np.dstack([rgb, a])
    img = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')
    img = img.crop(tuple(int(round(v)) for v in box)).resize((SIZE, SIZE), Image.LANCZOS)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in NAMES:
        img = build(name)
        path = os.path.join(OUT, f'{name}.webp')
        img.save(path, 'WEBP', quality=90, alpha_quality=95, method=6)
        print(f'{name}: {os.path.getsize(path) / 1024:.0f} KB')


if __name__ == '__main__':
    main()