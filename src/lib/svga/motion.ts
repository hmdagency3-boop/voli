/**
 * Frame studio (صانع الإطارات SVGA): the design model and the frame-by-frame motion math.
 * Pure functions only — the preview and the exported SVGA file both come from plan(), so what the
 * admin sees is exactly what the file contains.
 */
export type Mat = [a: number, b: number, c: number, d: number, tx: number, ty: number];
export type AnimType = 'pulse' | 'heartbeat' | 'flap' | 'sway' | 'float' | 'drift' | 'spin' | 'blink';
export type Anim = { id: string; type: AnimType; amount: number; cycles: number; phase: number };
export type Glow = { color: string; blur: number; min: number; max: number; cycles: number };
export type Shine = { width: number; angle: number; sweep: number; strength: number; cycles: number };
export type Sparkles = { count: number; color: string; size: number; radius: number; cycles: number; seed: number };
export type LayerKind = 'image' | 'sparkles';
export type Layer = {
  id: string; name: string; kind: LayerKind;
  /** PNG data URL of the piece ('' for sparkles). */
  src: string;
  /** Drawn size in frame units, position of the piece's middle, base scale / rotation (deg) / opacity (0..1). */
  w: number; h: number; x: number; y: number; scale: number; rotation: number; opacity: number;
  /** Turning point inside the piece, 0..1 from its left / top edge (wing joint, crown base…). */
  pivotX: number; pivotY: number;
  /** Adds a copy flipped across the frame's middle line, moving as a mirror image (left wing from right wing). */
  mirror: boolean; visible: boolean;
  anims: Anim[]; glow: Glow | null; shine: Shine | null; sparkles: Sparkles | null;
};
export type Design = {
  version: 1; name: string; size: number; fps: number; seconds: number;
  /** Avatar circle guide, as a share of the frame width (preview only, never in the file). */
  avatar: number;
  /** Frame units per original picture pixel, set by the first pieces so later pieces keep the same scale. */
  unit?: number | undefined;
  layers: Layer[];
};

export const LIMITS = { size: [150, 750], fps: [12, 30], seconds: [1, 6] } as const;
export const frameCount = (d: Pick<Design, 'fps' | 'seconds'>) => Math.max(1, Math.round(d.fps * d.seconds));

export const uid = () => Math.random().toString(36).slice(2, 10);

export type AnimPreset = {
  type: AnimType; label: string; hint: string; amount: number; cycles: number; unit: string;
  min: number; max: number; step: number; amountLabel: string;
};
export const ANIM_PRESETS: AnimPreset[] = [
  { type: 'pulse', label: 'نبض', hint: 'يكبر ويرجع بهدوء — للتاج والجواهر', amount: 8, cycles: 2, unit: '%', min: 1, max: 40, step: 1, amountLabel: 'قوة النبض' },
  { type: 'heartbeat', label: 'نبضة قلب', hint: 'نبضتين سريعتين وبعدين سكون', amount: 10, cycles: 1, unit: '%', min: 1, max: 40, step: 1, amountLabel: 'قوة النبضة' },
  { type: 'flap', label: 'رفرفة جناح', hint: 'ينزل بسرعة ويطلع بهدوء حول المفصل', amount: 14, cycles: 2, unit: '°', min: 1, max: 60, step: 1, amountLabel: 'زاوية الرفرفة' },
  { type: 'sway', label: 'تمايل', hint: 'يميل يمين وشمال حول نقطة الدوران', amount: 6, cycles: 1, unit: '°', min: 1, max: 45, step: 1, amountLabel: 'زاوية الميل' },
  { type: 'float', label: 'طفو', hint: 'يطلع وينزل بهدوء', amount: 4, cycles: 1, unit: 'px', min: 1, max: 40, step: 1, amountLabel: 'المسافة' },
  { type: 'drift', label: 'اهتزاز أفقي', hint: 'يتحرك يمين وشمال', amount: 3, cycles: 2, unit: 'px', min: 1, max: 40, step: 1, amountLabel: 'المسافة' },
  { type: 'spin', label: 'دوران', hint: 'يلف حوالين نفسه (سالب = عكس الاتجاه)', amount: 1, cycles: 1, unit: 'لفّة', min: -4, max: 4, step: 1, amountLabel: 'عدد اللفّات' },
  { type: 'blink', label: 'وميض', hint: 'يخفت ويرجع يظهر', amount: 60, cycles: 2, unit: '%', min: 5, max: 100, step: 5, amountLabel: 'قوة الخفوت' },
];
export const presetOf = (t: AnimType) => ANIM_PRESETS.find((p) => p.type === t)!;

