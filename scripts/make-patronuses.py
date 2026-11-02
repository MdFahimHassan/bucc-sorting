"""
Turns the seven rendered patronus images in scripts/patronus-src/ into sharp, transparent
WebP cut-outs in src/assets/patronus/.

The renders are bright silver-blue light on a dark forest, and only ~300px across, so:
  1. find the figure and crop around it,
  2. upscale the crop 4x with the EDSR super-resolution model (real detail, not just stretching),
  3. cut the light out of the forest: alpha from brightness, colour kept silver-blue,
  4. resize to a square and save.

Run when the source renders change (needs: pip install pillow numpy scipy opencv-contrib-python-headless).
The 38 MB EDSR model is downloaded once to scripts/.cache/ (git-ignored):
    python scripts/make-patronuses.py
Output is committed, so the site build never needs Python.
"""
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'patronus-src')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'patronus')
CACHE = os.path.join(HERE, '.cache')
MODEL = os.path.join(CACHE, 'EDSR_x4.pb')
MODEL_URL = 'https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x4.pb'
SIZE = 1024  # square output, px
PAD = 1.18  # crop margin around the figure, for glow and mist
NAMES = ['doe', 'phoenix', 'horse', 'terrier', 'otter', 'hare', 'stag']

LO, HI = 0.36, 0.74  # brightness window mapped to alpha 0..1


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def get_sr():
    if not os.path.exists(MODEL):
        os.makedirs(CACHE, exist_ok=True)
        print('downloading EDSR x4 model (38 MB)...')
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(MODEL)
    sr.setModel('edsr', 4)
    return sr


def light_mask(im, grow, feather):
    """Soft matte of the silver-blue light. `grow`/`feather` are in pixels of `im`."""
    r, b = im[..., 0], im[..., 2]
    peak = im.max(axis=2)
    # Silver-blue light: blue is never far below the brightest channel. Warm embers (r >> b) are not.
    coolness = np.clip((b - r) / 0.12 + 0.6, 0, 1)
    a = smoothstep((peak - LO) / (HI - LO)) * coolness

    # Keep only light that belongs to the figure: the biggest bright blob plus what sits close to it
    # (sparks and mist trailing off the body).
    core = ndi.binary_opening(a > 0.55, iterations=1)
    lab, n = ndi.label(core)
    if n == 0:
        raise SystemExit('nothing found')
    sizes = ndi.sum(core, lab, range(1, n + 1))
    body = lab == (1 + int(np.argmax(sizes)))
    dist = ndi.distance_transform_edt(~body)
    near = ndi.gaussian_filter((dist < grow).astype(np.float32), feather)
    return a * np.clip(near * 1.6, 0, 1), body, peak


def build(name, sr):
    src = np.asarray(Image.open(os.path.join(SRC, f'{name}.png')).convert('RGB'), np.float32) / 255

    # 1. locate the figure at source resolution, crop with margin
    _, body, _ = light_mask(src, 26, 9)
    ys, xs = np.where(body)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    hh, hw = (ys.max() - ys.min()) / 2 * PAD, (xs.max() - xs.min()) / 2 * PAD
    x0, y0 = int(max(0, round(cx - hw))), int(max(0, round(cy - hh)))
    x1, y1 = int(min(src.shape[1], round(cx + hw))), int(min(src.shape[0], round(cy + hh)))
    # Upscale only the figure's own box (not a padded square): wide animals like the otter stay cheap.
    sq = np.ascontiguousarray(src[y0:y1, x0:x1])

    # 2. super-resolve 4x
    big = sr.upsample(cv2.cvtColor((sq * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    big = cv2.cvtColor(big, cv2.COLOR_BGR2RGB).astype(np.float32) / 255

    # 3. cut the light out at the new resolution
    a, _, peak = light_mask(big, 26 * 4, 9 * 4)
    a = ndi.gaussian_filter(a, 0.9)
    rgb = np.clip(big / np.maximum(peak[..., None], 1e-3), 0, 1)
    core_w = smoothstep((peak - 0.55) / 0.35)[..., None]  # lift the core towards white so it reads as light
    rgb = rgb * (1 - 0.32 * core_w) + 0.32 * core_w

    img = Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), 'RGBA')
    # centre on a transparent square, so every patronus sits the same way in the app's ring
    side = max(img.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    sr = get_sr()
    for name in sys.argv[1:] or NAMES:  # optionally pass names to redo just some
        img = build(name, sr)
        path = os.path.join(OUT, f'{name}.webp')
        img.save(path, 'WEBP', quality=88, alpha_quality=92, method=6)
        print(f'{name}: {os.path.getsize(path) / 1024:.0f} KB')


if __name__ == '__main__':
    main()