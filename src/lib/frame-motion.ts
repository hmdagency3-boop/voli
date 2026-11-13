/**
 * Animated store frames: square crop of the video, seamless endless motion (circular or ping-pong)
 * and loop-safe effect timing. Pure functions shared by the editor and the tests.
 */
export type Crop = { cx: number; cy: number; zoom: number };
export const CROP_DEFAULT: Crop = { cx: 0.5, cy: 0.5, zoom: 1 };
export const CROP_MIN_ZOOM = 0.2;

/** Square area (in video pixels) cut from the video: side = zoom × shorter side, kept inside the video. */
export function cropRect(vw: number, vh: number, c: Crop): { sx: number; sy: number; side: number } {
  const zoom = Math.min(1, Math.max(CROP_MIN_ZOOM, c.zoom));
  const side = Math.max(1, Math.round(Math.min(vw, vh) * zoom));
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(0, v), Math.max(0, max)));
  return { sx: clamp(c.cx * vw - side / 2, vw - side), sy: clamp(c.cy * vh - side / 2, vh - side), side };
}

export type LoopMode = 'loop' | 'pingpong';
/** One shown frame: frame `a`, or a mix of `a` and `b` (w = share of b) for a cross-faded loop. */
export type Step = { a: number; b?: number; w?: number };

/**
 * Order of frames for an endless loop.
 * pingpong: forward then backward without repeating the turning frames (0..n-1, n-2..1), so it never jumps.
 * loop: forward; with crossfade k the last k frames melt into the first k, so the end flows into the start.
 */
export function buildSequence(n: number, mode: LoopMode, crossfade = 0): Step[] {
  if (n <= 1) return [{ a: 0 }];
  const idx = (i: number): Step => ({ a: i });
  if (mode === 'pingpong') {
    return [...Array.from({ length: n }, (_, i) => idx(i)), ...Array.from({ length: Math.max(0, n - 2) }, (_, i) => idx(n - 2 - i))];
  }
  const k = Math.max(0, Math.min(Math.round(crossfade), Math.floor(n / 3)));
  if (k === 0) return Array.from({ length: n }, (_, i) => idx(i));
  const body = Array.from({ length: n - 2 * k }, (_, i) => idx(k + i));
  const tail = Array.from({ length: k }, (_, j): Step => ({ a: n - k + j, b: j, w: (j + 1) / (k + 1) }));
  return [...body, ...tail];
}

/** Mixes two RGBA frames (premultiplied, so transparent parts don't turn dark). */
export function blendFrames(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, out: Uint8ClampedArray<ArrayBuffer> = new Uint8ClampedArray(a.length)): Uint8ClampedArray<ArrayBuffer> {
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3]! / 255, ba = b[i + 3]! / 255;
    const al = aa * (1 - w) + ba * w;
    out[i + 3] = Math.round(al * 255);
    for (let c = 0; c < 3; c++) {
      const v = al > 0 ? (a[i + c]! * aa * (1 - w) + b[i + c]! * ba * w) / al : 0;
      out[i + c] = Math.round(v);
    }
  }
  return out;
}

/** Glow pulse 0..1; whole cycles per loop so the last frame meets the first. */
export const pulseLevel = (p: number, cycles: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p * Math.max(1, Math.round(cycles)));
/** Brightness 0..1 of one sparkle with its own phase offset. */
export const sparkleLevel = (p: number, cycles: number, phase: number) =>
  Math.max(0, Math.sin(2 * Math.PI * (p * Math.max(1, Math.round(cycles)) + phase))) ** 4;
/** Shimmer band position across the frame (−0.3 .. 1.3, off-frame at both ends so the restart is invisible). */
export const shimmerPos = (p: number, cycles: number) => {
  const t = p * Math.max(1, Math.round(cycles));
  return (t - Math.floor(t)) * 1.6 - 0.3;
};

/** Small seeded random generator, so sparkles land in the same places in preview and export. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Anchor = { x: number; y: number; phase: number; scale: number };
/** Sparkle spots on visible (solid) parts of the frame. */
export function sparkleAnchors(alpha: (x: number, y: number) => number, size: number, count: number, seed = 7): Anchor[] {
  const rnd = seeded(seed);
  const out: Anchor[] = [];
  for (let tries = 0; out.length < count && tries < count * 200; tries++) {
    const x = rnd() * size, y = rnd() * size;
    if (alpha(Math.floor(x), Math.floor(y)) < 0.7) continue;
    out.push({ x, y, phase: rnd(), scale: 0.6 + rnd() * 0.4 });
  }
  return out;
}
