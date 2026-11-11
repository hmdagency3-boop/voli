/**
 * SVGA 2.x file writer/reader: a zlib-compressed protobuf MovieEntity (the format of
 * github.com/svga/SVGA-Format, read by the SVGA players for iOS, Android, Flutter and web).
 */
import { unzlibSync, zlibSync } from 'fflate';
import type { Mat, SpriteFrame } from './motion';

export type MovieSprite = { imageKey: string; w: number; h: number; frames: SpriteFrame[] };
export type Movie = { width: number; height: number; fps: number; frames: number; images: Record<string, Uint8Array>; sprites: MovieSprite[] };

class Writer {
  private buf = new Uint8Array(256);
  private len = 0;
  private grow(n: number) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const next = new Uint8Array(size); next.set(this.buf.subarray(0, this.len)); this.buf = next;
  }
  varint(v: number) {
    this.grow(10);
    let n = v >>> 0;
    while (n > 127) { this.buf[this.len++] = (n & 127) | 128; n >>>= 7; }
    this.buf[this.len++] = n;
    return this;
  }
  tag(field: number, wire: number) { return this.varint((field << 3) | wire); }
  float(field: number, v: number) {
    this.tag(field, 5); this.grow(4);
    new DataView(this.buf.buffer).setFloat32(this.len, v, true); this.len += 4;
    return this;
  }
  int(field: number, v: number) { return this.tag(field, 0).varint(v); }
  bytes(field: number, b: Uint8Array) { this.tag(field, 2).varint(b.length); this.grow(b.length); this.buf.set(b, this.len); this.len += b.length; return this; }
  string(field: number, s: string) { return this.bytes(field, new TextEncoder().encode(s)); }
  done() { return this.buf.slice(0, this.len); }
}
const msg = (fill: (w: Writer) => void) => { const w = new Writer(); fill(w); return w.done(); };

function frameBytes(f: SpriteFrame, w: number, h: number): Uint8Array {
  if (!f) return new Uint8Array(0); // alpha 0 = hidden on this frame
  const m = f.m;
  return msg((x) => {
    x.float(1, f.alpha);
    x.bytes(2, msg((l) => l.float(1, 0).float(2, 0).float(3, w).float(4, h)));
    x.bytes(3, msg((t) => t.float(1, m[0]).float(2, m[1]).float(3, m[2]).float(4, m[3]).float(5, m[4]).float(6, m[5])));
  });
}

/** Raw MovieEntity bytes (before compression). */
export function movieBytes(mv: Movie): Uint8Array {
  return msg((w) => {
    w.string(1, '2.0.0');
    w.bytes(2, msg((p) => p.float(1, mv.width).float(2, mv.height).int(3, mv.fps).int(4, mv.frames)));
    for (const [k, v] of Object.entries(mv.images)) w.bytes(3, msg((e) => e.string(1, k).bytes(2, v)));
    for (const s of mv.sprites) {
      if (s.frames.length !== mv.frames) throw new Error(`sprite ${s.imageKey} has ${s.frames.length} frames, expected ${mv.frames}`);
      w.bytes(4, msg((e) => { e.string(1, s.imageKey); for (const f of s.frames) e.bytes(2, frameBytes(f, s.w, s.h)); }));
    }
  });
}
/** The .svga file. */
export const encodeSvga = (mv: Movie) => zlibSync(movieBytes(mv), { level: 9 });

// ---------- reader (checks files before upload and in tests) ----------
class Reader {
  pos = 0;
  constructor(private b: Uint8Array) {}
  get more() { return this.pos < this.b.length; }
  varint() { let r = 0, s = 0, c: number; do { c = this.b[this.pos++]!; r += (c & 127) * 2 ** s; s += 7; } while (c & 128); return r; }
  float() { const v = new DataView(this.b.buffer, this.b.byteOffset + this.pos, 4).getFloat32(0, true); this.pos += 4; return v; }
  bytes() { const n = this.varint(); const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  skip(wire: number) { if (wire === 0) this.varint(); else if (wire === 1) this.pos += 8; else if (wire === 2) this.bytes(); else if (wire === 5) this.pos += 4; else throw new Error('bad wire'); }
  each(cb: (field: number, wire: number) => void) { while (this.more) { const t = this.varint(); cb(t >>> 3, t & 7); } }
}
const text = (b: Uint8Array) => new TextDecoder().decode(b);
function floats(b: Uint8Array, n: number) {
  const out = new Array<number>(n).fill(0), r = new Reader(b);
  r.each((f, w) => { if (w === 5 && f >= 1 && f <= n) out[f - 1] = r.float(); else r.skip(w); });
  return out;
}

export function decodeSvga(file: Uint8Array): Movie & { version: string } {
  const raw = unzlibSync(file);
  const r = new Reader(raw);
  const mv: Movie & { version: string } = { version: '', width: 0, height: 0, fps: 0, frames: 0, images: {}, sprites: [] };
  r.each((f, w) => {
    if (f === 1 && w === 2) mv.version = text(r.bytes());
    else if (f === 2 && w === 2) {
      const p = new Reader(r.bytes());
      p.each((pf, pw) => {
        if (pf === 1 && pw === 5) mv.width = p.float(); else if (pf === 2 && pw === 5) mv.height = p.float();
        else if (pf === 3 && pw === 0) mv.fps = p.varint(); else if (pf === 4 && pw === 0) mv.frames = p.varint(); else p.skip(pw);
      });
    } else if (f === 3 && w === 2) {
      const e = new Reader(r.bytes()); let k = '', v: Uint8Array = new Uint8Array(0);
      e.each((ef, ew) => { if (ef === 1) k = text(e.bytes()); else if (ef === 2) v = e.bytes(); else e.skip(ew); });
      mv.images[k] = v;
    } else if (f === 4 && w === 2) {
      const e = new Reader(r.bytes()); const s: MovieSprite = { imageKey: '', w: 0, h: 0, frames: [] };
      e.each((ef, ew) => {
        if (ef === 1 && ew === 2) s.imageKey = text(e.bytes());
        else if (ef === 2 && ew === 2) {
          const fb = new Reader(e.bytes()); let alpha = 0; let m: Mat = [1, 0, 0, 1, 0, 0];
          fb.each((ff, fw) => {
            if (ff === 1 && fw === 5) alpha = fb.float();
            else if (ff === 2 && fw === 2) { const l = floats(fb.bytes(), 4); s.w = l[2]!; s.h = l[3]!; }
            else if (ff === 3 && fw === 2) m = floats(fb.bytes(), 6) as Mat;
            else fb.skip(fw);
          });
          s.frames.push(alpha > 0 ? { alpha, m } : null);
        } else e.skip(ew);
      });
      mv.sprites.push(s);
    } else r.skip(w);
  });
  return mv;
}

export const SVGA_MAX = 10 * 1024 * 1024;
/** Problem with a ready-made .svga file, or null when it can be uploaded. */
export function svgaFileProblem(name: string, bytes: Uint8Array): string | null {
  if (!/\.svga$/i.test(name)) return 'الملف لازم يكون بامتداد .svga';
  if (bytes.length > SVGA_MAX) return 'حجم ملف SVGA أكبر من 10 ميجا';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'ده ملف SVGA قديم (1.x مضغوط ZIP) — صدّره بصيغة SVGA 2.0';
  try {
    const mv = decodeSvga(bytes);
    if (!mv.frames || !mv.width || !mv.sprites.length) return 'ملف SVGA فاضي أو تالف';
  } catch { return 'ملف SVGA تالف أو مش بصيغة 2.0'; }
  return null;
}
