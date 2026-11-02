/**
 * Lazy-loaded: builds a 1080x1920 PNG story card on a canvas.
 * Imported dynamically from the card screen so it never touches the first-load budget.
 */
import { crestUrl } from '../config/crestImages';
import { EVENT, patronusLabel, type Department } from '../config/departments';

export const CARD_W = 1080;
export const CARD_H = 1920;

const GOLD = '#d9b45b';
const GOLD_BRIGHT = '#f3d98c';

async function loadFonts(): Promise<void> {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load('700 64px "Cinzel Decorative"'),
    document.fonts.load('600 40px "Cinzel"'),
    document.fonts.load('italic 40px "IM Fell English"'),
    document.fonts.load('40px "IM Fell English"'),
  ]).catch(() => undefined);
}

/** Loads the department crest (already in the department colour, with alpha). */
function crestImage(dept: Department): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('crest image failed'));
    img.src = crestUrl(dept.id);
  });
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Wrap text to a max width, returns lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Shrinks font size until the text fits in `maxLines` lines. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (px: number) => string,
  startPx: number,
  maxW: number,
  maxLines: number,
): { lines: string[]; px: number } {
  let px = startPx;
  for (;;) {
    ctx.font = font(px);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines || px <= 28) return { lines, px };
    px -= 3;
  }
}

export async function renderCard(name: string, dept: Department): Promise<Blob> {
  await loadFonts();
  const img = await crestImage(dept).catch(() => null);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  const rgb = hexToRgb(dept.accent);
  const cx = CARD_W / 2;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, '#0b0e20');
  bg.addColorStop(0.55, '#07091a');
  bg.addColorStop(1, '#04050c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Department-coloured glow behind the patronus
  const glow = ctx.createRadialGradient(cx, 760, 0, cx, 760, 640);
  glow.addColorStop(0, `rgba(${rgb},0.55)`);
  glow.addColorStop(0.45, `rgba(${rgb},0.16)`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Deterministic embers (seeded so the same person always gets the same card)
  let seed = 1;
  for (const ch of name + dept.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * CARD_W;
    const y = rnd() * CARD_H;
    const r = 2 + rnd() * 7;
    const warm = rnd() > 0.45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, warm ? 'rgba(255,214,140,0.85)' : `rgba(${rgb},0.8)`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  ctx.globalAlpha = 1;

  // Frame
  ctx.strokeStyle = 'rgba(217,180,91,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, CARD_W - 108, CARD_H - 108);
  ctx.strokeStyle = 'rgba(217,180,91,0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(72, 72, CARD_W - 144, CARD_H - 144);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Header
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = '700 58px "Cinzel Decorative", "Cinzel", Georgia, serif';
  ctx.fillText(EVENT.title, cx, 210);
  ctx.fillStyle = 'rgba(236,230,214,0.7)';
  ctx.font = '600 34px "Cinzel", Georgia, serif';
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '8px';
  ctx.fillText(EVENT.label.toUpperCase(), cx, 272);
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';

  // Crest (carries its own glow, so no extra shadow passes)
  if (img) {
    const size = 780;
    ctx.drawImage(img, cx - size / 2, 760 - size / 2, size, size);
  }

  // Person name
  ctx.fillStyle = '#ece6d6';
  const nameFit = fitText(ctx, name, (px) => `600 ${px}px "Cinzel", Georgia, serif`, 62, 860, 2);
  ctx.font = `600 ${nameFit.px}px "Cinzel", Georgia, serif`;
  let y = 1180;
  for (const l of nameFit.lines) {
    ctx.fillText(l, cx, y);
    y += nameFit.px * 1.2;
  }

  // Divider
  y += 6;
  ctx.fillStyle = 'rgba(217,180,91,0.6)';
  ctx.fillRect(cx - 90, y, 180, 2);
  y += 70;

  // Department name
  ctx.shadowColor = dept.accent;
  ctx.shadowBlur = 34;
  ctx.fillStyle = dept.accent;
  const dFit = fitText(
    ctx,
    dept.name,
    (px) => `700 ${px}px "Cinzel Decorative", "Cinzel", Georgia, serif`,
    78,
    880,
    2,
  );
  ctx.font = `700 ${dFit.px}px "Cinzel Decorative", "Cinzel", Georgia, serif`;
  for (const l of dFit.lines) {
    ctx.fillText(l, cx, y);
    y += dFit.px * 1.22;
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Patronus + flavour
  y += 18;
  ctx.fillStyle = 'rgba(236,230,214,0.78)';
  ctx.font = '600 34px "Cinzel", Georgia, serif';
  ctx.fillText(`Patronus: ${patronusLabel(dept)}`, cx, y);
  y += 66;
  ctx.fillStyle = '#ece6d6';
  const fFit = fitText(ctx, dept.flavor, (px) => `italic ${px}px "IM Fell English", Georgia, serif`, 42, 820, 3);
  ctx.font = `italic ${fFit.px}px "IM Fell English", Georgia, serif`;
  for (const l of fFit.lines) {
    ctx.fillText(l, cx, y);
    y += fFit.px * 1.35;
  }

  // Footer
  ctx.fillStyle = GOLD;
  ctx.font = '600 36px "Cinzel", Georgia, serif';
  ctx.fillText(EVENT.clubFull, cx, CARD_H - 150);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

export function cardFileName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member';
  return `bucc-fall-26-${slug}.png`;
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported';

/** Try the native share sheet with the PNG attached. */
export async function shareCard(blob: Blob, fileName: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function' || !nav.canShare({ files: [file] })) {
    return 'unsupported';
  }
  try {
    await nav.share({ files: [file], text });
    return 'shared';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}