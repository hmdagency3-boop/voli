import { frameBitstream, muxAnimatedWebp } from '@/lib/animated-webp';
import { keyImage, type ChromaSettings } from '@/lib/chroma-key';
import { blendFrames, cropRect, pulseLevel, shimmerPos, sparkleLevel, type Anchor, type Crop, type Step } from '@/lib/frame-motion';

/**
 * Browser side of the animated frame maker: reads frames from the video (square crop), removes the
 * green screen, draws the effects and writes a light animated WebP with real transparency.
 */
export const FRAME_MAX_SECONDS = 6;
export const FRAME_MAX_FRAMES = 120;
export const FRAME_FPS = [10, 12, 15, 20, 24] as const;
export const FRAME_SIZES = [256, 320, 400, 512] as const;

export type FrameEffects = {
  cycles: number;
  glow: boolean; glowColor: string; glowSize: number; pulse: boolean;
  shimmer: boolean; shimmerStrength: number;
  sparkles: boolean; sparkleCount: number; sparkleSize: number; sparkleColor: string;
};
export const EFFECTS_DEFAULT: FrameEffects = {
  cycles: 1,
  glow: false, glowColor: '#ffd36b', glowSize: 4, pulse: true,
  shimmer: false, shimmerStrength: 0.55,
  sparkles: false, sparkleCount: 10, sparkleSize: 4, sparkleColor: '#ffffff',
};

export const webpEncodeSupported = () => {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas'); c.width = c.height = 1;
  return c.toDataURL('image/webp').startsWith('data:image/webp');
};

const fail = (msg: string, hint = 'bad_video_file') => Object.assign(new Error(msg), { hint });

export function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((res, rej) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadeddata = () => res(v);
    v.onerror = () => rej(fail('تعذّر قراءة الفيديو في المتصفح'));
    v.src = src;
  });
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return Promise.resolve();
  return new Promise((res, rej) => {
    const ok = () => { v.removeEventListener('error', bad); res(); };
    const bad = () => { v.removeEventListener('seeked', ok); rej(fail('تعذّر قراءة الفيديو في المتصفح')); };
    v.addEventListener('seeked', ok, { once: true });
    v.addEventListener('error', bad, { once: true });
    v.currentTime = t;
  });
}

export function frameCount(start: number, end: number, fps: number) {
  return Math.max(2, Math.min(FRAME_MAX_FRAMES, Math.round((end - start) * fps)));
}

/** Reads the frames between start and end, cut to the chosen square and scaled to size×size. */
export async function extractFrames(v: HTMLVideoElement, o: { start: number; end: number; fps: number; crop: Crop; size: number },
  onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<ImageData[]> {
  const n = frameCount(o.start, o.end, o.fps);
  const c = document.createElement('canvas'); c.width = c.height = o.size;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const { sx, sy, side } = cropRect(v.videoWidth, v.videoHeight, o.crop);
  const out: ImageData[] = [];
  for (let i = 0; i < n; i++) {
    if (signal?.aborted) throw fail('cancelled', 'cancelled');
    await seek(v, Math.min(o.start + i / o.fps, Math.max(0, v.duration - 0.001)));
    g.clearRect(0, 0, o.size, o.size);
    g.drawImage(v, sx, sy, side, side, 0, 0, o.size, o.size);
    try { out.push(g.getImageData(0, 0, o.size, o.size)); } catch { throw fail('تعذّر قراءة الفيديو ده. نزّله على جهازك واختاره من هناك.'); }
    onProgress?.(Math.round(((i + 1) / n) * 100));
  }
  return out;
}

export type Keyed = { data: ImageData; canvas: HTMLCanvasElement };
export function toCanvas(img: ImageData): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}
export function keyFrame(raw: ImageData, s: ChromaSettings): Keyed {
  const data = new ImageData(new Uint8ClampedArray(raw.data), raw.width, raw.height);
  keyImage(data.data, raw.width, raw.height, s);
  return { data, canvas: toCanvas(data) };
}
/** Picture for one step of the loop (mixing two frames for the cross-faded end). */
export function stepImage(step: Step, keyed: (i: number) => Keyed): HTMLCanvasElement {
  const a = keyed(step.a);
  if (step.b === undefined || !step.w) return a.canvas;
  const b = keyed(step.b);
  const mix = blendFrames(a.data.data, b.data.data, step.w);
  return toCanvas(new ImageData(mix, a.data.width, a.data.height));
}

