import { isCompactDevice, prefersReducedMotion } from './motion';

/**
 * Tiny canvas particle system: embers, wand-trail sparks and colour bursts.
 *
 * - One pooled array, no per-frame allocation after warm-up.
 * - Soft glows are pre-rendered sprites drawn with drawImage (no shadowBlur, no filters).
 * - Hard cap: 60 on phones, 150 on desktop. If average FPS stays under ~45 the cap shrinks.
 * - Pauses when the tab is hidden and idles (no rAF) when nothing is alive.
 *
 * A module-level singleton is used so screens can drive it from effects without
 * worrying about mount order; <ParticleLayer> attaches the canvas.
 */

type Kind = 'ember' | 'spark' | 'burst';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  sprite: HTMLCanvasElement;
  phase: number;
  drag: number;
  gravity: number;
  peak: number;
}

const EMBER_COLORS = ['#ffb347', '#ffd27a', '#ff8a3d', '#ffe3a1'];
const SPARK_COLORS = ['#fff3c4', '#f3d98c', '#ffd27a'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;

  private live: Particle[] = [];
  private free: Particle[] = [];
  private sprites = new Map<string, HTMLCanvasElement>();
  private emberCount = 0;
  private sparkCount = 0;

  private raf = 0;
  private last = 0;
  private hidden = false;

  private emberLevel = 0;
  private emberColors: readonly string[] = EMBER_COLORS;
  private speed = 1;
  private reduced = prefersReducedMotion();

  readonly maxCap = isCompactDevice() ? 60 : 150;
  private cap = this.maxCap;
  private readonly minCap = 24;

  private frames = 0;
  private acc = 0;
  private lastTrail = 0;

  /* ---------- lifecycle ---------- */

  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    this.detach();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.hidden = document.hidden;
    this.ensureRunning();
  }

  detach(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas = null;
    this.ctx = null;
  }

  private resize = (): void => {
    const c = this.canvas;
    if (!c) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    c.width = Math.floor(this.w * this.dpr);
    c.height = Math.floor(this.h * this.dpr);
  };

  private onVisibility = (): void => {
    this.hidden = document.hidden;
    if (this.hidden) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else this.ensureRunning();
  };

  private ensureRunning(): void {
    if (this.raf || !this.ctx || this.hidden) return;
    this.last = performance.now();
    this.frames = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---------- public controls ---------- */

  /** 0 = none, 1 = full ember field. */
  setEmbers(level: number, colors: readonly string[] = EMBER_COLORS): void {
    this.emberLevel = Math.max(0, Math.min(1, level));
    this.emberColors = colors;
    if (this.emberLevel > 0) this.ensureRunning();
  }

  /** Multiplies ember motion; raise it to build tension. */
  setSpeed(multiplier: number): void {
    this.speed = Math.max(0.2, multiplier);
  }

  /** Sparks along a finger or mouse path. Throttled and capped. */
  trail(x: number, y: number): void {
    if (this.reduced || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTrail < 26) return;
    this.lastTrail = now;
    if (this.sparkCount >= Math.floor(this.cap * 0.4)) return;
    for (let i = 0; i < 2; i++) {
      const p = this.obtain('spark');
      p.x = x + rand(-4, 4);
      p.y = y + rand(-4, 4);
      p.vx = rand(-26, 26);
      p.vy = rand(-40, 10);
      p.life = rand(0.45, 0.85);
      p.size = rand(7, 14);
      p.sprite = this.sprite(pick(SPARK_COLORS));
      p.gravity = 90;
      p.drag = 1.2;
      p.peak = 0.9;
    }
    this.ensureRunning();
  }

  /** Radial burst in a department colour. */
  burst(x: number, y: number, color: string, count = 36): void {
    if (!this.ctx) return;
    const n = this.reduced ? Math.ceil(count / 4) : count;
    this.makeRoom(n);
    const room = Math.max(0, this.cap - this.live.length);
    const total = Math.min(n, room);
    for (let i = 0; i < total; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(70, 360);
      const p = this.obtain('burst');
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = rand(0.8, 1.7);
      p.size = rand(7, 16);
      p.sprite = this.sprite(i % 4 === 0 ? '#ffffff' : color);
      p.gravity = 40;
      p.drag = 2.1;
      p.peak = 1;
    }
    this.ensureRunning();
  }

  clear(): void {
    for (const p of this.live) this.free.push(p);
    this.live.length = 0;
    this.emberCount = 0;
    this.sparkCount = 0;
  }

  /* ---------- internals ---------- */

  private sprite(color: string): HTMLCanvasElement {
    const hit = this.sprites.get(color);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d')!;
    const [r, gr, b] = hexToRgb(color);
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.18, `rgba(${r},${gr},${b},0.85)`);
    grad.addColorStop(0.55, `rgba(${r},${gr},${b},0.22)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    this.sprites.set(color, c);
    return c;
  }

  private obtain(kind: Kind): Particle {
    const p =
      this.free.pop() ??
      ({
        kind,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        life: 1,
        size: 8,
        sprite: this.sprite('#ffd27a'),
        phase: 0,
        drag: 0,
        gravity: 0,
        peak: 1,
      } satisfies Particle);
    p.kind = kind;
    p.age = 0;
    p.phase = Math.random() * 6.28;
    this.live.push(p);
    if (kind === 'ember') this.emberCount++;
    else if (kind === 'spark') this.sparkCount++;
    return p;
  }

  private release(index: number): void {
    const p = this.live[index]!;
    const lastP = this.live[this.live.length - 1]!;
    this.live[index] = lastP;
    this.live.pop();
    if (p.kind === 'ember') this.emberCount--;
    else if (p.kind === 'spark') this.sparkCount--;
    this.free.push(p);
  }

  /** Make space for a burst by retiring the oldest embers and sparks first. */
  private makeRoom(n: number): void {
    let i = 0;
    while (this.live.length + n > this.cap && i < this.live.length) {
      if (this.live[i]!.kind !== 'burst') this.release(i);
      else i++;
    }
  }

  private spawnEmber(): void {
    const p = this.obtain('ember');
    p.x = rand(0, this.w);
    p.y = this.h + 12;
    p.vx = rand(-12, 12);
    p.vy = -rand(22, 70);
    p.life = rand(4.5, 8.5);
    p.size = rand(6, 17);
    p.sprite = this.sprite(pick(this.emberColors));
    p.gravity = 0;
    p.drag = 0;
    p.peak = rand(0.45, 0.9);
  }

  private measure(rawMs: number): void {
    this.frames++;
    if (this.frames <= 20) return; // warm-up
    this.acc += rawMs;
    if (this.frames - 20 >= 60) {
      const fps = 1000 / (this.acc / 60);
      if (fps < 45 && this.cap > this.minCap) {
        this.cap = Math.max(this.minCap, Math.floor(this.cap * 0.7));
        while (this.live.length > this.cap) this.release(0);
      }
      this.frames = 20;
      this.acc = 0;
    }
  }

  private frame = (t: number): void => {
    this.raf = 0;
    const ctx = this.ctx;
    if (!ctx || this.hidden) return;
    const raw = t - this.last;
    this.last = t;
    this.measure(raw);
    const dt = Math.min(raw / 1000, 0.05);

    // Spawn embers up to a level-scaled target.
    const target = Math.floor(this.cap * 0.55 * this.emberLevel * (this.reduced ? 0.3 : 1));
    if (this.emberCount < target && this.live.length < this.cap) {
      const tries = this.speed > 1.8 ? 2 : 1;
      for (let i = 0; i < tries; i++) {
        if (Math.random() < 0.4 * this.speed) this.spawnEmber();
      }
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.age += dt;
      if (p.age >= p.life || (p.kind === 'ember' && p.y < -20)) {
        this.release(i);
        continue;
      }
      const k = p.kind === 'ember' ? this.speed : 1;
      if (p.drag > 0) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.vy += p.gravity * dt;
      if (p.kind === 'ember') p.vx += Math.sin(p.age * 1.7 + p.phase) * 14 * dt;
      p.x += p.vx * dt * k;
      p.y += p.vy * dt * k;

      const u = p.age / p.life;
      let a = u < 0.15 ? u / 0.15 : u > 0.65 ? (1 - u) / 0.35 : 1;
      a *= p.peak;
      if (p.kind === 'ember') a *= 0.72 + 0.28 * Math.sin(p.age * 9 + p.phase);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const s = p.kind === 'burst' ? p.size * (1.2 - u * 0.6) : p.size;
      ctx.drawImage(p.sprite, p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Idle when nothing is alive and nothing will spawn.
    if (this.live.length > 0 || this.emberLevel > 0) this.raf = requestAnimationFrame(this.frame);
  };
}

export const particles = new ParticleEngine();
