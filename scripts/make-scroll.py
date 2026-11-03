"""
Renders the textures for the ID-screen scroll into src/assets/scroll/:

  roll-body.webp        the paper cylinder (top and bottom rolls), shaded and fibrous
  roll-cap-l/r.webp     the rolled-up end of the sheet: a spiral of paper layers, with alpha
  tear-l/r.png          alpha masks for the torn left and right edges of the sheet
  tear-rim-l/r.webp     the pale, fibrous rim and the faint stain along those torn edges

    python scripts/make-scroll.py

Needs numpy, scipy and Pillow. Output is committed, so the site build never needs Python.
Everything is seeded, so re-running gives identical files. Tweak the constants and re-run.
"""
import os

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'assets', 'scroll')


def norm(a):
    a = a - a.mean()
    return a / (a.std() + 1e-9)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def lerp_palette(t, stops):
    """t in 0..1 -> RGB through (position, (r, g, b)) stops."""
    pos = np.array([p for p, _ in stops])
    cols = np.array([c for _, c in stops], dtype=float)
    return np.stack([np.interp(t, pos, cols[:, i]) for i in range(3)], axis=-1)


# --------------------------------------------------------------------------- torn edges

STRIP_W, STRIP_H = 60, 1280  # 2x; shown at 30 x (sheet height) CSS px, stretched vertically


def tear_profile(n, seed):
    """Where the paper ends, per row: broken, fractal, with a few deeper bites. 0..1."""
    r = np.random.default_rng(seed)
    total = np.zeros(n)
    for k, (period, amp) in enumerate([(420, 1.0), (180, 0.62), (80, 0.42), (34, 0.3), (14, 0.2), (6, 0.12)]):
        m = int(n / period) + 4
        v = r.standard_normal(m)
        s = np.interp(np.linspace(0, m - 4, n), np.arange(m), v)
        s = gaussian_filter1d(s, period * 0.16)
        s = norm(s)
        if k >= 3:  # torn paper breaks in angular notches, not smooth waves
            s = 1 - 2 * np.abs(np.tanh(s * 0.9))
        total += amp * s
    f = (total - total.min()) / (total.max() - total.min())
    f = f**1.15
    for _ in range(7):  # the odd deeper bite
        y0, w = r.integers(0, n), r.uniform(8, 30)
        f += 0.3 * np.exp(-(((np.arange(n) - y0) / w) ** 2)) * r.uniform(0.5, 1)
    return np.clip(f, 0, 1.15)


