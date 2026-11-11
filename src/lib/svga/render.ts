/** Browser side of the frame studio: builds the pictures (pieces, glow, shine, stars), draws the preview, writes the .svga file. */
import { encodeSvga, type Movie } from './proto';
import { plan, type Design, type ImageReq, type Layer, type Plan } from './motion';

export type Drawable = HTMLCanvasElement | HTMLImageElement;
export type Built = { plan: Plan; images: Map<string, Drawable> };

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = src; });
    imgCache.set(src, p);
  }
  return p;
}
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d')!;

/** Pixels per frame unit kept for a piece (max 2× the frame and 1024 px). */
const density = (img: HTMLImageElement, l: Layer) => Math.max(0.25, Math.min(img.naturalWidth / l.w, 1024 / l.w));

/** Reads a chosen piece: PNG data URL, downscaled to fit maxPx. */
export async function readPiece(file: File, maxPx: number): Promise<{ src: string; px: number; py: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = url; });
    const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const c = canvas(img.naturalWidth * k, img.naturalHeight * k);
    ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
    return { src: c.toDataURL('image/png'), px: img.naturalWidth, py: img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

function glowImage(img: HTMLImageElement, l: Layer, pad: number): HTMLCanvasElement {
  const g = l.glow!, res = Math.min(density(img, l), 384 / (l.w + pad * 2));
  const c = canvas((l.w + pad * 2) * res, (l.h + pad * 2) * res), x = ctx2d(c);
  const blur = g.blur * res;
  if (typeof (x as { filter?: unknown }).filter === 'string') {
    x.filter = `blur(${blur}px)`;
    x.drawImage(img, pad * res, pad * res, l.w * res, l.h * res);
    x.filter = 'none';
  } else {
    const k = Math.max(1, blur / 2), sm = canvas(c.width / k, c.height / k);
    ctx2d(sm).drawImage(img, (pad * res) / k, (pad * res) / k, (l.w * res) / k, (l.h * res) / k);
    x.imageSmoothingQuality = 'high';
    x.drawImage(sm, 0, 0, c.width, c.height);
  }
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = g.color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  x.drawImage(c, 0, 0); // a bit stronger
  return c;
}

function shineImage(img: HTMLImageElement, l: Layer, index: number, count: number): HTMLCanvasElement {
  const sh = l.shine!, res = Math.min(density(img, l), 320 / Math.max(l.w, l.h));
  const c = canvas(l.w * res, l.h * res), x = ctx2d(c);
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  const W = c.width, H = c.height, ang = (sh.angle * Math.PI) / 180;
  const dx = Math.cos(ang), dy = Math.sin(ang), half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
  const band = Math.max(0.04, sh.width) * half * 2;
  const pos = -half - band + ((index + 0.5) / count) * (2 * half + 2 * band);
  const cx = W / 2 + dx * pos, cy = H / 2 + dy * pos;
  const gr = x.createLinearGradient(cx - dx * band, cy - dy * band, cx + dx * band, cy + dy * band);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.5, `rgba(255,255,255,${sh.strength})`);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  return c;
}

function starImage(color: string): HTMLCanvasElement {
  const c = canvas(96, 96), x = ctx2d(c), m = 48;
  const rg = x.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, color); rg.addColorStop(0.25, color + '88'); rg.addColorStop(1, color + '00');
  x.fillStyle = rg; x.fillRect(0, 0, 96, 96);
  x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(m, 2);
  x.quadraticCurveTo(m + 5, m - 5, 94, m); x.quadraticCurveTo(m + 5, m + 5, m, 94);
  x.quadraticCurveTo(m - 5, m + 5, 2, m); x.quadraticCurveTo(m - 5, m - 5, m, 2); x.fill();
  return c;
}

/** Generated pictures, reused while only positions or moves change (dragging stays smooth). */
const made = new Map<string, Drawable>();
const signature = (l: Layer, r: ImageReq) => [r.kind, l.id, l.src.length, l.src.slice(-48), l.w.toFixed(1), l.h.toFixed(1),
  r.kind === 'glow' ? JSON.stringify(l.glow) + r.pad : '', r.kind === 'shine' ? JSON.stringify(l.shine) + r.index + '/' + r.count : '',
  r.kind === 'star' ? l.sparkles?.color : ''].join('|');

/** Plans the movie and makes every picture it uses. */
export async function build(d: Design): Promise<Built> {
  const p = plan(d);
  const byId = new Map(d.layers.map((l) => [l.id, l]));
  const images = new Map<string, Drawable>();
  const reqs = new Map<string, ImageReq>();
  for (const s of p.sprites) reqs.set(s.key, s.image);
  await Promise.all([...reqs].map(async ([key, r]) => {
    const l = byId.get(r.layerId)!;
    const sig = signature(l, r), hit = made.get(sig);
    if (hit) { images.set(key, hit); return; }
    let out: Drawable;
    if (r.kind === 'star') out = starImage(l.sparkles?.color ?? '#ffffff');
    else {
      const img = await loadImage(l.src);
      out = r.kind === 'layer' ? img : r.kind === 'glow' ? glowImage(img, l, r.pad) : shineImage(img, l, r.index, r.count);
    }
    if (made.size > 400) made.clear();
    made.set(sig, out); images.set(key, out);
  }));
  return { plan: p, images };
}

/** Draws one frame; scale = canvas pixels per frame unit. */
export function drawFrame(x: CanvasRenderingContext2D, b: Built, frame: number, scale: number) {
  for (const s of b.plan.sprites) {
    const f = s.frames[frame], img = b.images.get(s.key);
    if (!f || !img) continue;
    x.save();
    x.setTransform(scale, 0, 0, scale, 0, 0);
    x.transform(...f.m);
    x.globalAlpha = f.alpha;
    x.drawImage(img, 0, 0, s.w, s.h);
    x.restore();
  }
}

async function pngBytes(img: Drawable): Promise<Uint8Array> {
  let c: HTMLCanvasElement;
  if (img instanceof HTMLCanvasElement) c = img;
  else { c = canvas(img.naturalWidth, img.naturalHeight); ctx2d(c).drawImage(img, 0, 0); }
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png failed'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function toMovie(d: Design): Promise<Movie> {
  const b = await build(d);
  const images: Record<string, Uint8Array> = {};
  for (const [k, img] of b.images) images[k] = await pngBytes(img);
  return {
    width: d.size, height: d.size, fps: d.fps, frames: b.plan.frames, images,
    sprites: b.plan.sprites.map((s) => ({ imageKey: s.key, w: s.w, h: s.h, frames: s.frames })),
  };
}

const safeName = (n: string) => n.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'frame';
export async function exportSvga(d: Design): Promise<File> {
  const bytes = encodeSvga(await toMovie(d));
  return new File([bytes as BlobPart], `${safeName(d.name)}.svga`, { type: 'application/octet-stream' });
}

/** Store picture: one frame of the animation, PNG with a transparent background. */
export async function thumbnail(d: Design, frame = 0, px = 512): Promise<File> {
  const b = await build(d);
  const c = canvas(px, px);
  drawFrame(ctx2d(c), b, Math.min(frame, b.plan.frames - 1), px / d.size);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('png failed'))), 'image/png'));
  return new File([blob], `${safeName(d.name)}.png`, { type: 'image/png' });
}