export const DEFAULT_GLOW: Glow = { color: '#ffd76a', blur: 10, min: 0.35, max: 1, cycles: 2 };
export const DEFAULT_SHINE: Shine = { width: 0.18, angle: 30, sweep: 0.45, strength: 0.85, cycles: 1 };
export const DEFAULT_SPARKLES: Sparkles = { count: 8, color: '#fff6c8', size: 18, radius: 0.42, cycles: 2, seed: 7 };

export function newDesign(): Design {
  return { version: 1, name: 'إطار جديد', size: 300, fps: 24, seconds: 2, avatar: 0.6, layers: [] };
}
export function newLayer(p: Partial<Layer> & Pick<Layer, 'name' | 'w' | 'h' | 'x' | 'y'>): Layer {
  return {
    id: uid(), kind: 'image', src: '', scale: 1, rotation: 0, opacity: 1, pivotX: 0.5, pivotY: 0.5,
    mirror: false, visible: true, anims: [], glow: null, shine: null, sparkles: null, ...p,
  };
}
export function newSparkles(size: number): Layer {
  const s = DEFAULT_SPARKLES;
  return newLayer({ name: 'نجوم لامعة', kind: 'sparkles', w: size * s.radius * 2, h: size * s.radius * 2, x: size / 2, y: size / 2, sparkles: { ...s } });
}
export function newAnim(type: AnimType): Anim {
  const p = presetOf(type);
  return { id: uid(), type, amount: p.amount, cycles: p.cycles, phase: 0 };
}

/** Wing joint: the inner edge facing the frame's middle. */
export function wingPivot(l: Pick<Layer, 'x'>, size: number): [number, number] {
  return l.x >= size / 2 ? [0.12, 0.6] : [0.88, 0.6];
}

// ---------- matrices (canvas order: x' = a x + c y + tx, y' = b x + d y + ty) ----------
export const I: Mat = [1, 0, 0, 1, 0, 0];
export function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
export const T = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const S = (k: number): Mat => [k, 0, 0, k, 0, 0];
export function R(deg: number): Mat {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}
/** Flip across the frame's vertical middle line. */
export const mirrorMat = (size: number): Mat => [-1, 0, 0, 1, size, 0];
export const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
export function invert(m: Mat): Mat | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-9) return null;
  const [a, b, c, d, e, f] = m;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

// ---------- motion ----------
const TAU = Math.PI * 2;
const frac = (v: number) => v - Math.floor(v);
const bump = (u: number, start: number, len: number) => (u >= start && u <= start + len ? Math.sin(((u - start) / len) * Math.PI) : 0);
/** Wing stroke: 1 → -1 quickly (down), then back to 1 slowly (up). */
export function flapWave(u: number): number {
  return u < 0.4 ? Math.cos((Math.PI * u) / 0.4) : Math.cos(Math.PI * (1 - (u - 0.4) / 0.6));
}
export const pulseWave = (u: number) => 0.5 - 0.5 * Math.cos(TAU * u);

export type Pose = { dx: number; dy: number; rot: number; k: number; alpha: number };
/** Offsets at loop time t (0..1). Whole cycles per loop, so t = 0 and t = 1 match and the loop has no jump. */
export function pose(anims: Anim[], t: number): Pose {
  const p: Pose = { dx: 0, dy: 0, rot: 0, k: 1, alpha: 1 };
  for (const a of anims) {
    const n = Math.max(1, Math.round(a.cycles));
    const u = frac(n * t + a.phase);
    const s = Math.sin(TAU * u);
    switch (a.type) {
      case 'pulse': p.k *= 1 + (a.amount / 100) * pulseWave(u); break;
      case 'heartbeat': p.k *= 1 + (a.amount / 100) * (bump(u, 0, 0.14) + 0.6 * bump(u, 0.2, 0.14)); break;
      case 'flap': p.rot += a.amount * flapWave(u); break;
      case 'sway': p.rot += a.amount * s; break;
      case 'float': p.dy -= a.amount * s; break;
      case 'drift': p.dx += a.amount * s; break;
      case 'spin': p.rot += 360 * Math.round(a.amount) * frac(t + a.phase); break;
      case 'blink': p.alpha *= 1 - (Math.min(100, a.amount) / 100) * pulseWave(u); break;
    }
  }
  return p;
}

