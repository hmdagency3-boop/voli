/** Keeps the frame studio work: the current design in this browser (IndexedDB) and project files to save/open. */
import { get, set } from 'idb-keyval';
import { LIMITS, type Design, type Layer } from './motion';

const KEY = 'voli-frame-studio:current';
export const loadCurrent = async (): Promise<Design | null> => { try { return clean(await get(KEY)); } catch { return null; } };
export const saveCurrent = (d: Design) => set(KEY, d).catch(() => undefined);

const num = (v: unknown, def: number, min = -1e6, max = 1e6) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);

/** Accepts only a well-formed design (project files come from outside). */
export function clean(raw: unknown): Design | null {
  const d = raw as Partial<Design> | null;
  if (!d || typeof d !== 'object' || d.version !== 1 || !Array.isArray(d.layers)) return null;
  const layers = d.layers.filter((l): l is Layer => !!l && typeof l === 'object' && typeof (l as Layer).id === 'string'
    && ((l as Layer).kind === 'sparkles' || (typeof (l as Layer).src === 'string' && (l as Layer).src.startsWith('data:image/'))));
  return {
    version: 1, name: typeof d.name === 'string' ? d.name.slice(0, 40) : 'إطار',
    size: num(d.size, 300, LIMITS.size[0], LIMITS.size[1]), fps: num(d.fps, 24, LIMITS.fps[0], LIMITS.fps[1]),
    seconds: num(d.seconds, 2, LIMITS.seconds[0], LIMITS.seconds[1]), avatar: num(d.avatar, 0.6, 0.2, 0.95),
    unit: typeof d.unit === 'number' && d.unit > 0 ? d.unit : undefined,
    layers: layers.map((l) => ({ ...l, anims: Array.isArray(l.anims) ? l.anims : [], glow: l.glow ?? null, shine: l.shine ?? null, sparkles: l.sparkles ?? null })),
  };
}

export function downloadProject(d: Design) {
  const blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${d.name || 'frame'}.voliframe.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function readProject(file: File): Promise<Design | null> {
  try { return clean(JSON.parse(await file.text())); } catch { return null; }
}
export function downloadFile(file: File) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