let shimmerCanvas: HTMLCanvasElement | null = null;
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, level: number) {
  g.save();
  g.globalAlpha = Math.min(1, level * 1.2);
  const grd = g.createRadialGradient(x, y, 0, x, y, r * 1.6);
  grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath(); g.arc(x, y, r * 1.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = color;
  g.beginPath();
  const t = r * 0.18;
  g.moveTo(x, y - r * 2.4); g.quadraticCurveTo(x + t, y - t, x + r * 2.4, y); g.quadraticCurveTo(x + t, y + t, x, y + r * 2.4);
  g.quadraticCurveTo(x - t, y + t, x - r * 2.4, y); g.quadraticCurveTo(x - t, y - t, x, y - r * 2.4);
  g.fill();
  g.restore();
}

/** Draws one finished frame (effects included) at phase p (0..1) of the loop. */
export function renderFrame(g: CanvasRenderingContext2D, src: HTMLCanvasElement, size: number, fx: FrameEffects, p: number, anchors: Anchor[]) {
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, size, size);
  let frame: HTMLCanvasElement = src;
  if (fx.shimmer) {
    shimmerCanvas ??= document.createElement('canvas');
    const s = shimmerCanvas; s.width = s.height = size;
    const sg = s.getContext('2d')!;
    sg.clearRect(0, 0, size, size);
    sg.drawImage(src, 0, 0, size, size);
    // Diagonal light band sliding from the top-left corner to the bottom-right one.
    const t = shimmerPos(p, fx.cycles), w = 0.16;
    const d = sg.createLinearGradient((t - w) * size, (t - w) * size, (t + w) * size, (t + w) * size);
    d.addColorStop(0, 'rgba(255,255,255,0)');
    d.addColorStop(0.5, `rgba(255,255,255,${fx.shimmerStrength})`);
    d.addColorStop(1, 'rgba(255,255,255,0)');
    sg.globalCompositeOperation = 'source-atop';
    sg.fillStyle = d; sg.fillRect(0, 0, size, size);
    sg.globalCompositeOperation = 'source-over';
    frame = s;
  }
  if (fx.glow) {
    const amount = fx.pulse ? 0.25 + 0.75 * pulseLevel(p, fx.cycles) : 1;
    g.shadowColor = fx.glowColor;
    g.shadowBlur = (fx.glowSize / 100) * size * amount * 2;
    g.drawImage(frame, 0, 0, size, size);
    g.globalAlpha = 0.6 * amount;
    g.drawImage(frame, 0, 0, size, size);
    g.globalAlpha = 1;
    g.shadowBlur = 0; g.shadowColor = 'transparent';
  }
  g.drawImage(frame, 0, 0, size, size);
  if (fx.sparkles) {
    const r = (fx.sparkleSize / 100) * size;
    for (const a of anchors) {
      const level = sparkleLevel(p, fx.cycles, a.phase);
      if (level > 0.02) star(g, a.x, a.y, r * a.scale * (0.5 + 0.5 * level), fx.sparkleColor, level);
    }
  }
  g.restore();
}

async function encodeStill(c: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp') throw fail('المتصفح ده مش بيدعم حفظ WebP، افتح اللوحة من Chrome.', 'webp_unsupported');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Writes the whole loop as an animated WebP file. */
export async function encodeAnimatedFrame(o: {
  steps: Step[]; keyed: (i: number) => Keyed; size: number; fps: number; fx: FrameEffects; anchors: Anchor[]; quality: number; name: string;
}, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<File> {
  const c = document.createElement('canvas'); c.width = c.height = o.size;
  const g = c.getContext('2d')!;
  const frames: { bitstream: Uint8Array; duration: number }[] = [];
  const duration = 1000 / o.fps;
  for (let i = 0; i < o.steps.length; i++) {
    if (signal?.aborted) throw fail('cancelled', 'cancelled');
    renderFrame(g, stepImage(o.steps[i]!, o.keyed), o.size, o.fx, i / o.steps.length, o.anchors);
    frames.push({ bitstream: frameBitstream(await encodeStill(c, o.quality)), duration: Math.round(duration * (i + 1)) - Math.round(duration * i) });
    onProgress?.(Math.round(((i + 1) / o.steps.length) * 100));
  }
  const bytes = muxAnimatedWebp(frames, o.size, o.size, 0);
  const base = o.name.replace(/\.[^.]+$/, '') || 'frame';
  return new File([bytes as BlobPart], `${base}-frame.webp`, { type: 'image/webp' });
}