/** Where the layer is drawn at loop time t: image space (0..w, 0..h) → frame space. */
export function layerMatrix(l: Layer, t: number, p: Pose = pose(l.anims, t)): Mat {
  const base = mul(R(l.rotation), S(l.scale));
  const [ox, oy] = apply(base, (l.pivotX - 0.5) * l.w, (l.pivotY - 0.5) * l.h);
  return mul(mul(mul(T(l.x + ox + p.dx, l.y + oy + p.dy), R(l.rotation + p.rot)), S(l.scale * p.k)), T(-l.pivotX * l.w, -l.pivotY * l.h));
}
/** Matrix without any animation (used for selecting and dragging pieces). */
export const restMatrix = (l: Layer) => layerMatrix(l, 0, { dx: 0, dy: 0, rot: 0, k: 1, alpha: 1 });

/** Seeded random 0..1 so sparkles keep their places between renders. */
export function rand(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

// ---------- plan: the sprites of the final file ----------
export type ImageReq =
  | { kind: 'layer'; layerId: string }
  | { kind: 'glow'; layerId: string; pad: number }
  | { kind: 'shine'; layerId: string; index: number; count: number }
  | { kind: 'star'; layerId: string };
export type SpriteFrame = { alpha: number; m: Mat } | null;
export type PlannedSprite = { key: string; image: ImageReq; w: number; h: number; frames: SpriteFrame[]; mirrored: boolean; layerId: string };
export type Plan = { size: number; fps: number; frames: number; sprites: PlannedSprite[] };

export const shineSteps = (sh: Shine, frames: number) =>
  Math.max(6, Math.min(30, Math.round((sh.sweep * frames) / Math.max(1, Math.round(sh.cycles)))));

const MIN_ALPHA = 0.004;
const fr = (alpha: number, m: Mat): SpriteFrame => (alpha < MIN_ALPHA ? null : { alpha: Math.min(1, alpha), m });

export function plan(d: Design): Plan {
  const frames = frameCount(d);
  const F = mirrorMat(d.size);
  const sprites: PlannedSprite[] = [];
  const times = Array.from({ length: frames }, (_, i) => i / frames);
  const push = (s: Omit<PlannedSprite, 'mirrored'>, mirror: boolean) => {
    sprites.push({ ...s, mirrored: false });
    if (mirror) sprites.push({ ...s, key: s.key, mirrored: true, frames: s.frames.map((f) => (f ? { alpha: f.alpha, m: mul(F, f.m) } : null)) });
  };
  for (const l of d.layers) {
    if (!l.visible) continue;
    const poses = times.map((t) => pose(l.anims, t));
    const mats = times.map((t, i) => layerMatrix(l, t, poses[i]!));
    const alphas = poses.map((p) => l.opacity * p.alpha);
    if (l.kind === 'sparkles' && l.sparkles) {
      const sp = l.sparkles, rnd = rand(sp.seed), count = Math.max(1, Math.round(sp.count));
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * TAU + (rnd() - 0.5) * (TAU / count) * 0.6;
        const rr = 0.5 * (0.82 + rnd() * 0.18);
        const lx: number = l.w * (0.5 + rr * Math.cos(ang)), ly: number = l.h * (0.5 + rr * Math.sin(ang));
        const ph = rnd(), big = 0.7 + rnd() * 0.5, n = Math.max(1, Math.round(sp.cycles));
        const size = sp.size * big;
        push({
          key: `star_${l.id}`, image: { kind: 'star', layerId: l.id }, w: size, h: size, layerId: l.id,
          frames: times.map((t, f) => {
            const u = frac(n * t + ph), k = 0.15 + 0.85 * pulseWave(u);
            return fr(alphas[f]! * pulseWave(u), mul(mul(mul(mats[f]!, T(lx, ly)), S(k)), T(-size / 2, -size / 2)));
          }),
        }, l.mirror);
      }
      continue;
    }
    if (l.glow) {
      const g = l.glow, pad = Math.max(2, g.blur * 2), n = Math.max(1, Math.round(g.cycles));
      push({
        key: `glow_${l.id}`, image: { kind: 'glow', layerId: l.id, pad }, w: l.w + pad * 2, h: l.h + pad * 2, layerId: l.id,
        frames: times.map((t, f) => fr(alphas[f]! * (g.min + (g.max - g.min) * pulseWave(frac(n * t))), mul(mats[f]!, T(-pad, -pad)))),
      }, l.mirror);
    }
    push({ key: `layer_${l.id}`, image: { kind: 'layer', layerId: l.id }, w: l.w, h: l.h, layerId: l.id, frames: mats.map((m, f) => fr(alphas[f]!, m)) }, l.mirror);
    if (l.shine) {
      const sh = l.shine, n = Math.max(1, Math.round(sh.cycles)), count = shineSteps(sh, frames);
      const at = times.map((t) => { const u = frac(n * t); return u < sh.sweep ? Math.min(count - 1, Math.floor((u / sh.sweep) * count)) : -1; });
      for (let i = 0; i < count; i++) {
        push({
          key: `shine_${l.id}_${i}`, image: { kind: 'shine', layerId: l.id, index: i, count }, w: l.w, h: l.h, layerId: l.id,
          frames: mats.map((m, f) => (at[f] === i ? fr(alphas[f]!, m) : null)),
        }, l.mirror);
      }
    }
  }
  return { size: d.size, fps: d.fps, frames, sprites };
}

