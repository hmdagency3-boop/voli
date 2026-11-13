/**
 * Green-screen (chroma key) removal for animated store frames, done on raw RGBA pixels in the admin's browser.
 * The key colour is compared in CbCr (colour without brightness); shadows on the screen are lifted first so
 * darker greens are removed too. Spill removal pulls the key colour out of the remaining pixels (the green halo).
 */
export type RGB = [number, number, number];
export type ChromaSettings = {
  key: RGB;
  /** 0..0.5 — how close to the key colour a pixel must be to disappear. */
  similarity: number;
  /** 0..0.4 — width of the gradual band between removed and kept. */
  smoothness: number;
  /** 0..1 — how much of the key colour is pulled out of the kept pixels (halo removal). */
  spill: number;
  /** 0..4 px — shrinks the kept area to cut off a remaining coloured outline. */
  choke: number;
  /** 0..4 px — blurs the edge for a soft, smooth outline. */
  feather: number;
};
export const CHROMA_DEFAULT: ChromaSettings = { key: [0, 255, 0], similarity: 0.16, smoothness: 0.1, spill: 0.85, choke: 1, feather: 2 };

const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const cb = (r: number, g: number, b: number) => (-0.168736 * r - 0.331264 * g + 0.5 * b) / 255;
const cr = (r: number, g: number, b: number) => (0.5 * r - 0.418688 * g - 0.081312 * b) / 255;
/** Lifts dark pixels (up to 4×) so a shadowed green reads like the bright green; near-black stays neutral. */
const lift = (r: number, g: number, b: number) => 255 / Math.max(r, g, b, 64);

/** Opacity (0..1) that a pixel keeps after removing the key colour. */
export function keyAlpha(r: number, g: number, b: number, s: ChromaSettings): number {
  const k = lift(...s.key), p = lift(r, g, b);
  const [kr, kg, kb] = [s.key[0] * k, s.key[1] * k, s.key[2] * k];
  const d = Math.hypot(cb(r * p, g * p, b * p) - cb(kr, kg, kb), cr(r * p, g * p, b * p) - cr(kr, kg, kb));
  return smooth((d - s.similarity) / Math.max(1e-4, s.smoothness));
}

/** Key colour's strongest channel (1 = green, 2 = blue, 0 = red). */
const keyChannel = (key: RGB) => (key[1] >= key[0] && key[1] >= key[2] ? 1 : key[2] >= key[0] ? 2 : 0);

/** Pulls the key colour out of one pixel; semi-transparent edge pixels are always fully cleaned. */
export function despill(px: RGB, key: RGB, spill: number, alpha: number): RGB {
  const c = keyChannel(key);
  const others = [0, 1, 2].filter((i) => i !== c) as [number, number];
  const limit = Math.max(px[others[0]]!, px[others[1]]!);
  const excess = px[c] - limit;
  if (excess <= 0) return px;
  const out: RGB = [...px];
  const strength = clamp01(spill + (1 - spill) * (1 - alpha));
  out[c] = px[c] - excess * strength;
  return out;
}

/** Separable min (choke) or box-blur (feather) over an alpha channel. */
function pass(a: Float32Array, w: number, h: number, r: number, mode: 'min' | 'blur'): Float32Array {
  if (r <= 0) return a;
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  const run = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    const lines = horizontal ? h : w, len = horizontal ? w : h;
    for (let l = 0; l < lines; l++) {
      for (let i = 0; i < len; i++) {
        let acc = mode === 'min' ? 1 : 0, n = 0;
        for (let j = Math.max(0, i - r); j <= Math.min(len - 1, i + r); j++) {
          const v = src[horizontal ? l * w + j : j * w + l]!;
          if (mode === 'min') acc = Math.min(acc, v); else { acc += v; n++; }
        }
        dst[horizontal ? l * w + i : i * w + l] = mode === 'min' ? acc : acc / n;
      }
    }
  };
  run(a, tmp, true); run(tmp, out, false);
  return out;
}

/** Removes the key colour from an RGBA image in place. */
export function keyImage(data: Uint8ClampedArray, w: number, h: number, s: ChromaSettings): void {
  let alpha: Float32Array = new Float32Array(w * h);
  for (let i = 0, p = 0; p < alpha.length; p++, i += 4) alpha[p] = keyAlpha(data[i]!, data[i + 1]!, data[i + 2]!, s) * (data[i + 3]! / 255);
  alpha = pass(alpha, w, h, Math.round(s.choke), 'min');
  alpha = pass(alpha, w, h, Math.round(s.feather), 'blur');
  for (let i = 0, p = 0; p < alpha.length; p++, i += 4) {
    const a = alpha[p]!;
    if (a <= 0.002) { data[i + 3] = 0; continue; }
    const [r, g, b] = despill([data[i]!, data[i + 1]!, data[i + 2]!], s.key, s.spill, a);
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = Math.round(a * 255);
  }
}

/** Guesses the screen colour from the picture's outer border (median of each channel). */
export function estimateKey(data: Uint8ClampedArray, w: number, h: number): RGB {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.04));
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const step = Math.max(1, Math.round(Math.min(w, h) / 80));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * 4;
      rs.push(data[i]!); gs.push(data[i + 1]!); bs.push(data[i + 2]!);
    }
  }
  const med = (v: number[]) => { v.sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
  return [med(rs), med(gs), med(bs)];
}

export const rgbHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
export function hexRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [0, 255, 0];
}
