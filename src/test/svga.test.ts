// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { apply, layerMatrix, mirrorMat, mul, newAnim, newLayer, plan, pose, type Design } from '@/lib/svga/motion';
import { decodeSvga, encodeSvga } from '@/lib/svga/proto';

const design = (layers: Design['layers']): Design => ({ version: 1, name: 't', size: 300, fps: 24, seconds: 2, avatar: 0.6, layers });
const wing = () => ({ ...newLayer({ name: 'wing', src: 'data:image/png;base64,x', w: 80, h: 60, x: 230, y: 150 }), pivotX: 0.1, pivotY: 0.6, mirror: true, anims: [newAnim('flap')] });

describe('frame studio motion', () => {
  it('frames = fps × seconds', () => { expect(plan(design([wing()])).frames).toBe(48); });
  it('the mirrored copy is the exact mirror image on the other side', () => {
    const p = plan(design([wing()]));
    const [a, b] = p.sprites;
    expect(b!.mirrored).toBe(true);
    a!.frames.forEach((f, i) => { const m = mul(mirrorMat(300), f!.m); b!.frames[i]!.m.forEach((v, j) => expect(v).toBeCloseTo(m[j]!, 6)); });
    const [x] = apply(a!.frames[0]!.m, 40, 30), [mx] = apply(b!.frames[0]!.m, 40, 30);
    expect(x + mx).toBeCloseTo(300, 6);
  });
  it('every ready-made move loops without a jump', () => {
    for (const t of ['pulse', 'heartbeat', 'flap', 'sway', 'float', 'drift', 'spin', 'blink'] as const) {
      const l = { ...wing(), anims: [newAnim(t)] };
      const m0 = layerMatrix(l, 0), m1 = layerMatrix(l, 1);
      m0.forEach((v, j) => expect(v).toBeCloseTo(m1[j]!, 6));
      expect(pose(l.anims, 0).alpha).toBeCloseTo(pose(l.anims, 1).alpha, 6);
    }
  });
  it('a piece without moves stays still on every frame', () => {
    const base = newLayer({ name: 'ring', src: 'data:image/png;base64,x', w: 300, h: 300, x: 150, y: 150 });
    const f = plan(design([base])).sprites[0]!.frames;
    f.forEach((x) => expect(x).toEqual(f[0]));
  });
  it('a flapping wing turns around its joint (the joint never moves)', () => {
    const l = wing();
    const at = (t: number) => apply(layerMatrix(l, t), l.pivotX * l.w, l.pivotY * l.h);
    const [x0, y0] = at(0);
    for (const t of [0.1, 0.33, 0.7]) { const [x, y] = at(t); expect(x).toBeCloseTo(x0, 6); expect(y).toBeCloseTo(y0, 6); }
  });
  it('the moving shine shows only during its pass', () => {
    const l = { ...wing(), mirror: false, anims: [], shine: { width: 0.2, angle: 30, sweep: 0.5, strength: 1, cycles: 1 } };
    const shines = plan(design([l])).sprites.filter((s) => s.image.kind === 'shine');
    const visible = Array.from({ length: 48 }, (_, f) => shines.filter((s) => s.frames[f]).length);
    expect(visible.slice(0, 24).every((n) => n === 1)).toBe(true);
    expect(visible.slice(24).every((n) => n === 0)).toBe(true);
  });
  it('writes a real SVGA 2.0 file that reads back the same', () => {
    const p = plan(design([wing()]));
    const file = encodeSvga({ width: 300, height: 300, fps: 24, frames: p.frames, images: { [p.sprites[0]!.key]: new Uint8Array([1, 2, 3]) },
      sprites: p.sprites.map((s) => ({ imageKey: s.key, w: s.w, h: s.h, frames: s.frames })) });
    const mv = decodeSvga(file);
    expect(mv.version).toBe('2.0.0');
    expect([mv.width, mv.fps, mv.frames, mv.sprites.length]).toEqual([300, 24, 48, 2]);
    expect(mv.sprites[1]!.frames[5]!.m[4]).toBeCloseTo(p.sprites[1]!.frames[5]!.m[4], 3);
  });
});