/** Topmost piece under a point (rest pose), and whether the mirrored copy was hit. */
export function hitLayer(d: Design, x: number, y: number): { id: string; mirrored: boolean } | null {
  const F = mirrorMat(d.size);
  for (let i = d.layers.length - 1; i >= 0; i--) {
    const l = d.layers[i]!;
    if (!l.visible) continue;
    const m = restMatrix(l);
    const tries: [Mat, boolean][] = l.mirror ? [[m, false], [mul(F, m), true]] : [[m, false]];
    for (const [mm, mirrored] of tries) {
      const inv = invert(mm);
      if (!inv) continue;
      const [u, v] = apply(inv, x, y);
      if (u >= 0 && v >= 0 && u <= l.w && v <= l.h) return { id: l.id, mirrored };
    }
  }
  return null;
}

/** Ready combinations for one piece. */
export type Recipe = { key: string; label: string; hint: string; apply: (l: Layer, size: number) => Layer };
export const RECIPES: Recipe[] = [
  { key: 'wings', label: 'جناح يرفرف + الجناح التاني', hint: 'رفرفة حول المفصل الداخلي، ونسخة معكوسة على الجنب التاني',
    apply: (l, size) => { const [px, py] = wingPivot(l, size); return { ...l, pivotX: px, pivotY: py, mirror: true, anims: [newAnim('flap')] }; } },
  { key: 'crown', label: 'تاج ينبض ويلمع', hint: 'نبض من القاعدة + توهج + لمعة ماشية',
    apply: (l) => ({ ...l, pivotX: 0.5, pivotY: 1, anims: [newAnim('pulse')], glow: { ...DEFAULT_GLOW }, shine: { ...DEFAULT_SHINE } }) },
  { key: 'gem', label: 'جوهرة تضوي', hint: 'توهج نابض + لمعة سريعة',
    apply: (l) => ({ ...l, anims: [], glow: { ...DEFAULT_GLOW, cycles: 2 }, shine: { ...DEFAULT_SHINE, cycles: 2, sweep: 0.3 } }) },
  { key: 'ring', label: 'الإطار الأساسي يلمع', hint: 'ثابت بدون حركة، بس لمعة بتعدّي عليه',
    apply: (l) => ({ ...l, anims: [], shine: { ...DEFAULT_SHINE, width: 0.22 } }) },
  { key: 'tail', label: 'زينة تتمايل', hint: 'تمايل من فوق + طفو خفيف',
    apply: (l) => ({ ...l, pivotX: 0.5, pivotY: 0, anims: [newAnim('sway'), newAnim('float')] }) },
];

/** Resizes the whole frame, keeping every piece in the same place. */
export function resize(d: Design, size: number): Design {
  const k = size / d.size;
  if (!Number.isFinite(k) || k <= 0 || k === 1) return d;
  return {
    ...d, size, unit: d.unit ? d.unit * k : d.unit,
    layers: d.layers.map((l) => ({
      ...l, w: l.w * k, h: l.h * k, x: l.x * k, y: l.y * k,
      anims: l.anims.map((a) => (a.type === 'float' || a.type === 'drift' ? { ...a, amount: a.amount * k } : a)),
      glow: l.glow ? { ...l.glow, blur: l.glow.blur * k } : null,
      sparkles: l.sparkles ? { ...l.sparkles, size: l.sparkles.size * k } : null,
    })),
  };
}
