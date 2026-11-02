"""
Draws the seven patronus figures from scratch (tapered, smoothly joined body parts),
bakes in the glow, inner wisps, trailing mist and sparks, and writes small transparent
WebP files to src/assets/patronus/. Colour is NOT baked in: the image is white with a
varying alpha, and the app tints it per department at runtime.

Run once (needs: pip install pillow numpy scipy):
    python scripts/make-patronuses.py
Output is committed, so the site build never needs Python.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from scipy.interpolate import make_interp_spline

W = 768  # working size; exported at OUT
OUT = 384
BIG = 2  # supersample for the shape pass


def spline(pts, n=None):
    p = np.array(pts, float)
    if len(p) == 2:
        k = 1
    elif len(p) == 3:
        k = 2
    else:
        k = 3
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    n = n or max(8, int(d[-1] / 1.2))
    t = np.linspace(0, d[-1], n)
    s = make_interp_spline(d, p, k=k)
    return s(t), t / d[-1]


def draw_part(dr, pts, radii, scale, off):
    path, u = spline(pts)
    r = np.interp(u, np.linspace(0, 1, len(radii)), radii)
    for (x, y), rr in zip(path, r):
        X, Y, R = x * scale + off[0], y * scale + off[1], rr * scale
        dr.ellipse([X - R, Y - R, X + R, Y + R], fill=255)


def shape_mask(parts):
    """Draw all parts on a big canvas, then crop to the bbox and fit into W with a margin."""
    S, off, N = 2.0, (300, 300), 1500
    im = Image.new('L', (N, N), 0)
    dr = ImageDraw.Draw(im)
    for pts, radii in parts:
        draw_part(dr, pts, radii, S, off)
    bb = im.getbbox()
    im = im.crop(bb)
    m = 52
    k = (W - 2 * m) / max(im.size)
    im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)
    out = Image.new('L', (W, W), 0)
    out.paste(im, ((W - im.size[0]) // 2, (W - im.size[1]) // 2))
    return np.asarray(out, float) / 255.0


def streaks(rng, sx, sy):
    a = gaussian_filter(rng.normal(size=(W, W)), (sy, sx))
    b = gaussian_filter(rng.normal(size=(W, W)), (sy * 2.2, sx * 2.2))
    n = a / a.std() * 0.6 + b / b.std() * 0.4
    lo, hi = np.percentile(n, [5, 95])
    return np.clip((n - lo) / (hi - lo), 0, 1)


def bake(M, name, trail='left', seed=1):
    rng = np.random.default_rng(seed)
    horiz = trail in ('left', 'right')
    st = streaks(rng, 22, 7) if horiz else streaks(rng, 7, 22)

    core = gaussian_filter(M, 1.6)
    inner = gaussian_filter(M, 15)
    edge = np.clip(core - gaussian_filter(M, 7) * 0.9, 0, 1)
    edge /= max(edge.max(), 1e-6)
    thin = 1 - np.clip(inner * 1.6, 0, 1)            # thin parts (legs, antlers) glow brighter
    shade = 0.5 + 0.42 * edge + 0.22 * thin
    cl = gaussian_filter(rng.normal(size=(W, W)), 26)
    lo, hi = np.percentile(cl, [5, 95])
    cl = np.clip((cl - lo) / (hi - lo), 0, 1)
    shade *= (0.86 + 0.14 * st) * (0.78 + 0.22 * cl)
    body = core * np.clip(shade, 0, 1)

    ys, xs = np.mgrid[0:W, 0:W] / W
    ax = {'left': xs, 'right': 1 - xs, 'down': 1 - ys, 'up': ys}[trail]
    fade = np.clip(0.2 + 1.2 * ax, 0, 1) ** 0.9
    low = np.clip(1.3 - 1.5 * ys, 0, 1) if horiz else 1.0
    body *= fade * (0.5 + 0.5 * low)

    # trailing wisps: soft, noisy, and dissolving away from the body
    sh = {'left': (0, -48), 'right': (0, 48), 'down': (48, 0), 'up': (-48, 0)}[trail]
    t = gaussian_filter(M, (9, 40) if horiz else (40, 9))
    t = np.roll(t, sh[1], axis=1) if horiz else np.roll(t, sh[0], axis=0)
    t = gaussian_filter(t * (0.2 + 1.1 * st) * (1 - np.clip(M * 1.5, 0, 1)), 5)
    t = np.clip(t * 1.25, 0, 1) * 0.42 * np.clip(ax * 1.6, 0, 1)

    halo = gaussian_filter(M, 24) * 0.4 + gaussian_filter(M, 9) * 0.2

    sp = np.zeros((W, W))
    near = np.argwhere(gaussian_filter(M, 30) > 0.1)
    if len(near):
        for i in rng.choice(len(near), size=min(55, len(near)), replace=False):
            y, x = near[i]
            sp[y, x] = rng.uniform(0.4, 1)
        sp = np.clip(gaussian_filter(sp, 2.0) * 40, 0, 0.85)

    a = np.clip(body * 1.1 + halo * 0.5 + t + sp * 0.8, 0, 1)
    ed = np.minimum.reduce([xs, 1 - xs, ys, 1 - ys])
    a *= np.clip(ed / 0.1, 0, 1) ** 1.5

    img = Image.fromarray((a * 255).astype(np.uint8), 'L').resize((OUT, OUT), Image.LANCZOS)
    rgba = Image.new('RGBA', (OUT, OUT), (255, 255, 255, 0))
    rgba.putalpha(img)
    return rgba


# ---------------------------------------------------------------- the animals
# Each part: (points, radii). Y points down, the animal faces right.
# Coordinates are free-form; the figure is auto-fitted into the frame.

ANIMALS = {}

ANIMALS['stag'] = ('left', [
    ([(120, 250), (190, 244), (270, 244), (322, 238)], [36, 52, 54, 46]),            # body
    ([(300, 220), (345, 168), (382, 126)], [38, 26, 19]),                             # neck
    ([(386, 118), (430, 152)], [19, 10]), ([(430, 154), (440, 160)], [10, 8]),        # head
    ([(368, 106), (346, 88)], [9, 4]), ([(392, 104), (404, 82)], [8, 4]),             # ears
    ([(112, 232), (96, 222)], [9, 4]),                                                # tail
    ([(330, 272), (336, 330), (326, 390), (333, 446)], [22, 13, 8, 7]),               # front near
    ([(344, 272), (372, 322), (392, 368), (404, 408)], [18, 11, 7, 6]),               # front far
    ([(150, 252), (132, 312), (156, 362), (146, 440)], [38, 20, 9, 7]),               # hind near
    ([(178, 262), (192, 330), (196, 384), (206, 440)], [28, 14, 8, 6]),               # hind far
    ([(376, 108), (352, 72), (338, 32), (344, -14)], [6, 5, 4, 2.5]),                 # antler L
    ([(352, 72), (322, 62)], [4, 2]), ([(341, 40), (314, 20)], [4, 2]), ([(340, 10), (372, -4)], [3.5, 2]),
    ([(386, 106), (394, 66), (420, 28), (446, -14)], [6, 5, 4, 2.5]),                 # antler R
    ([(394, 66), (370, 48)], [4, 2]), ([(414, 36), (384, 14)], [4, 2]), ([(424, 24), (458, 30)], [3.5, 2]),
])

ANIMALS['hare'] = ('left', [
    ([(150, 280), (240, 262), (322, 250)], [46, 48, 38]),                             # body
    ([(160, 286)], [52]) if False else ([(150, 284), (168, 292)], [52, 48]),          # haunch
    ([(338, 238), (388, 232)], [34, 24]), ([(392, 236), (420, 246)], [22, 10]),       # head
    ([(352, 214), (346, 150), (334, 96)], [13, 9, 4]),                                # ear 1
    ([(372, 212), (384, 148), (398, 104)], [12, 8, 3.5]),                             # ear 2
    ([(150, 300), (92, 328), (44, 348)], [38, 20, 10]), ([(44, 348), (14, 352)], [9, 7]),  # hind leg
    ([(330, 284), (376, 322), (418, 340)], [22, 11, 7]),                              # front leg
    ([(318, 292), (352, 336), (388, 360)], [18, 10, 6]),
    ([(108, 262), (98, 254)], [15, 10]),                                              # tail
])

ANIMALS['otter'] = ('left', [
    ([(116, 296), (214, 280), (312, 272)], [40, 50, 46]),                             # body
    ([(332, 262), (372, 244)], [44, 38]),                                             # chest -> head
    ([(372, 240), (398, 242)], [38, 30]), ([(402, 252), (424, 262)], [22, 15]),       # head + muzzle
    ([(358, 208), (366, 200)], [11, 8]),                                              # ear
    ([(96, 304), (56, 326), (26, 366), (8, 414)], [40, 30, 17, 6]),                   # thick tail
    ([(310, 308), (320, 346), (346, 362)], [22, 14, 12]),                             # front legs
    ([(270, 316), (276, 350), (298, 364)], [18, 12, 10]),
    ([(170, 316), (158, 352), (184, 368)], [26, 16, 13]),                             # hind legs
    ([(214, 318), (212, 352), (234, 366)], [20, 13, 11]),
])

ANIMALS['terrier'] = ('left', [
    ([(150, 262), (250, 258), (312, 252)], [42, 48, 46]),                             # body
    ([(322, 240), (352, 202)], [36, 28]),                                             # neck
    ([(358, 196), (392, 204)], [28, 24]), ([(402, 212), (434, 226)], [19, 11]),       # head + muzzle
    ([(350, 184), (342, 210)], [13, 8]),                                             # folded ear
    ([(112, 240), (90, 204), (82, 168)], [13, 8, 4]),                                 # tail
    ([(322, 292), (326, 352), (322, 422)], [21, 11, 9]),                              # legs
    ([(290, 294), (290, 352), (292, 422)], [18, 10, 8]),
    ([(150, 284), (134, 338), (146, 376), (130, 424)], [31, 18, 10, 9]),
    ([(186, 292), (182, 352), (186, 422)], [24, 12, 9]),
])

ANIMALS['horse'] = ('left', [
    ([(140, 252), (250, 248), (332, 250)], [48, 56, 54]),                             # body
    ([(318, 226), (360, 164), (386, 118)], [54, 38, 30]),                             # neck
    ([(394, 104), (430, 142), (458, 186)], [27, 21, 14]),                             # head
    ([(384, 76), (380, 50)], [9, 4]), ([(402, 80), (412, 56)], [8, 4]),               # ears
    ([(342, 100), (306, 134), (288, 196)], [11, 7, 3]),                               # mane
    ([(362, 86), (322, 100), (284, 130)], [9, 5, 2]),
    ([(102, 214), (62, 228), (36, 280), (24, 346)], [15, 13, 8, 3]),                  # tail
    ([(96, 224), (54, 214), (22, 232)], [10, 6, 2]),
    ([(334, 286), (378, 322), (422, 336)], [26, 15, 10]),                             # front near, reaching
    ([(312, 292), (334, 338), (304, 372), (324, 398)], [22, 13, 9, 7]),               # front far, folded
    ([(140, 292), (100, 332), (60, 370), (30, 382)], [38, 21, 11, 8]),                # hind near, pushing
    ([(172, 298), (166, 346), (192, 390), (178, 434)], [30, 18, 11, 8]),
])

_wing = []
for side in (-1, 1):
    def P(x, y):
        return (256 + side * (x - 256) * -1 if False else 256 + side * x, y)
    _wing.append(([P(-16, 240), P(-100, 196), P(-165, 118), P(-205, 28)], [30, 40, 28, 3]))
    _wing.append(([P(-16, 252), P(-110, 246), P(-185, 214), P(-236, 160)], [24, 26, 17, 3]))
    _wing.append(([P(-16, 264), P(-100, 286), P(-170, 284), P(-214, 252)], [20, 20, 12, 2]))
    _wing.append(([P(-16, 276), P(-80, 318), P(-130, 328)], [16, 14, 3]))
ANIMALS['phoenix'] = ('down', _wing + [
    ([(256, 214), (256, 304)], [32, 24]),                                             # body
    ([(256, 212), (264, 174)], [19, 16]), ([(270, 160), (272, 158)], [22, 20]),       # neck, head
    ([(286, 164), (316, 176)], [10, 2]),                                              # beak
    ([(262, 138), (250, 106), (238, 78)], [8, 5, 1.5]), ([(274, 140), (286, 106), (304, 86)], [8, 5, 1.5]),
    ([(256, 296), (230, 380), (186, 468), (160, 536)], [17, 12, 6, 2]),               # tail
    ([(256, 296), (246, 392), (226, 484), (214, 560)], [16, 11, 5, 2]),
    ([(256, 296), (258, 396), (262, 488), (266, 566)], [16, 11, 5, 2]),
    ([(256, 296), (270, 392), (298, 484), (318, 556)], [16, 11, 5, 2]),
    ([(256, 296), (284, 380), (330, 468), (358, 532)], [17, 12, 6, 2]),
])


ANIMALS['doe'] = ('left', [
    ([(130, 268), (216, 264), (292, 258)], [36, 46, 44]),                             # body
    ([(292, 242), (328, 206), (352, 174)], [34, 25, 19]),                             # neck
    ([(364, 164), (402, 178)], [20, 12]), ([(406, 180), (418, 184)], [10, 8]),        # head + muzzle
    ([(350, 152), (332, 136), (318, 130)], [14, 10, 4]), ([(366, 144), (372, 126), (372, 112)], [12, 9, 4]),         # leaf ears
    ([(108, 248), (92, 234)], [9, 4]),                                                # tail
    ([(286, 296), (290, 350), (285, 396), (289, 436)], [18, 11, 6, 5]),
    ([(314, 294), (326, 346), (340, 392), (350, 430)], [15, 9, 5, 4]),
    ([(142, 294), (122, 344), (142, 388), (130, 436)], [28, 16, 8, 5]),
    ([(178, 298), (188, 346), (192, 392), (202, 436)], [21, 11, 6, 5]),
])


def main():
    outdir = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'patronus')
    os.makedirs(outdir, exist_ok=True)
    sheet = Image.new('RGBA', (OUT * 4, OUT * 2), (6, 9, 22, 255))
    for i, (name, (trail, parts)) in enumerate(ANIMALS.items()):
        M = shape_mask(parts)
        im = bake(M, name, trail, seed=i + 3)
        path = os.path.join(outdir, f'{name}.webp')
        im.save(path, 'WEBP', quality=78, alpha_quality=80, method=6)
        print(f'{name:8s} {os.path.getsize(path) / 1024:5.1f} KB')
        tint = Image.new('RGBA', im.size, (150, 215, 255, 255))
        tint.putalpha(im.getchannel('A'))
        sheet.alpha_composite(tint, ((i % 4) * OUT, (i // 4) * OUT))
    if '--sheet' in sys.argv:
        sheet.convert('RGB').save('/tmp/patronus-sheet.png')


if __name__ == '__main__':
    main()