def tear_strip(seed):
    r = np.random.default_rng(seed + 100)
    e = 5 + 34 * tear_profile(STRIP_H, seed)  # edge x, in 2x px
    fibre = norm(gaussian_filter(r.standard_normal((STRIP_H, STRIP_W)), (0.7, 2.4)))
    grain = norm(gaussian_filter(r.standard_normal((STRIP_H, STRIP_W)), (1.6, 1.6)))
    x = np.arange(STRIP_W)[None, :]
    d = x - (e[:, None] + 2.4 * fibre)  # distance in from the torn line; < 0 is outside the paper
    cover = np.clip(d / 1.5 + 0.5, 0, 1)

    dd = np.clip(d, 0, None)
    pale = np.exp(-dd / 5.0) * np.clip(0.62 + 0.3 * fibre + 0.12 * grain, 0.1, 1) * 0.92  # torn fibres show paler
    stain = np.exp(-dd / 15.0) * np.clip(0.26 + 0.07 * grain, 0, 1)  # the damp, browned band just inside
    pale = pale * cover
    stain = stain * cover
    a = pale + stain * (1 - pale)
    pale_rgb = np.array([244, 232, 196], float)
    stain_rgb = np.array([112, 74, 30], float)
    rgb = (pale[..., None] * pale_rgb + (stain * (1 - pale))[..., None] * stain_rgb) / np.maximum(a[..., None], 1e-6)

    mask = np.zeros((STRIP_H, STRIP_W, 4), np.uint8)
    mask[..., :3] = 255
    mask[..., 3] = (cover * 255).astype(np.uint8)
    rim = np.zeros((STRIP_H, STRIP_W, 4), np.uint8)
    rim[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rim[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(mask, 'RGBA'), Image.fromarray(rim, 'RGBA')


# --------------------------------------------------------------------------- the roll body

BODY_W, BODY_H = 512, 88  # 2x; the roll is 44 CSS px tall


def roll_body():
    r = np.random.default_rng(11)
    u = (np.arange(BODY_H) + 0.5) / BODY_H
    phi = (u - 0.5) * np.pi * 0.98
    b = np.clip(np.cos(phi + 0.5), 0, 1)  # light from above and in front
    refl = 0.13 * np.exp(-(((u - 0.9) / 0.07) ** 2))  # warm bounce from the sheet below
    shade = 0.2 + 0.8 * b + refl
    shade = np.repeat(shade[:, None], BODY_W, axis=1)

    fibre = norm(gaussian_filter(r.standard_normal((BODY_H, BODY_W)), (0.7, 38)))
    blotch = norm(gaussian_filter(r.standard_normal((BODY_H, BODY_W)), (7, 34)))
    grain = norm(gaussian_filter(r.standard_normal((BODY_H, BODY_W)), (0.9, 0.9)))
    shade = shade * (1 + 0.035 * fibre + 0.09 * blotch + 0.025 * grain)

    # Where the loose end of the sheet laps over the layer beneath it: a low step with a thin shadow.
    x = np.arange(BODY_W)
    wob = gaussian_filter1d(r.standard_normal(BODY_W), 40)
    wob = 2.2 * wob / (np.abs(wob).max() + 1e-9)
    yy = np.arange(BODY_H)[:, None]
    seam_y = (0.7 * BODY_H + wob)[None, :]
    below = smoothstep(-1.0, 1.0, yy - seam_y)
    shade = shade * (1 - 0.06 * below)  # slightly lower than the layer above it
    shade = shade * (1 - 0.32 * np.exp(-(((yy - seam_y - 0.6) / 1.5) ** 2)))  # shadow line
    shade = shade * (1 + 0.1 * np.exp(-(((yy - seam_y + 2.2) / 1.6) ** 2)))  # lit lip above it

    # A few faint crossways creases, where the paper has been bent.
    for cx, lean, depth in [(70, 5, 0.1), (190, -7, 0.13), (330, 6, 0.09), (440, -4, 0.12)]:
        line = cx + lean * (yy - BODY_H / 2) / BODY_H
        shade = shade * (1 - depth * np.exp(-(((x[None, :] - line) / 1.6) ** 2)) * (0.5 + 0.5 * np.sin(np.pi * u))[:, None])

    # Close to the ends the roll falls into shadow, where the spiral caps sit over it.
    edge = np.minimum(x, BODY_W - 1 - x)[None, :]
    shade = shade * (0.8 + 0.2 * smoothstep(0, 46, edge))

    t = np.clip(shade, 0, 1.15) / 1.15
    rgb = lerp_palette(
        t,
        [(0.0, (60, 41, 20)), (0.3, (134, 104, 60)), (0.58, (196, 168, 116)), (0.82, (226, 207, 160)), (1.0, (242, 229, 194))],
    )
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')


# --------------------------------------------------------------------------- the spiral end caps

SS = 4  # supersample
CAP_W, CAP_H = 56, 96  # final px (2x); shown at 28 x 48 CSS px


def roll_cap(mirror):
    r = np.random.default_rng(5 if not mirror else 6)
    W, H = CAP_W * SS, CAP_H * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cx, cy = W * 0.5, H * 0.5
    rx, ry = W / 2 - 2 * SS, H / 2 - 2 * SS
    xn, yn = (xx - cx) / rx, (yy - cy) / ry
    if mirror:
        xn = -xn
    rho = np.sqrt(xn**2 + yn**2)
    theta = np.arctan2(yn, xn)

    # The sheet spirals inward: layers are not perfectly even or perfectly round.
    warp = 0.045 * norm(gaussian_filter(r.standard_normal((H, W)), (14 * SS / 4, 14 * SS / 4)))
    rho_w = np.clip(rho + warp * smoothstep(0.1, 0.6, rho), 0, None)
    turns = 9.5
    phase = rho_w**0.92 * turns + theta / (2 * np.pi)
    f = phase % 1.0

    face = 1 - smoothstep(0.86, 0.9, f)  # 1 on the exposed edge of a layer, 0 in the gap between layers
    gap = smoothstep(0.86, 0.9, f) * (1 - smoothstep(0.97, 1.0, f))
    layer = 0.82 - 0.3 * (f / 0.86) + 0.06 * norm(gaussian_filter(r.standard_normal((H, W)), (2 * SS, 2 * SS)))

    face_rgb = lerp_palette(np.clip(layer, 0, 1), [(0.0, (112, 82, 44)), (0.55, (190, 162, 108)), (1.0, (226, 206, 160))])
    gap_rgb = np.array([84, 58, 28], float)
    rgb = face[..., None] * face_rgb + (1 - face)[..., None] * gap_rgb
    rgb = rgb * (1 - 0.1 * gap[..., None])

    # Deep in the roll it is dark; the hollow at the centre is nearly black.
    depth = 0.12 + 0.95 * smoothstep(0.05, 0.55, rho)
    light = 1.0 + 0.2 * (-xn * 0.55 - yn * 0.85)
    rgb = rgb * (depth * light)[..., None]
    rgb = rgb * (1 + 0.07 * norm(gaussian_filter(r.standard_normal((H, W)), (1.4 * SS, 1.4 * SS))))[..., None]
    # The outermost turn is a touch proud of the rest, with a thin dark rim.
    rgb = rgb * (1 - 0.45 * smoothstep(0.9, 1.0, rho))[..., None]

    ang = gaussian_filter1d(r.standard_normal(720), 6)
    ang = norm(ang)
    rough = 1.0 + 0.016 * np.interp((theta + np.pi) / (2 * np.pi) * 720, np.arange(720), ang)
    alpha = np.clip((rough - rho) * rx / SS * 1.0 * 0.9 + 0.5, 0, 1)

    img = np.zeros((H, W, 4), np.uint8)
    img[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    img[..., 3] = (alpha * 255).astype(np.uint8)
    im = Image.fromarray(img, 'RGBA').convert('RGBa').resize((CAP_W, CAP_H), Image.LANCZOS).convert('RGBA')
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    roll_body().save(os.path.join(OUT, 'roll-body.webp'), 'WEBP', quality=88, method=6)
    for side, mirror in (('l', False), ('r', True)):
        roll_cap(mirror).save(os.path.join(OUT, f'roll-cap-{side}.webp'), 'WEBP', quality=90, alpha_quality=95, method=6)
    for side, seed in (('l', 3), ('r', 8)):
        mask, rim = tear_strip(seed)
        if side == 'r':
            mask, rim = mask.transpose(Image.FLIP_LEFT_RIGHT), rim.transpose(Image.FLIP_LEFT_RIGHT)
        mask.save(os.path.join(OUT, f'tear-{side}.png'), optimize=True)
        rim.save(os.path.join(OUT, f'tear-rim-{side}.webp'), 'WEBP', quality=80, alpha_quality=80, method=6)
    for f in sorted(os.listdir(OUT)):
        print(f'{f}: {os.path.getsize(os.path.join(OUT, f)) / 1024:.1f} KB')


if __name__ == '__main__':
    main()