/**
 * Builds an animated WebP (endless loop, real soft transparency) from still WebP frames made by the
 * browser's canvas encoder. Only the container is written here; the pictures stay the browser's own.
 */
export type WebpChunk = { fourcc: string; data: Uint8Array };

const td = new TextDecoder();
const te = new TextEncoder();
const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

/** Chunks of a WebP file (after the RIFF/WEBP header). */
export function parseWebp(bytes: Uint8Array): WebpChunk[] {
  if (td.decode(bytes.subarray(0, 4)) !== 'RIFF' || td.decode(bytes.subarray(8, 12)) !== 'WEBP') throw new Error('not_webp');
  const end = Math.min(bytes.length, 8 + u32(bytes, 4));
  const out: WebpChunk[] = [];
  for (let o = 12; o + 8 <= end;) {
    const size = u32(bytes, o + 4);
    out.push({ fourcc: td.decode(bytes.subarray(o, o + 4)), data: bytes.subarray(o + 8, o + 8 + size) });
    o += 8 + size + (size & 1);
  }
  return out;
}

function chunk(fourcc: string, data: Uint8Array): Uint8Array {
  const pad = data.length & 1;
  const out = new Uint8Array(8 + data.length + pad);
  out.set(te.encode(fourcc), 0);
  new DataView(out.buffer).setUint32(4, data.length, true);
  out.set(data, 8);
  return out;
}
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const u24 = (b: Uint8Array, o: number, v: number) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; };

/** The picture data of one still WebP (ALPH + VP8, or VP8L), ready to go inside an animation frame. */
export function frameBitstream(still: Uint8Array): Uint8Array {
  const parts = parseWebp(still).filter((c) => c.fourcc === 'ALPH' || c.fourcc === 'VP8 ' || c.fourcc === 'VP8L');
  if (!parts.some((c) => c.fourcc === 'VP8 ' || c.fourcc === 'VP8L')) throw new Error('no_image_data');
  return concat(parts.map((c) => chunk(c.fourcc, c.data)));
}

/** Animated WebP: every frame covers the whole canvas and replaces the previous one; loops 0 = forever. */
export function muxAnimatedWebp(frames: { bitstream: Uint8Array; duration: number }[], width: number, height: number, loops = 0): Uint8Array {
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x10 | 0x02; // alpha + animation
  u24(vp8x, 4, width - 1); u24(vp8x, 7, height - 1);
  const anim = new Uint8Array(6); // background transparent
  anim[4] = loops & 255; anim[5] = (loops >> 8) & 255;
  const anmf = frames.map((f) => {
    const head = new Uint8Array(16);
    u24(head, 6, width - 1); u24(head, 9, height - 1);
    u24(head, 12, Math.max(1, Math.min(0xffffff, Math.round(f.duration))));
    head[15] = 0x02; // do not blend: transparent pixels stay transparent
    return chunk('ANMF', concat([head, f.bitstream]));
  });
  const body = concat([te.encode('WEBP'), chunk('VP8X', vp8x), chunk('ANIM', anim), ...anmf]);
  const riff = new Uint8Array(8);
  riff.set(te.encode('RIFF'), 0);
  new DataView(riff.buffer).setUint32(4, body.length, true);
  return concat([riff, body]);
}
