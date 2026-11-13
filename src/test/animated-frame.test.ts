import { describe, expect, it } from "vitest";
import { CHROMA_DEFAULT, despill, keyAlpha, keyImage } from "@/lib/chroma-key";
import { buildSequence, cropRect, pulseLevel, shimmerPos, sparkleLevel } from "@/lib/frame-motion";
import { frameBitstream, muxAnimatedWebp, parseWebp } from "@/lib/animated-webp";

const s = CHROMA_DEFAULT;
describe("green screen removal", () => {
  it("removes bright and shadowed screen green", () => {
    expect(keyAlpha(0, 255, 0, s)).toBe(0);
    expect(keyAlpha(20, 200, 30, s)).toBe(0);
    expect(keyAlpha(0, 90, 0, s)).toBe(0);
  });
  it("keeps gold, white, black, red and skin colours fully", () => {
    for (const c of [[255, 200, 50], [255, 255, 255], [0, 0, 0], [220, 30, 40], [230, 180, 150]] as const) {
      expect(keyAlpha(c[0], c[1], c[2], s)).toBe(1);
    }
  });
  it("pulls the green halo out of kept pixels, fully at semi-transparent edges", () => {
    expect(despill([120, 200, 100], [0, 255, 0], 1, 1)).toEqual([120, 120, 100]);
    expect(despill([120, 200, 100], [0, 255, 0], 0, 0.5)[1]).toBeLessThan(200);
    expect(despill([200, 150, 100], [0, 255, 0], 1, 1)).toEqual([200, 150, 100]);
  });
  it("edge choke shrinks the kept area", () => {
    const w = 9, h = 1, px = new Uint8ClampedArray(w * 4);
    for (let x = 0; x < w; x++) px.set(x >= 3 && x <= 5 ? [255, 200, 50, 255] : [0, 255, 0, 255], x * 4);
    keyImage(px, w, h, { ...s, choke: 1, feather: 0 });
    expect([...Array(w)].map((_, x) => px[x * 4 + 3])).toEqual([0, 0, 0, 0, 255, 0, 0, 0, 0]);
  });
});

describe("square crop of the frame area", () => {
  it("full zoom = the largest centred square", () => {
    expect(cropRect(1920, 1080, { cx: 0.5, cy: 0.5, zoom: 1 })).toEqual({ sx: 420, sy: 0, side: 1080 });
  });
  it("a moved, smaller square stays inside the video", () => {
    expect(cropRect(1920, 1080, { cx: 1, cy: 0, zoom: 0.5 })).toEqual({ sx: 1380, sy: 0, side: 540 });
  });
});

describe("endless smooth motion", () => {
  it("ping-pong goes up then down without repeating the turning frames", () => {
    expect(buildSequence(5, "pingpong").map((x) => x.a)).toEqual([0, 1, 2, 3, 4, 3, 2, 1]);
  });
  it("circular loop without blending plays every frame once", () => {
    expect(buildSequence(4, "loop").map((x) => x.a)).toEqual([0, 1, 2, 3]);
  });
  it("cross-faded loop ends almost on the first frames so it never jumps", () => {
    const seq = buildSequence(10, "loop", 2);
    expect(seq.length).toBe(8);
    expect(seq[0]).toEqual({ a: 2 });
    expect(seq[seq.length - 1]).toMatchObject({ a: 9, b: 1 });
    expect(seq[seq.length - 1]!.w).toBeCloseTo(2 / 3);
  });
  it("effects return to their start at the end of the loop", () => {
    for (const c of [1, 2, 3]) {
      expect(pulseLevel(1, c)).toBeCloseTo(pulseLevel(0, c));
      expect(sparkleLevel(1, c, 0.3)).toBeCloseTo(sparkleLevel(0, c, 0.3));
    }
    expect(shimmerPos(0, 1)).toBeLessThan(0);
  });
});

describe("animated WebP file", () => {
  const still = (fourcc: string, payload: number[]) => {
    const body = [..."WEBP"].map((c) => c.charCodeAt(0));
    const size = payload.length;
    const chunk = [...[...fourcc].map((c) => c.charCodeAt(0)), size & 255, 0, 0, 0, ...payload, ...(size & 1 ? [0] : [])];
    const all = [...body, ...chunk];
    return new Uint8Array([..."RIFF"].map((c) => c.charCodeAt(0)).concat([all.length & 255, all.length >> 8, 0, 0], all));
  };
  it("loops forever with transparency and one frame per picture", () => {
    const bits = frameBitstream(still("VP8L", [1, 2, 3]));
    const file = muxAnimatedWebp([{ bitstream: bits, duration: 67 }, { bitstream: bits, duration: 66 }], 320, 320);
    const chunks = parseWebp(file);
    expect(chunks.map((c) => c.fourcc)).toEqual(["VP8X", "ANIM", "ANMF", "ANMF"]);
    expect(chunks[0]!.data[0]! & 0x12).toBe(0x12);
    expect(chunks[1]!.data[4]! | chunks[1]!.data[5]!).toBe(0);
    const f = chunks[2]!.data;
    expect(f[12]! | (f[13]! << 8)).toBe(67);
    expect((f[6]! | (f[7]! << 8)) + 1).toBe(320);
  });
});
